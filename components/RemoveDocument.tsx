'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './ui';
import { THONG_BAO_LOI } from '@/lib/errors';

export const GoBanDoc: React.FC<{ ma: string; ten: string }> = ({ ma, ten }) => {
  const router = useRouter();
  const [mo, setMo] = React.useState(false);
  const [khoa, setKhoa] = React.useState('');
  const [dang, setDang] = React.useState(false);
  const [loi, setLoi] = React.useState('');
  const oRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { if (mo) oRef.current?.focus(); }, [mo]);

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!khoa.trim()) { setLoi('Chưa nhập mã sửa.'); return; }
    if (!window.confirm(`Gỡ "${ten}" khỏi thư viện? Đường dẫn đã gửi cho học sinh sẽ không mở được nữa.`)) return;
    setDang(true); setLoi('');
    try {
      const r = await fetch(`/api/document/${encodeURIComponent(ma)}?khoa=${encodeURIComponent(khoa.trim())}`,
        { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.loi) {
        // THONG_BAO_LOI.SAI_MA_SUA nói về việc ghi đè — ở đây đang gỡ, câu đó đọc lên sai.
        setLoi(d?.loi === 'SAI_MA_SUA'
          ? 'Mã sửa không đúng với bản này. Kiểm tra lại phần sau chữ khoa= trong link sửa.'
          : THONG_BAO_LOI[d?.loi] ?? 'Chưa gỡ được bản này. Bạn thử lại sau một chút nhé.');
        return;
      }
      router.refresh();
    } catch {
      setLoi(THONG_BAO_LOI.MAT_MANG);
    } finally {
      setDang(false);
    }
  };

  // z-10: thẻ dùng liên kết phủ kín (after:absolute inset-0), không nâng lên thì
  // bấm vào đây lại mở bản đọc.
  if (!mo) {
    return (
      <button type="button" onClick={() => setMo(true)}
        className="relative z-10 mt-3 -mb-1 self-start inline-flex items-center gap-1.5 text-xs font-bold
                   text-muc-mo px-2 py-1.5 -ml-2 rounded hover:text-loi-600 hover:bg-loi-50">
        <Icon ten="xoa" co={13} /> Gỡ khỏi thư viện
      </button>
    );
  }

  return (
    <form onSubmit={go} className="relative z-10 mt-3 grid gap-1.5">
      <label htmlFor={`khoa-${ma}`} className="text-xs font-bold text-muc-nhat">
        Mã sửa của bản này
      </label>
      <div className="flex gap-1.5">
        <input ref={oRef} id={`khoa-${ma}`} value={khoa} onChange={(e) => setKhoa(e.target.value)}
          autoComplete="off" spellCheck={false} placeholder="dán mã sửa"
          className="flex-1 min-w-0 px-2.5 min-h-[38px] rounded-lg border-2 border-vien bg-white
                     text-xs font-mono focus:border-verso-600 outline-none" />
        <button type="submit" disabled={dang}
          className="px-3 min-h-[38px] shrink-0 rounded-lg bg-loi-600 text-white text-xs font-bold
                     hover:bg-loi-700 disabled:opacity-50">
          {dang ? 'Đang gỡ…' : 'Gỡ'}
        </button>
        <button type="button" onClick={() => { setMo(false); setLoi(''); setKhoa(''); }}
          className="px-3 min-h-[38px] shrink-0 rounded-lg border-2 border-vien bg-white text-xs font-bold">
          Thôi
        </button>
      </div>
      {loi
        ? <p role="alert" className="text-xs font-semibold text-loi-700 m-0">{loi}</p>
        : <p className="text-xs text-muc-mo m-0">
            Mã sửa nằm trong đường dẫn <span className="font-mono">?sua=…&amp;khoa=</span> bạn nhận được lúc xuất bản.
          </p>}
    </form>
  );
};
