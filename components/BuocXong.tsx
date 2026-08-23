'use client';

import React from 'react';
import { Nut, The, Icon } from './ui';
import { useVerso } from '@/lib/store';

export const BuocXong: React.FC = () => {
  const { ban, maDaXuatBan, lamLai } = useVerso();
  const [daChep, setDaChep] = React.useState(false);
  const [goc, setGoc] = React.useState('');

  // window chỉ có ở trình duyệt — đọc trong effect để tránh lệch hydration
  React.useEffect(() => setGoc(window.location.origin), []);
  const lien = goc ? `${goc}/doc/${maDaXuatBan}` : '';

  const chep = async () => {
    try {
      await navigator.clipboard.writeText(lien);
      setDaChep(true);
      setTimeout(() => setDaChep(false), 2500);
    } catch { /* trình duyệt chặn clipboard */ }
  };

  const soHinh = ban.trang.flatMap((t) => t.khoi).filter((k) => k.loai === 'hinh-anh').length;
  const soKhoi = ban.trang.reduce((s, t) => s + t.khoi.length, 0);

  return (
    <div className="max-w-2xl grid gap-5">
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

      <The lop="p-6">
        <h3 className="text-base font-extrabold m-0">Gửi cho học sinh thế nào</h3>
        <ol className="mt-3 mb-0 pl-5 grid gap-2 text-sm text-muc-nhat leading-relaxed">
          <li>Gửi đường dẫn qua Zalo, email, hoặc dán vào nhóm lớp.</li>
          <li>Học sinh mở bằng trình duyệt bất kỳ — <b>không cần cài gì</b>.</li>
          <li>Trình đọc màn hình sẵn có trên máy các em (NVDA, VoiceOver, TalkBack) đọc được ngay.</li>
          <li>Thầy cô giao “làm bài 3” thì các em nhảy thẳng tới bài 3 từ mục lục.</li>
        </ol>
      </The>

      <div className="flex gap-3">
        <Nut kieu="phu" icon="cong" onClick={lamLai}>Chuyển tài liệu khác</Nut>
        <a href="/thu-vien" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-vien bg-white text-sm font-bold hover:border-verso-600 hover:text-verso-700">
          <Icon ten="sach" co={16} /> Xem thư viện
        </a>
      </div>
    </div>
  );
};
