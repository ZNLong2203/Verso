'use client';

import React from 'react';
import { useVerso } from '@/lib/store';
import { THONG_BAO_LOI } from '@/lib/loi';

/** Mở lại bản đã phát hành từ đường dẫn ?sua=MA&khoa=… */
export const MoDeSua: React.FC = () => {
  const { ban, napBan } = useVerso();
  const [trangThai, setTrangThai] = React.useState<'nghi' | 'hoi' | 'tai'>('nghi');
  const [loi, setLoi] = React.useState('');
  const dich = React.useRef<{ ma: string; khoa: string } | null>(null);

  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const ma = q.get('sua'), khoa = q.get('khoa');
    if (!ma || !khoa) return;
    dich.current = { ma, khoa };
    // Có bản nháp dở dang thì phải hỏi: nạp đè là mất trắng công đang làm.
    setTrangThai(ban.trang.length ? 'hoi' : 'tai');
  }, []);   // chỉ đọc đường dẫn một lần, lúc mở trang

  React.useEffect(() => {
    if (trangThai !== 'tai' || !dich.current) return;
    const { ma, khoa } = dich.current;
    (async () => {
      try {
        const r = await fetch(`/api/ban/${encodeURIComponent(ma)}?khoa=${encodeURIComponent(khoa)}`);
        const d = await r.json();
        if (!r.ok) { setLoi(THONG_BAO_LOI[d?.loi] ?? THONG_BAO_LOI.KHONG_MO_DUOC); setTrangThai('nghi'); return; }
        napBan({ ...d, maSua: khoa });
        window.history.replaceState(null, '', '/');
        setTrangThai('nghi');
      } catch {
        setLoi(THONG_BAO_LOI.MAT_MANG); setTrangThai('nghi');
      }
    })();
  }, [trangThai, napBan]);

  if (loi) {
    return <p role="alert" className="mb-5 p-4 rounded-lg bg-loi-50 border border-loi-200 font-semibold text-loi-700">{loi}</p>;
  }
  if (trangThai === 'tai') {
    return <p role="status" className="mb-5 text-sm font-bold text-verso-700">Đang mở bản đã phát hành…</p>;
  }
  if (trangThai === 'hoi') {
    return (
      <div role="alert" className="mb-5 p-4 rounded-lg bg-can-kiem-50 border border-can-kiem-200">
        <p className="font-bold text-can-kiem-700 m-0 mb-1">Bạn đang có một tài liệu làm dở</p>
        <p className="text-sm text-muc-nhat m-0 mb-3">
          <b>{ban.tieuDe || 'Chưa đặt tên'}</b> — {ban.trang.length} trang. Mở bản đã phát hành
          sẽ thay chỗ tài liệu này.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTrangThai('tai')}
            className="px-4 min-h-[44px] rounded-lg bg-verso-700 text-white text-sm font-bold">
            Mở bản đã phát hành
          </button>
          <button onClick={() => { setTrangThai('nghi'); window.history.replaceState(null, '', '/'); }}
            className="px-4 min-h-[44px] rounded-lg border-2 border-vien bg-white text-sm font-bold">
            Giữ tài liệu đang làm
          </button>
        </div>
      </div>
    );
  }
  return null;
};
