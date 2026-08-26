'use client';

import React from 'react';
import { useVerso } from '@/lib/store';

interface GopY { id: string; khoiId: string; noiDung: string; luc: string }

/** Góp ý người đọc gửi về, hiện ngay trong màn duyệt.
 *
 *  Đặt ở đây chứ không phải một trang riêng: chỗ duy nhất giáo viên sửa được nội
 *  dung là màn này, nên báo lỗi phải nằm cạnh chính chỗ sửa. */
export const HopGopY: React.FC<{ toiKhoi: (khoiId: string) => void }> = ({ toiKhoi }) => {
  const { ban } = useVerso();
  const [ds, setDs] = React.useState<GopY[] | null>(null);

  React.useEffect(() => {
    if (!ban.maChiaSe || !ban.maSua) return;
    (async () => {
      try {
        const r = await fetch(`/api/feedback/${ban.maChiaSe}?khoa=${encodeURIComponent(ban.maSua!)}`);
        if (!r.ok) return;
        setDs((await r.json()).ds ?? []);
      } catch { /* không lấy được thì im lặng, đây là phần phụ */ }
    })();
  }, [ban.maChiaSe, ban.maSua]);

  if (!ds?.length) return null;

  return (
    <section aria-labelledby="gop-y-tieu-de"
      className="p-5 rounded-xl bg-can-kiem-50 border border-can-kiem-200">
      <h3 id="gop-y-tieu-de" className="text-base font-extrabold m-0 text-can-kiem-700">
        {ds.length} góp ý từ người đọc
      </h3>
      <p className="text-sm text-muc-nhat mt-1 mb-3 leading-relaxed">
        Học sinh là người duy nhất nghe được chỗ nào đọc lên thành sai. Đây là những gì
        các em báo lại.
      </p>
      <ul className="m-0 p-0 list-none grid gap-2">
        {ds.map((g) => (
          <li key={g.id} className="p-3 rounded-lg bg-white border border-vien">
            <p className="m-0 text-base leading-relaxed">{g.noiDung}</p>
            <p className="m-0 mt-1.5 text-sm text-muc-mo">
              {new Date(g.luc).toLocaleString('vi-VN')}
              {g.khoiId && (
                <>
                  {' · '}
                  <button onClick={() => toiKhoi(g.khoiId)}
                    className="font-bold text-verso-700 underline underline-offset-2">
                    tới phần bị báo
                  </button>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};
