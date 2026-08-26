import type { BanVerso, Khoi } from './types';
import { maSo, boDau } from './text';
import { boMocNnu } from './language';

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

/** Neo của DẤU chú thích nằm trong bài, để lời chú thích có đường quay lại.
 *
 *  EPUB và DAISY không cần cái này — epub:type="noteref" và <noteref> đã nói cho
 *  phần mềm đọc biết đây là dấu chú thích, và nó tự lo đường về. Trang web thì
 *  không có ai lo hộ: học sinh bấm dấu (1), nghe xong lời giải nghĩa ở cuối trang,
 *  rồi mắc kẹt ở đó — không có cách nào biết mình vừa rời khỏi chỗ nào. */
export const neoDauChuThich = (trang: number, so: string) => `dau-${neoChuThich(trang, so)}`;

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
  // Bỏ dấu ngôn ngữ trước khi so: "[en]neighbourhood[/en]: cách viết…" vẫn là đã
  // có sẵn từ được chú thích ở đầu, ghép nữa thành "neighbourhood: neighbourhood:".
  const daCo = boDau(boMocNnu(than)).replace(/^[\s(]*\d+[)\s]*/, '').startsWith(boDau(boMocNnu(tu)));
  return daCo ? than : `${tu}: ${than}`;
}

/** Thân đề bài, đã bỏ số hiệu lặp ở đầu.
 *
 *  Sách in "1. Nghe và đọc đoạn hội thoại sau", còn Verso xướng thêm câu dẫn
 *  "Bài tập 1." cho người nghe biết mình đang ở đâu. Ghép thẳng thành
 *  "Bài tập 1. 1. Nghe và đọc…" — nghe như máy vấp, và đo được là dài hơn ~35%
 *  cho cùng một câu. */
export function thanBaiTap(k: Khoi): string {
  const than = (k.vanBanDoc || k.vanBan || '').trim();
  const so = (k.soBaiTap ?? '').trim();
  if (!so) return than;

  // Chỉ cắt đúng phần số hiệu đứng đầu, kèm dấu chấm hoặc ngoặc đi liền sau nó.
  // Bỏ cả tiền tố chữ ("Bài 4.2" so với "4.2." in trên sách) để hai bên vẫn khớp.
  const loi = so.replace(/^(bài|câu|bài tập)\s+/i, '');
  for (const mau of [so, loi]) {
    if (!mau) continue;
    const re = new RegExp(`^${mau.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[.):]?\\s+`, 'i');
    if (re.test(than)) return than.replace(re, '');
  }
  return than;
}
