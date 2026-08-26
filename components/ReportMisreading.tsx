'use client';

import React from 'react';
import { THONG_BAO_LOI } from '@/lib/errors';
import { layDangNghe } from '@/lib/nowPlaying';

export const BaoDocSai: React.FC<{ ma: string }> = ({ ma }) => {
  const [mo, setMo] = React.useState(false);
  const [noiDung, setNoiDung] = React.useState('');
  const [dangGui, setDangGui] = React.useState(false);
  const [xong, setXong] = React.useState(false);
  const [loi, setLoi] = React.useState('');
  const [phan, setPhan] = React.useState('');

  /** Phần đang tô sáng nếu còn đang nghe; nếu đã dừng thì lấy phần nghe gần nhất.
   *  Khỏi bắt người dùng tự mô tả "chỗ nào" — họ vừa nghe xong chính chỗ đó. */
  const mocDangNghe = () => {
    const e = document.querySelector('.dang-nghe');
    if (e) return { id: e.getAttribute('data-khoi') ?? '', nhan: (e.textContent ?? '').trim().slice(0, 60) };
    return layDangNghe();
  };

  const batDau = () => {
    const m = mocDangNghe();
    setPhan(m.nhan);
    (window as unknown as { __versoKhoi?: string }).__versoKhoi = m.id;
    setMo(true); setXong(false); setLoi('');
  };

  const gui = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noiDung.trim()) return;
    setDangGui(true); setLoi('');
    try {
      const r = await fetch(`/api/feedback/${encodeURIComponent(ma)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          khoiId: (window as unknown as { __versoKhoi?: string }).__versoKhoi ?? '',
          noiDung,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setLoi(THONG_BAO_LOI[d?.loi] ?? 'Chưa gửi được. Thử lại sau nhé.'); return; }
      setXong(true); setNoiDung(''); setMo(false);
    } catch {
      setLoi(THONG_BAO_LOI.MAT_MANG);
    } finally {
      setDangGui(false);
    }
  };

  if (xong) {
    return (
      <p role="status" className="m-0 text-base font-bold text-xong-700">
        Đã gửi. Cảm ơn bạn — thầy cô sẽ thấy góp ý này khi mở lại bản đọc để sửa.
      </p>
    );
  }

  if (!mo) {
    return (
      <button onClick={batDau}
        className="text-base font-bold text-verso-700 underline underline-offset-2
                   min-h-[44px] inline-flex items-center px-2 -mx-2 rounded hover:bg-verso-50">
        Báo chỗ đọc sai
      </button>
    );
  }

  return (
    <form onSubmit={gui} className="grid gap-2">
      <label htmlFor="bao-doc-sai" className="text-base font-bold m-0">
        Chỗ nào nghe chưa đúng?
      </label>
      {phan && (
        <p className="text-sm text-muc-mo m-0">
          Đang báo về phần: <span lang="vi">“{phan}…”</span>
        </p>
      )}
      <textarea id="bao-doc-sai" rows={3} maxLength={500} required
        value={noiDung} onChange={(e) => setNoiDung(e.target.value)}
        placeholder="Ví dụ: chỗ này đọc số 4 chấm 1 thành bốn mươi mốt."
        className="w-full px-3 py-2 rounded-lg border-2 border-vien bg-white text-base leading-relaxed" />
      <div className="flex gap-2 flex-wrap">
        <button type="submit" disabled={dangGui}
          className="px-5 min-h-[44px] rounded-lg bg-verso-700 text-white font-bold disabled:opacity-50">
          {dangGui ? 'Đang gửi…' : 'Gửi cho thầy cô'}
        </button>
        <button type="button" onClick={() => { setMo(false); setLoi(''); }}
          className="px-4 min-h-[44px] rounded-lg border-2 border-vien bg-white font-bold">
          Thôi
        </button>
      </div>
      <p className="text-sm text-muc-mo m-0">Không thu thập tên hay thông tin gì của bạn.</p>
      {loi && <p role="alert" className="text-sm font-semibold text-loi-700 m-0">{loi}</p>}
    </form>
  );
};
