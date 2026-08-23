import type { BanVerso, Khoi } from './types';
import { maSo } from './chuoi';

/** Neo (id) để nhảy tới từng khối — phải DUY NHẤT trong cả tài liệu.
 *
 *  Sách thật đánh số lặp lại liên tục: mỗi bài học đều có "Luyện tập 2",
 *  "Ví dụ 3". Nếu để trùng id thì mục lục nhảy về chỗ đầu tiên trùng tên —
 *  học sinh khiếm thị bấm "Luyện tập 2" ở bài 3 lại rơi về bài 1 mà không
 *  có cách nào biết mình đang ở đâu. */
export function dungNeo(ban: BanVerso): Map<string, string> {
  const dem = new Map<string, number>();
  const neo = new Map<string, string>();
  ban.trang.forEach((t, i) => {
    for (const k of t.khoi) {
      const goc = k.loai === 'bai-tap' && k.soBaiTap
        ? `bai-${maSo(k.soBaiTap)}`
        : k.loai === 'chu-thich' && soChuThich(k)
          // Chú thích đánh số lại từ (1) ở mỗi trang, nên phải kèm số trang,
          // và dấu chú thích trong bài cũng phải trỏ đúng trang đó.
          ? neoChuThich(i + 1, soChuThich(k)!)
          : `khoi-${k.id}`;
      const n = (dem.get(goc) ?? 0) + 1;
      dem.set(goc, n);
      neo.set(k.id, n === 1 ? goc : `${goc}-${n}`);
    }
  });
  return neo;
}

export const neoChuThich = (trang: number, so: string) => `chu-thich-t${trang}-${so}`;

/** Số hiệu chú thích nằm đầu văn bản: "(3) ánh xạ là..." → "3" */
export const soChuThich = (k: Khoi) => (k.vanBan ?? '').match(/^\((\d+)\)/)?.[1];

/** Nhãn hiện trong mục lục của một khối đáng để nhảy tới.
 *  Chỉ thêm chữ "Bài" khi số hiệu là số trần ("4.28"); "Ví dụ 2" hay
 *  "Luyện tập 2" đã tự đọc thành tên rồi, thêm nữa thành "Bài Ví dụ 2". */
export function nhanMuc(k: Khoi): string {
  if (k.loai !== 'bai-tap') return k.vanBan ?? '';
  const s = k.soBaiTap?.trim();
  if (!s) return 'Bài tập';
  return /^\d/.test(s) ? `Bài ${s}` : s;
}
