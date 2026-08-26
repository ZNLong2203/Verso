import 'server-only';
import type { BanVerso } from '@/lib/types';
import { thungLuu } from '@/lib/storage.server';

/** Lấy ảnh hình đã lưu về, để nhét vào tệp xuất.
 *
 *  Tệp EPUB và DAISY phải TỰ CHỨA: học sinh tải về rồi đọc offline, không có
 *  đường nào gọi ngược lại máy chủ. Ảnh nào lấy không được thì bỏ qua — mô tả
 *  bằng lời mới là nội dung chính, thiếu ảnh vẫn đọc trọn bài. */
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
