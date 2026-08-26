'use client';

import { CANH_TOI_DA } from './image';

/** Nhiều hơn mức này thì một mẻ mất hơn nửa tiếng và rất dễ đứt giữa chừng. */
export const TOI_DA_MOI_LAN = 20;

/** Cạnh dài của ảnh xem trước. Đủ để nhận ra trang nào, mà một trang chỉ ~25 KB —
 *  quan trọng vì cuốn dày có thể dựng cả trăm ảnh trong lúc giáo viên cuộn. */
export const CANH_XEM_TRUOC = 320;

type Pdfjs = typeof import('pdfjs-dist');
let pdfjs: Pdfjs | null = null;

/** Nạp trễ: thư viện gần 1 MB, người chỉ tải ảnh thì không phải tải nó. */
async function nap(): Promise<Pdfjs> {
  if (pdfjs) return pdfjs;
  const m = await import('pdfjs-dist');
  // Tệp worker được chép sẵn vào /public lúc build — không phụ thuộc cách gói của bundler.
  m.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  pdfjs = m;
  return m;
}

export interface TaiLieuPdf {
  soTrang: number;
  /** Ảnh nhỏ để xem trước, trả về dataURL. */
  xemTruoc(so: number): Promise<string>;
  /** Ảnh JPEG đúng độ phân giải máy chủ vẫn dùng. */
  anhDayDu(trang: number[], tienDo?: (xong: number, tong: number) => void): Promise<{ so: number; blob: Blob }[]>;
  dong(): Promise<void>;
}

export async function moPdf(file: File): Promise<TaiLieuPdf> {
  const m = await nap();
  // destroy() nằm ở tác vụ nạp chứ không ở tài liệu — giữ tác vụ lại để đóng worker.
  const viec = m.getDocument({ data: await file.arrayBuffer() });
  const tl = await viec.promise;
  let daDong = false;

  // Ô xem trước bắn nhiều yêu cầu dựng cùng lúc khi giáo viên cuộn nhanh, mà máy
  // của giáo viên thường yếu. Xếp tất cả vào một hàng: chậm hơn một chút nhưng
  // không bao giờ có hai canvas cỡ lớn cùng tồn tại.
  let hang: Promise<unknown> = Promise.resolve();
  const xepHang = <T,>(v: () => Promise<T>): Promise<T> => {
    const ra = hang.then(v, v);
    hang = ra.catch(() => undefined);
    return ra;
  };

  /** Dựng một trang ra canvas ở đúng kích thước cuối cùng.
   *  Dựng to rồi thu nhỏ chỉ tốn bộ nhớ mà chẳng nét thêm. */
  const veTrang = async (so: number, canh: number): Promise<HTMLCanvasElement> => {
    if (daDong) throw new Error('Tệp PDF đã đóng.');
    const t = await tl.getPage(so);
    const g1 = t.getViewport({ scale: 1 });
    const ti = Math.min(canh / Math.max(g1.width, g1.height), 4);
    const g = t.getViewport({ scale: ti });
    const c = document.createElement('canvas');
    c.width = Math.round(g.width);
    c.height = Math.round(g.height);
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('Không dựng được trang PDF.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    await t.render({ canvas: c, canvasContext: ctx, viewport: g }).promise;
    t.cleanup();
    return c;
  };

  return {
    soTrang: tl.numPages,

    xemTruoc: (so) => xepHang(async () => {
      const c = await veTrang(so, CANH_XEM_TRUOC);
      const d = c.toDataURL('image/jpeg', 0.72);
      c.width = c.height = 0;   // trả bộ nhớ ngay, cuốn dày dễ làm tab sập
      return d;
    }),

    anhDayDu: (trang, tienDo) => xepHang(async () => {
      const ra: { so: number; blob: Blob }[] = [];
      for (let i = 0; i < trang.length; i++) {
        const c = await veTrang(trang[i], CANH_TOI_DA);
        const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.9));
        c.width = c.height = 0;
        if (blob) ra.push({ so: trang[i], blob });
        tienDo?.(i + 1, trang.length);
      }
      return ra;
    }),

    dong: async () => {
      if (daDong) return;
      daDong = true;
      // Đợi việc đang dựng dở xong hẳn rồi mới đóng worker, kẻo pdf.js ném lỗi
      // "worker destroyed" ra giữa lúc giáo viên vẫn đang nhìn ô xem trước.
      await hang.catch(() => undefined);
      await viec.destroy();
    },
  };
}

/** "71-73, 80" → [71, 72, 73, 80]. Bỏ trùng, giữ thứ tự người gõ, cắt ngoài khoảng. */
export function docKhoangTrang(s: string, tong: number): number[] {
  const ra: number[] = [];
  for (const phan of s.split(/[,;]/)) {
    const t = phan.trim();
    if (!t) continue;
    const k = t.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (k) {
      const [a, b] = [Number(k[1]), Number(k[2])];
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) ra.push(i);
    } else if (/^\d+$/.test(t)) {
      ra.push(Number(t));
    }
  }
  return [...new Set(ra)].filter((n) => n >= 1 && n <= tong);
}

export function gopKhoang(ds: number[]): string {
  const s = [...new Set(ds)].filter((n) => Number.isInteger(n) && n >= 1).sort((a, b) => a - b);
  const phan: string[] = [];
  for (let i = 0; i < s.length;) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    // Hai số liền nhau thì "71, 72" ngắn bằng "71-72" mà dễ hiểu hơn.
    phan.push(j - i >= 2 ? `${s[i]}-${s[j]}` : s.slice(i, j + 1).join(', '));
    i = j + 1;
  }
  return phan.join(', ');
}
