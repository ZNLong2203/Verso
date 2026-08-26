'use client';

import React from 'react';

export const TaiVeTieng: React.FC<{ href: string; ten: string; mo: string }> = ({ href, ten, mo }) => {
  const [dangTao, setDangTao] = React.useState(false);
  const [loi, setLoi] = React.useState('');

  const bam = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (dangTao) { e.preventDefault(); return; }
    e.preventDefault();
    setLoi(''); setDangTao(true);
    try {
      const r = await fetch(href);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.loi === 'QUA_NHIEU_DOAN'
          ? `Tài liệu này có ${d.soDoan} đoạn — quá dài để tạo bản có tiếng trong một lần. Hãy tách thành nhiều tài liệu nhỏ hơn.`
          : d?.loi === 'CHUA_BAT_TTS'
            ? 'Máy chủ chưa bật được giọng đọc.'
            : 'Chưa tạo được bản có tiếng. Thử lại sau ít phút.');
      }
      const blob = await r.blob();
      const ten2 = /filename="([^"]+)"/.exec(r.headers.get('content-disposition') ?? '')?.[1] ?? 'daisy-co-tieng.zip';
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u; a.download = ten2;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 60_000);
    } catch (er) {
      setLoi(String((er as Error).message));
    } finally {
      setDangTao(false);
    }
  };

  return (
    <>
      <a href={href} download onClick={bam} aria-busy={dangTao}
        className="flex-1 min-w-[15rem] flex items-start gap-3 p-3 min-h-[44px] rounded-lg
                   bg-giay border border-vien hover:bg-verso-100 hover:border-verso-600
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 no-underline">
        <span aria-hidden="true" className="text-2xl leading-none mt-0.5">{dangTao ? '⏳' : '⤓'}</span>
        <span className="block">
          <span className="block font-bold text-muc">{ten}</span>
          <span className="block text-base text-muc-mo leading-snug mt-0.5">
            {dangTao ? 'Đang tạo giọng đọc cho từng đoạn, chờ khoảng một phút…' : mo}
          </span>
        </span>
      </a>
      <p role="status" aria-live="polite" className="chi-doc-man-hinh">
        {dangTao ? 'Đang tạo bản có tiếng, chờ khoảng một phút.' : ''}
      </p>
      {loi && <p role="alert" className="w-full text-sm font-semibold text-loi-700 m-0">{loi}</p>}
    </>
  );
};
