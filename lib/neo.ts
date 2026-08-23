import type { BanVerso, Khoi } from './types';
import { maSo, boDau } from './chuoi';

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
    let demCT = 0;   // đường dự phòng cuối: chú thích thứ mấy trong trang này
    for (const k of t.khoi) {
      // Chú thích đánh số lại từ (1) ở mỗi trang, nên neo phải kèm số trang,
      // và dấu chú thích trong bài cũng phải trỏ đúng chú thích của trang đó.
      const so = k.loai === 'chu-thich' ? soChuThich(k, ++demCT) : undefined;
      const goc = k.loai === 'bai-tap' && k.soBaiTap
        ? `bai-${maSo(k.soBaiTap)}`
        : so ? neoChuThich(i + 1, so)
          : `khoi-${k.id}`;
      const n = (dem.get(goc) ?? 0) + 1;
      dem.set(goc, n);
      neo.set(k.id, n === 1 ? goc : `${goc}-${n}`);
    }
  });
  return neo;
}

export const neoChuThich = (trang: number, so: string) => `chu-thich-t${trang}-${so}`;

/** Lấy lại số chú thích từ chính cái neo đã tính.
 *  Đọc từ neo chứ không tính lại, để nhãn nghe được và đích nhảy tới không bao giờ lệch nhau. */
export const soTuNeo = (neo: string) => neo.match(/^chu-thich-t\d+-(\d+)/)?.[1];

/** Số của một chú thích, thử ba đường theo thứ tự tin cậy giảm dần.
 *
 *  Cần cả ba vì đây là thứ duy nhất nối dấu "[chú thích 1]" trong bài với lời
 *  giải nghĩa ở chân trang. Trường soChuThich chỉ mới có, còn những bản đã phát
 *  hành trước đó vẫn phải bấm được — nếu không, học sinh bấm vào dấu chú thích
 *  mà không đi đâu cả, và không có cách nào biết vì sao. */
export function soChuThich(k: Khoi, thuTuTrongTrang?: number): string | undefined {
  if (k.soChuThich?.trim()) return k.soChuThich.trim();
  const m = (k.vanBan ?? '').match(/^\((\d+)\)/);      // bản cũ giữ "(1)" ở đầu
  if (m) return m[1];
  return thuTuTrongTrang ? String(thuTuTrongTrang) : undefined;
}

/** Nhãn hiện trong mục lục của một khối đáng để nhảy tới.
 *  Chỉ thêm chữ "Bài" khi số hiệu là số trần ("4.28"); "Ví dụ 2" hay
 *  "Luyện tập 2" đã tự đọc thành tên rồi, thêm nữa thành "Bài Ví dụ 2". */
export function nhanMuc(k: Khoi): string {
  if (k.loai !== 'bai-tap') return k.vanBan ?? '';
  const s = k.soBaiTap?.trim();
  if (!s) return 'Bài tập';
  return /^\d/.test(s) ? `Bài ${s}` : s;
}

/** Lời giải nghĩa của một chú thích, đã ghép sẵn từ được chú thích.
 *
 *  Phải kiểm trùng: nhiều lúc Gemini vừa điền thuocVe = "Phù sa" vừa để nguyên
 *  "Phù sa: lớp đất mịn..." trong vanBan. Ghép thẳng thì máy đọc lên thành
 *  "Phù sa, Phù sa, lớp đất mịn" — nghe như bị vấp. */
export function loiChuThich(k: Khoi): string {
  const than = (k.vanBan ?? '').trim();
  const tu = (k.thuocVe ?? '').trim();
  if (!tu) return than;
  const daCo = boDau(than).replace(/^[\s(]*\d+[)\s]*/, '').startsWith(boDau(tu));
  return daCo ? than : `${tu}: ${than}`;
}
