import 'server-only';
import type { BanVerso } from '@/lib/types';
import { thungLuu } from '@/lib/storage.server';

export async function layAnhHinh(ban: BanVerso): Promise<Map<string, Buffer>> {
  const ma = [...new Set(
    ban.trang.flatMap((t) => t.khoi)
      .filter((k) => k.loai === 'hinh-anh' && k.maHinh)
      .map((k) => k.maHinh!),
  )];
  const ra = new Map<string, Buffer>();
  await Promise.all(ma.map(async (m) => {
    try {
      const [d] = await thungLuu().file(`hinh/${m}.jpg`).download();
      ra.set(m, d);
    } catch { /* thiếu ảnh thì vẫn xuất được */ }
  }));
  return ra;
}
