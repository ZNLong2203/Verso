import React from 'react';
import { TaiVeTieng } from './DownloadAudio';

/* Không có 'use client': đây chỉ là hai đường dẫn, tải được cả khi JavaScript
   không chạy. Học sinh dùng máy cũ vẫn lấy được file. */

const Muc: React.FC<{ href: string; ten: string; mo: string }> = ({ href, ten, mo }) => (
  <a href={href} download
    className="flex-1 min-w-[15rem] flex items-start gap-3 p-3 min-h-[44px] rounded-lg
               bg-giay border border-vien hover:bg-verso-100 hover:border-verso-600
               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 no-underline">
    <span aria-hidden="true" className="text-2xl leading-none mt-0.5">⤓</span>
    <span className="block">
      <span className="block font-bold text-muc">{ten}</span>
      <span className="block text-base text-muc-mo leading-snug mt-0.5">{mo}</span>
    </span>
  </a>
);

export const TaiVe: React.FC<{ ma: string }> = ({ ma }) => (
  <section aria-labelledby="tai-ve-tieu-de"
    className="my-5 p-4 rounded-lg bg-giay-sau border border-vien">
    <h2 id="tai-ve-tieu-de" className="text-base font-extrabold m-0 mb-1">
      Tải về để đọc khi không có mạng
    </h2>
    <p className="text-base text-muc-mo m-0 mb-3 leading-relaxed">
      Cả ba định dạng đều giữ nguyên mô tả hình vẽ, dạng đọc của công thức và mục lục nhảy nhanh.
    </p>
    <div className="flex flex-wrap gap-3">
      <Muc href={`/api/download/${ma}?dang=epub`} ten="EPUB 3"
        mo="Đọc bằng NVDA, Thorium, Apple Books, Google Play Sách." />
      <Muc href={`/api/download/${ma}?dang=daisy`} ten="DAISY 3 — bản chữ"
        mo="Cho máy đọc sách DAISY. Nhảy được theo số trang sách giấy." />
      <TaiVeTieng href={`/api/download/${ma}?dang=daisy-tieng`} ten="DAISY 3 — có tiếng đọc sẵn"
        mo="Kèm giọng đọc tiếng Việt đồng bộ với chữ. Dùng được cả trên máy không có bộ đọc tiếng Việt." />
    </div>
  </section>
);
