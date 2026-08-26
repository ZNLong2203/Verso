import type { BanVerso, Khoi } from '@/lib/types';
import { nhanMuc } from '@/lib/anchors';

export interface Muc {
  id: string;
  nhan: string;
  cap: number;      // 1..3
  khoi: Khoi[];     // các khối thuộc mục này
  con: Muc[];
}

/** Số thứ tự trang (1-based) của từng khối — dấu chú thích phải trỏ đúng
 *  chú thích của TRANG ĐÓ, vì sách đánh số lại từ (1) ở mỗi trang. */
export function dungTrangCua(ban: BanVerso): Map<string, number> {
  const m = new Map<string, number>();
  ban.trang.forEach((t, i) => t.khoi.forEach((k) => m.set(k.id, i + 1)));
  return m;
}

export function dungCay(ban: BanVerso, neo: Map<string, string>): Muc[] {
  const goc: Muc[] = [];
  const ngan: Muc[] = [];   // ngăn xếp mục đang mở, ngan[i] có cap = i+1

  const dat = (m: Muc) => {
    while (ngan.length && ngan[ngan.length - 1].cap >= m.cap) ngan.pop();
    if (ngan.length) ngan[ngan.length - 1].con.push(m);
    else goc.push(m);
    ngan.push(m);
  };

  for (const t of ban.trang) {
    for (const k of t.khoi) {
      if (k.loai === 'tieu-de') {
        // Ép cấp không nhảy cóc: DTBook không cho level3 nằm thẳng trong level1.
        const capMuon = Math.min(Math.max(k.capTieuDe || 1, 1), 3);
        const cap = Math.min(capMuon, ngan.length + 1);
        dat({ id: neo.get(k.id) ?? `khoi-${k.id}`, nhan: k.vanBan ?? '', cap, khoi: [], con: [] });
        continue;
      }
      if (!ngan.length) {
        // Nội dung xuất hiện trước đề mục đầu tiên — vẫn phải có chỗ chứa.
        dat({ id: 'phan-mo', nhan: 'Phần đầu', cap: 1, khoi: [], con: [] });
      }
      ngan[ngan.length - 1].khoi.push(k);
    }
  }
  return goc;
}

export interface MucNav {
  id: string;
  nhan: string;
  con: MucNav[];
}

export function dungNav(cay: Muc[], neo: Map<string, string>): MucNav[] {
  return cay.map((m) => ({
    id: m.id,
    nhan: m.nhan,
    con: [
      // Bài tập nằm trong phần thân của mục này, giữ nguyên thứ tự xuất hiện
      ...m.khoi.filter((k) => k.loai === 'bai-tap').map((k) => ({
        id: neo.get(k.id) ?? `khoi-${k.id}`,
        nhan: nhanMuc(k),
        con: [] as MucNav[],
      })),
      ...dungNav(m.con, neo),
    ],
  }));
}
