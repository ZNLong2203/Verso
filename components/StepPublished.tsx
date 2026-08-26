'use client';

import React from 'react';
import { Nut, The, Icon } from './ui';
import { useVerso } from '@/lib/store';
import { THONG_BAO_LOI } from '@/lib/errors';
import { TaiVe } from './Downloads';

export const BuocXong: React.FC = () => {
  const { ban, maDaXuatBan, lamLai, datBuoc } = useVerso();
  const [daChep, setDaChep] = React.useState(false);
  const [daChepSua, setDaChepSua] = React.useState(false);
  const [goc, setGoc] = React.useState('');
  const [dangGo, setDangGo] = React.useState(false);
  const [loiGo, setLoiGo] = React.useState('');

  // window chỉ có ở trình duyệt — đọc trong effect để tránh lệch hydration
  React.useEffect(() => setGoc(window.location.origin), []);
  const lien = goc ? `${goc}/doc/${maDaXuatBan}` : '';
  const lienSua = goc && ban.maSua ? `${goc}/?sua=${maDaXuatBan}&khoa=${ban.maSua}` : '';

  const chep = async () => {
    try {
      await navigator.clipboard.writeText(lien);
      setDaChep(true);
      setTimeout(() => setDaChep(false), 2500);
    } catch { /* trình duyệt chặn clipboard */ }
  };

  const chepSua = async () => {
    try {
      await navigator.clipboard.writeText(lienSua);
      setDaChepSua(true);
      setTimeout(() => setDaChepSua(false), 2500);
    } catch { /* trình duyệt chặn clipboard */ }
  };

  const soHinh = ban.trang.flatMap((t) => t.khoi).filter((k) => k.loai === 'hinh-anh').length;
  const soKhoi = ban.trang.reduce((s, t) => s + t.khoi.length, 0);

  return (
    <div className="max-w-5xl grid gap-5">
      {/* Cột trái là việc phải làm ngay (chép link, tải file), cột phải là thứ để
          tra lại (link sửa, cách gửi cho học sinh). Xếp một cột thì thầy cô phải
          cuộn qua cả trang hướng dẫn mới thấy nút tải. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] items-start">
      <div className="grid gap-5 min-w-0">
      <The lop="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-xong-50 text-xong-700 grid place-items-center mx-auto mb-4">
          <Icon ten="check" co={30} />
        </div>
        <h2 className="text-2xl font-extrabold m-0">Đã xuất bản</h2>
        <p className="text-muc-nhat mt-2 mb-0 leading-relaxed">
          <b>{ban.tieuDe}</b><br />
          {ban.trang.length} trang · {soKhoi} phần
          {soHinh > 0 && <> · <b>{soHinh} hình đã được mô tả</b></>}
        </p>

        <div className="mt-6 p-4 rounded-lg bg-giay-sau">
          <p className="text-xs font-bold uppercase tracking-wider text-muc-mo m-0 mb-2">
            Mã chia sẻ — đọc qua điện thoại được
          </p>
          <p className="font-mono text-3xl font-bold tracking-[0.2em] m-0 text-verso-800">
            {maDaXuatBan}
          </p>
        </div>

        <div className="mt-4">
          <label htmlFor="lien-ket" className="chi-doc-man-hinh">Đường dẫn bản đọc</label>
          <input id="lien-ket" readOnly value={lien}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full px-3.5 py-2.5 rounded-lg border-2 border-vien bg-white text-sm font-mono text-center" />
        </div>

        <div className="mt-4 flex gap-2.5 justify-center flex-wrap">
          <Nut icon={daChep ? 'check' : 'lien'} kieu={daChep ? 'nhe' : 'chinh'} onClick={chep}>
            {daChep ? 'Đã chép link' : 'Chép link'}
          </Nut>
          <a href={`/doc/${maDaXuatBan}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-vien bg-white text-sm font-bold hover:border-verso-600 hover:text-verso-700">
            <Icon ten="mat" co={16} /> Mở thử bản đọc
          </a>
        </div>
      </The>

      <TaiVe ma={maDaXuatBan} />
      </div>

      <div className="grid gap-5 min-w-0">
      {lienSua && (
        <The lop="p-5">
          <h3 className="text-base font-extrabold m-0">Link để sửa lại sau — giữ riêng</h3>
          <p className="text-sm text-muc-nhat mt-1.5 mb-3 leading-relaxed">
            Bản nháp chỉ nằm trong máy này. Lưu link dưới đây thì mở ở máy khác vẫn sửa tiếp
            được, và bản mới <b>giữ nguyên đường dẫn cũ</b> của học sinh.
            <b> Đừng gửi link này cho học sinh</b> — ai có nó cũng sửa được bản đọc.
          </p>
          <label htmlFor="lien-sua" className="chi-doc-man-hinh">Đường dẫn để sửa lại</label>
          {/* Ô một dòng cắt link cụt ở cột hẹp, mà link này không ai đọc bằng mắt —
              người ta chép nó đi. Cho xuống dòng để thấy đủ, và có nút chép sẵn. */}
          <textarea id="lien-sua" readOnly value={lienSua} rows={3}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full px-3.5 py-2.5 rounded-lg border-2 border-can-kiem-200 bg-can-kiem-50
                       text-xs font-mono break-all resize-none" />
          <div className="mt-2">
            <Nut co="nho" kieu={daChepSua ? 'nhe' : 'phu'}
              icon={daChepSua ? 'check' : 'lien'} onClick={chepSua}>
              {daChepSua ? 'Đã chép link sửa' : 'Chép link sửa'}
            </Nut>
          </div>
        </The>
      )}

      <The lop="p-6">
        <h3 className="text-base font-extrabold m-0">Gửi cho học sinh thế nào</h3>
        <ol className="mt-3 mb-0 pl-5 grid gap-2 text-sm text-muc-nhat leading-relaxed">
          <li>Gửi đường dẫn qua Zalo, email, hoặc dán vào nhóm lớp.</li>
          <li>Học sinh mở bằng trình duyệt bất kỳ — <b>không cần cài gì</b>.</li>
          <li>Trình đọc màn hình sẵn có trên máy các em (NVDA, VoiceOver, TalkBack) đọc được ngay.</li>
          <li>Thầy cô giao “làm bài 3” thì các em nhảy thẳng tới bài 3 từ mục lục.</li>
          <li>Em nào nhà không có mạng thì tải file EPUB hoặc DAISY về, chép vào máy đọc sách.</li>
        </ol>
      </The>
      </div>
      </div>

      {loiGo && <p role="alert" className="text-sm font-semibold text-loi-700 m-0">{loiGo}</p>}

      <div className="flex gap-3 flex-wrap">
        {/* Phát hiện sai sót sau khi gửi link là chuyện thường. Không có đường quay
            lại thì thầy cô phải làm lại từ đầu, và bản sai vẫn nằm đó. */}
        <Nut kieu="phu" icon="sua" onClick={() => datBuoc('duyet')}>Sửa lại nội dung</Nut>
        <Nut kieu="phu" icon="cong" onClick={lamLai}>Chuyển tài liệu khác</Nut>
        {ban.maSua && (
          // Bản chuyển hỏng mà không gỡ được thì cứ nằm trong thư viện, học sinh vẫn mở phải.
          <Nut kieu="phu" icon="xoa" tat={dangGo} onClick={async () => {
            if (!window.confirm(`Gỡ "${ban.tieuDe}" khỏi thư viện? Đường dẫn đã gửi sẽ không mở được nữa.`)) return;
            setDangGo(true); setLoiGo('');
            try {
              const r = await fetch(`/api/document/${maDaXuatBan}?khoa=${encodeURIComponent(ban.maSua!)}`, { method: 'DELETE' });
              if (!r.ok) { const d = await r.json().catch(() => ({})); setLoiGo(THONG_BAO_LOI[d?.loi] ?? 'Chưa gỡ được bản này.'); return; }
              lamLai();
            } catch { setLoiGo(THONG_BAO_LOI.MAT_MANG); }
            finally { setDangGo(false); }
          }}>
            {dangGo ? 'Đang gỡ…' : 'Gỡ khỏi thư viện'}
          </Nut>
        )}
        <a href="/library" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-vien bg-white text-sm font-bold hover:border-verso-600 hover:text-verso-700">
          <Icon ten="sach" co={16} /> Xem thư viện
        </a>
      </div>
    </div>
  );
};
