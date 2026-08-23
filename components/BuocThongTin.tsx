'use client';

import React from 'react';
import { Nut, O, The } from './ui';
import { useVerso, MON_HOC_DS } from '@/lib/store';
import { MON_HOC_INFO } from '@/lib/constants';

export const BuocThongTin: React.FC = () => {
  const { ban, suaBan, datBuoc } = useVerso();
  const duNoiDung = ban.tieuDe.trim().length > 2 && ban.nguoiChuyen.trim().length > 1;

  return (
    <The lop="p-6 max-w-2xl">
      <h2 className="text-xl font-extrabold m-0">Tài liệu này là gì?</h2>
      <p className="text-muc-nhat mt-2 mb-6 leading-relaxed">
        Thông tin ở đây đi kèm bản đọc để học sinh và thầy cô khác biết đang đọc phần nào của
        sách nào. Chọn đúng môn cũng giúp Verso đọc trang chính xác hơn — sách Toán và sách
        Ngữ văn được xử lý theo hai cách rất khác nhau.
      </p>

      <div className="grid gap-4">
        <O nhan="Tên tài liệu" gt={ban.tieuDe} doi={(v) => suaBan({ tieuDe: v })} batBuoc
          goiY="Ví dụ: Toán 9 — Chương 3: Hệ thức lượng trong tam giác vuông" />

        <div>
          <span className="block text-sm font-bold text-muc-nhat mb-2">Môn học</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Môn học">
            {MON_HOC_DS.map((m) => {
              const chon = ban.monHoc === m;
              return (
                <button key={m} role="radio" aria-checked={chon} onClick={() => suaBan({ monHoc: m })}
                  className={`px-3.5 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                    chon ? 'bg-verso-700 border-verso-700 text-white' : 'bg-white border-vien text-muc-nhat hover:border-verso-600'
                  }`}>
                  {MON_HOC_INFO[m].ten}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="lop" className="block text-sm font-bold text-muc-nhat mb-1.5">Lớp</label>
            <select id="lop" value={ban.lop ?? ''} onChange={(e) => suaBan({ lop: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3.5 py-2.5 rounded-lg border-2 border-vien bg-white focus:border-verso-600 outline-none">
              <option value="">— chọn lớp —</option>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map((l) => <option key={l} value={l}>Lớp {l}</option>)}
            </select>
          </div>
          <O nhan="Nguồn sách" gt={ban.nguon} doi={(v) => suaBan({ nguon: v })}
            goiY="NXB Giáo dục Việt Nam, bộ Kết nối tri thức…" />
        </div>

        <O nhan="Người chuyển đổi" gt={ban.nguoiChuyen} doi={(v) => suaBan({ nguoiChuyen: v })} batBuoc
          goiY="Tên bạn hoặc tên trường — để thầy cô khác biết ai đã làm bản này" />
      </div>

      <div className="mt-7 flex items-center gap-3">
        <Nut co="lon" icon="phai" onClick={() => datBuoc('tai-trang')} tat={!duNoiDung}>
          Tiếp — tải trang sách lên
        </Nut>
        {!duNoiDung && (
          <span className="text-sm text-muc-mo">Cần điền tên tài liệu và người chuyển đổi</span>
        )}
      </div>
    </The>
  );
};
