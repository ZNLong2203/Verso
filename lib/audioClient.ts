'use client';

const CACHE = new Map<string, string>();   // văn bản → blob URL
const TOI_DA = 40;                         // đủ cho một trang sách, không phình bộ nhớ

function ghiCache(khoa: string, url: string) {
  CACHE.set(khoa, url);
  while (CACHE.size > TOI_DA) {
    const cu = CACHE.keys().next().value as string;
    const u = CACHE.get(cu);
    CACHE.delete(cu);
    if (u) URL.revokeObjectURL(u);
  }
}

export class LoiTieng extends Error {
  constructor(public ma: string) { super(ma); }
}

/** Tải một đoạn. Đã tải rồi thì trả ngay, không gọi lại máy chủ. */
export async function taiTieng(text: string, nnu: 'vi' | 'en' = 'vi'): Promise<string> {
  const khoa = `${nnu}:${text}`;
  const co = CACHE.get(khoa);
  if (co) return co;

  const r = await fetch('/api/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, nnu }),
  });
  if (!r.ok) {
    let ma = 'LOI_TIENG';
    try { ma = (await r.json()).loi ?? ma; } catch { /* không phải JSON */ }
    throw new LoiTieng(ma);
  }
  const url = URL.createObjectURL(await r.blob());
  ghiCache(khoa, url);
  return url;
}

/** Tải sẵn đoạn sau trong lúc đoạn trước đang phát — nhờ vậy chỉ đoạn đầu phải chờ. */
export function taiTruoc(text?: string, nnu: 'vi' | 'en' = 'vi') {
  if (text && text.trim() && !CACHE.has(`${nnu}:${text}`)) taiTieng(text, nnu).catch(() => {});
}

export const THONG_BAO_TIENG: Record<string, string> = {
  CHUA_BAT_TTS: 'Máy chủ chưa bật được giọng đọc. Hãy dùng trình đọc màn hình sẵn có của máy.',
  HET_QUOTA: 'Hết lượt tạo giọng đọc trong tháng. Hãy dùng trình đọc màn hình sẵn có của máy.',
  QUA_DAI: 'Đoạn này quá dài để đọc thành tiếng.',
  LOI_TIENG: 'Chưa tạo được giọng đọc. Thử lại sau ít phút.',
};
