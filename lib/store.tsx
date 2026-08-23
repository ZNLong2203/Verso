'use client';

import React from 'react';
import { STORAGE_KEY } from './constants';
import { taoId, chuanHoaTrang, demChuaDuyet } from './chuanHoa';
import type { BanVerso, Khoi, KetQuaDocTrang, MonHoc, Trang } from './types';

export type Buoc = 'thong-tin' | 'tai-trang' | 'duyet' | 'xong';

const banMoi = (): BanVerso => ({
  id: taoId(), tieuDe: '', monHoc: 'toan', lop: null, nguon: '', nguoiChuyen: '',
  trang: [], daXuatBan: false, maChiaSe: '',
  ngayTao: new Date().toISOString(), ngayCapNhat: new Date().toISOString(),
});

interface Ctx {
  ban: BanVerso;
  buoc: Buoc;
  maDaXuatBan: string;
  dangDoc: Record<string, boolean>;
  soChuaDuyet: number;
  datBuoc: (b: Buoc) => void;
  suaBan: (p: Partial<BanVerso>) => void;
  themTrang: (kq: KetQuaDocTrang, anhNho: string) => void;
  xoaTrang: (id: string) => void;
  danhDauDangDoc: (khoa: string, v: boolean) => void;
  suaKhoi: (trangId: string, khoiId: string, p: Partial<Khoi>) => void;
  xoaKhoi: (trangId: string, khoiId: string) => void;
  duyetTatCa: () => void;
  datMaXuatBan: (ma: string) => void;
  lamLai: () => void;
}

const C = React.createContext<Ctx | null>(null);
export const useVerso = () => {
  const c = React.useContext(C);
  if (!c) throw new Error('useVerso phải nằm trong <VersoProvider>');
  return c;
};

export const VersoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Khởi tạo bằng giá trị tĩnh — máy chủ không có localStorage, đọc ở đây sẽ
  // khiến HTML máy chủ khác HTML client và React báo lỗi hydration.
  const [ban, datBan] = React.useState<BanVerso>(banMoi);
  const [buoc, datBuoc] = React.useState<Buoc>('thong-tin');
  const [maDaXuatBan, datMaXuatBan] = React.useState('');
  const [dangDoc, setDangDoc] = React.useState<Record<string, boolean>>({});
  const [daNap, setDaNap] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d?.ban) datBan({ ...banMoi(), ...d.ban });
        if (d?.buoc) datBuoc(d.buoc);
      }
    } catch { /* dữ liệu hỏng thì bắt đầu lại từ đầu */ }
    setDaNap(true);
  }, []);

  React.useEffect(() => {
    if (!daNap) return;   // đừng ghi đè bản nháp bằng trạng thái rỗng lúc chưa đọc xong
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ban, buoc }));
    } catch {
      // Bản nháp chứa ảnh trang sách nên có thể vượt hạn mức. Thà mất ảnh xem lại
      // còn hơn mất toàn bộ nội dung đã chuyển.
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          ban: { ...ban, trang: ban.trang.map((t) => ({ ...t, anhGoc: '' })) }, buoc,
        }));
      } catch { /* đành chịu */ }
    }
  }, [ban, buoc, daNap]);

  const suaBan = (p: Partial<BanVerso>) =>
    datBan((b) => ({ ...b, ...p, ngayCapNhat: new Date().toISOString() }));

  const themTrang = (kq: KetQuaDocTrang, anh: string) =>
    datBan((b) => ({ ...b, trang: [...b.trang, chuanHoaTrang(kq, b.trang.length + 1, anh)] }));

  const xoaTrang = (id: string) =>
    datBan((b) => ({
      ...b,
      trang: b.trang.filter((t) => t.id !== id).map((t, i) => ({ ...t, thuTu: i + 1 })),
    }));

  const suaKhoi = (trangId: string, khoiId: string, p: Partial<Khoi>) =>
    datBan((b) => ({
      ...b,
      trang: b.trang.map((t) => t.id !== trangId ? t : {
        ...t,
        khoi: t.khoi.map((k) => k.id !== khoiId ? k : { ...k, ...p }),
      }),
    }));

  const xoaKhoi = (trangId: string, khoiId: string) =>
    datBan((b) => ({
      ...b,
      trang: b.trang.map((t) => t.id !== trangId ? t : { ...t, khoi: t.khoi.filter((k) => k.id !== khoiId) }),
    }));

  const duyetTatCa = () =>
    datBan((b) => ({
      ...b,
      trang: b.trang.map((t) => ({ ...t, khoi: t.khoi.map((k) => ({ ...k, daDuyet: true })) })),
    }));

  const lamLai = () => {
    datBan(banMoi()); datBuoc('thong-tin'); datMaXuatBan(''); setDangDoc({});
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  };

  return (
    <C.Provider value={{
      ban, buoc, maDaXuatBan, dangDoc,
      soChuaDuyet: demChuaDuyet(ban.trang),
      datBuoc, suaBan, themTrang, xoaTrang,
      danhDauDangDoc: (khoa, v) => setDangDoc((d) => ({ ...d, [khoa]: v })),
      suaKhoi, xoaKhoi, duyetTatCa, datMaXuatBan, lamLai,
    }}>
      {children}
    </C.Provider>
  );
};

export const MON_HOC_DS: MonHoc[] = [
  'toan', 'ngu-van', 'vat-ly', 'hoa-hoc', 'sinh-hoc', 'lich-su', 'dia-ly', 'tieng-anh', 'gdcd', 'khac',
];
export type { Trang };
