'use client';

import React from 'react';
import { VersoProvider, useVerso, type Buoc } from '@/lib/store';
import { MoDeSua } from './MoDeSua';
import { BuocThongTin } from './BuocThongTin';
import { BuocTaiTrang } from './BuocTaiTrang';
import { BuocDuyet } from './BuocDuyet';
import { BuocXong } from './BuocXong';
import { Icon } from './ui';

const CAC_BUOC: { id: Buoc; ten: string }[] = [
  { id: 'thong-tin', ten: 'Thông tin' },
  { id: 'tai-trang', ten: 'Tải trang' },
  { id: 'duyet', ten: 'Duyệt' },
  { id: 'xong', ten: 'Xuất bản' },
];

const Ruot: React.FC = () => {
  const { buoc, datBuoc, ban } = useVerso();
  const viTri = CAC_BUOC.findIndex((b) => b.id === buoc);

  return (
    <div className="min-h-screen bg-giay">
      <header className="border-b border-vien bg-white">
        {/* Đúng một <h1> cho cả trang, ẩn về mặt thị giác vì logo và tiêu đề từng bước
            đã đủ dẫn dắt bằng mắt. Đặt trong <header> để không nằm ngoài landmark nào. */}
        <h1 className="chi-doc-man-hinh">
          Verso — chuyển trang sách giáo khoa thành bản đọc được
        </h1>
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5 no-underline text-muc min-h-[44px] py-1">
            <span className="w-9 h-9 rounded-lg bg-verso-700 text-white grid place-items-center font-doc font-bold text-lg">V</span>
            <span className="leading-tight">
              <span className="block font-extrabold">Verso</span>
              <span className="block text-xs text-muc-mo">Sách giáo khoa nghe được</span>
            </span>
          </a>
          <a href="/thu-vien"
            className="text-sm font-bold text-verso-700 inline-flex items-center gap-1.5
                       min-h-[44px] px-2 -mx-2 rounded hover:bg-verso-50">
            <Icon ten="sach" co={16} /> Thư viện
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-7">
        {/* Thanh bước.
            Vòng tròn có dấu tích chứ không phải chữ "1. 2. 3.": giáo viên liếc một cái
            là biết đã qua mấy bước, còn mấy bước nữa. Trạng thái vẫn nói thành lời cho
            trình đọc màn hình, vì màu và dấu tích không tự đọc lên được. */}
        <nav aria-label="Các bước" className="mb-7">
          <ol className="flex items-start m-0 p-0 list-none">
            {CAC_BUOC.map((b, i) => {
              const dangO = b.id === buoc;
              const daQua = i < viTri;
              const bamDuoc = daQua || (i === 1 && ban.tieuDe) || (i === 2 && ban.trang.length);
              return (
                <li key={b.id} className="flex-1 flex flex-col items-center gap-1.5 relative min-w-0">
                  {/* Vạch nối vẽ sau vòng tròn, lùi ra sau để không đè lên nó */}
                  {i > 0 && (
                    <span aria-hidden="true"
                      className={`absolute top-[1.125rem] right-1/2 left-[-50%] h-0.5 -z-0 ${
                        daQua || dangO ? 'bg-verso-600' : 'bg-vien'}`} />
                  )}
                  <button onClick={() => bamDuoc && datBuoc(b.id)} disabled={!bamDuoc && !dangO}
                    aria-current={dangO ? 'step' : undefined}
                    className="group relative z-10 flex flex-col items-center gap-1.5 px-1 pb-1 rounded-lg
                               disabled:cursor-default enabled:hover:bg-verso-50/70 min-w-0 w-full">
                    <span aria-hidden="true"
                      className={`w-9 h-9 shrink-0 rounded-full grid place-items-center font-extrabold text-sm
                                  border-2 transition-colors ${
                        dangO ? 'bg-verso-700 border-verso-700 text-white'
                        : daQua ? 'bg-verso-50 border-verso-600 text-verso-700'
                        : 'bg-white border-vien text-muc-mo'}`}>
                      {daQua ? <Icon ten="check" co={17} /> : i + 1}
                    </span>
                    <span className={`text-xs sm:text-sm font-bold text-center leading-tight truncate max-w-full ${
                      dangO ? 'text-verso-700' : daQua ? 'text-muc-nhat' : 'text-muc-mo'}`}>
                      {b.ten}
                    </span>
                    <span className="chi-doc-man-hinh">
                      {dangO ? ' — bước đang làm' : daQua ? ' — đã xong' : ' — chưa tới'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <main id="noi-dung">
          <MoDeSua />
          {buoc === 'thong-tin' && <BuocThongTin />}
          {buoc === 'tai-trang' && <BuocTaiTrang />}
          {buoc === 'duyet' && <BuocDuyet />}
          {buoc === 'xong' && <BuocXong />}
        </main>
      </div>
    </div>
  );
};

export const XuongLam: React.FC = () => (
  <VersoProvider><Ruot /></VersoProvider>
);
