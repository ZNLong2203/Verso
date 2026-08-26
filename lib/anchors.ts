import type { BanVerso, Khoi } from './types';
import { maSo, boDau } from './text';
import { boMocNnu } from './language';

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

export const neoDauChuThich = (trang: number, so: string) => `dau-${neoChuThich(trang, so)}`;

/** Lấy lại số chú thích từ chính cái neo đã tính.
 *  Đọc từ neo chứ không tính lại, để nhãn nghe được và đích nhảy tới không bao giờ lệch nhau. */
export const soTuNeo = (neo: string) => neo.match(/^chu-thich-t\d+-(\d+)/)?.[1];

export function soChuThich(k: Khoi, thuTuTrongTrang?: number): string | undefined {
  if (k.soChuThich?.trim()) return k.soChuThich.trim();
  const m = (k.vanBan ?? '').match(/^\((\d+)\)/);      // bản cũ giữ "(1)" ở đầu
  if (m) return m[1];
  return thuTuTrongTrang ? String(thuTuTrongTrang) : undefined;
}

export function nhanMuc(k: Khoi): string {
  if (k.loai !== 'bai-tap') return k.vanBan ?? '';
  const s = k.soBaiTap?.trim();
  if (!s) return 'Bài tập';
  return /^\d/.test(s) ? `Bài ${s}` : s;
}

export function loiChuThich(k: Khoi): string {
  const than = (k.vanBan ?? '').trim();
  const tu = (k.thuocVe ?? '').trim();
  if (!tu) return than;
  // Bỏ dấu ngôn ngữ trước khi so: "[en]neighbourhood[/en]: cách viết…" vẫn là đã
  // có sẵn từ được chú thích ở đầu, ghép nữa thành "neighbourhood: neighbourhood:".
  const daCo = boDau(boMocNnu(than)).replace(/^[\s(]*\d+[)\s]*/, '').startsWith(boDau(boMocNnu(tu)));
  return daCo ? than : `${tu}: ${than}`;
}

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
