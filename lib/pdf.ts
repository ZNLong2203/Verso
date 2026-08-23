'use client';

import { CANH_TOI_DA } from './anh';

/** Đọc PDF ngay trong trình duyệt.
 *
 *  Sách giáo khoa lưu hành dưới dạng PDF, và bản của Bộ là ảnh quét — không có
 *  lớp chữ nào. Bắt giáo viên tự tách từng trang ra ảnh rồi mới tải lên là chỗ
 *  người ta bỏ cuộc.
 *
 *  Tách ngay trên máy chứ không gửi cả tệp lên máy chủ: một cuốn SGK là hơn 20 MB,
 *  mà giáo viên chỉ cần vài trang. */

/** Nhiều hơn mức này thì một mẻ mất hơn nửa tiếng và rất dễ đứt giữa chừng. */
export const TOI_DA_MOI_LAN = 20;

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

export async function soTrangPdf(file: File): Promise<number> {
  const m = await nap();
  // destroy() nằm ở tác vụ nạp chứ không ở tài liệu — giữ tác vụ lại để đóng worker.
  const viec = m.getDocument({ data: await file.arrayBuffer() });
  const tl = await viec.promise;
  const n = tl.numPages;
  await viec.destroy();
  return n;
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

/** Dựng các trang đã chọn thành ảnh JPEG, đúng độ phân giải mà máy chủ vẫn dùng. */
export async function anhTuPdf(
  file: File,
  trang: number[],
  tienDo?: (xong: number, tong: number) => void,
): Promise<{ so: number; blob: Blob }[]> {
  const m = await nap();
  const viec = m.getDocument({ data: await file.arrayBuffer() });
  const tl = await viec.promise;
  const ra: { so: number; blob: Blob }[] = [];
  try {
    for (let i = 0; i < trang.length; i++) {
      const t = await tl.getPage(trang[i]);
      const g1 = t.getViewport({ scale: 1 });
      // Dựng thẳng ở kích thước cuối cùng: dựng to rồi thu nhỏ chỉ tốn bộ nhớ,
      // mà máy của giáo viên thường yếu.
      const ti = Math.min(CANH_TOI_DA / Math.max(g1.width, g1.height), 4);
      const g = t.getViewport({ scale: ti });
      const c = document.createElement('canvas');
      c.width = Math.round(g.width); c.height = Math.round(g.height);
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('Không dựng được trang PDF.');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await t.render({ canvas: c, canvasContext: ctx, viewport: g }).promise;
      const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.9));
      if (blob) ra.push({ so: trang[i], blob });
      t.cleanup();
      c.width = c.height = 0;   // trả bộ nhớ ngay, PDF nhiều trang dễ làm tab sập
      tienDo?.(i + 1, trang.length);
    }
  } finally {
    await viec.destroy();
  }
  return ra;
}
