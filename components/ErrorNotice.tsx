'use client';

import React from 'react';

/** Màn hình khi một trang hỏng.
 *
 *  Ba thứ bắt buộc, thiếu cái nào cũng bỏ rơi người dùng: nói rõ hỏng cái gì,
 *  cho thử lại tại chỗ, và cho một đường ra. Trang trắng thì người khiếm thị
 *  không có cách nào biết chuyện gì vừa xảy ra. */
export const BaoHong: React.FC<{
  nhan: string;
  loi: Error & { digest?: string };
  lam: () => void;
  ve: { href: string; ten: string };
}> = ({ nhan, loi, lam, ve }) => {
  React.useEffect(() => { console.error('[verso/trang]', loi?.message, loi?.digest); }, [loi]);

  return (
    <div className="min-h-screen bg-giay grid place-items-center px-5">
      <div role="alert" className="max-w-md text-center">
        <h1 className="text-2xl font-extrabold m-0">{nhan}</h1>
        <p className="text-base text-muc-nhat mt-3 mb-6 leading-relaxed">
          Lỗi này ở phía máy chủ, không phải do bạn làm sai. Thử lại một lần xem sao —
          phần lớn là trục trặc nhất thời.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={lam}
            className="px-5 min-h-[44px] rounded-lg bg-verso-700 text-white font-bold">
            Thử lại
          </button>
          <a href={ve.href}
            className="inline-flex items-center px-5 min-h-[44px] rounded-lg border-2 border-vien bg-white font-bold no-underline text-muc">
            {ve.ten}
          </a>
        </div>
        {loi?.digest && (
          <p className="text-sm text-muc-mo mt-6 mb-0">
            Mã lỗi để báo lại: <span className="font-mono">{loi.digest}</span>
          </p>
        )}
      </div>
    </div>
  );
};
