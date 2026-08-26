'use client';

import React from 'react';
import type { BangDuLieu } from '@/lib/types';

export const SuaBang: React.FC<{ bang: BangDuLieu; doi: (b: BangDuLieu) => void }> = ({ bang, doi }) => {
  const soCot = bang.tieuDeCot.length;

  /** hangDoc phải luôn cùng kích thước với hang, nếu không lúc dựng trang sẽ bị bỏ qua. */
  const dongBo = (b: BangDuLieu): BangDuLieu => ({
    ...b,
    hangDoc: b.hang.map((h, r) => h.map((_, c) => b.hangDoc?.[r]?.[c] ?? '')),
  });

  const suaO = (kho: 'hang' | 'hangDoc', r: number, c: number, v: string) => {
    const b = dongBo(bang);
    const luoi = b[kho].map((h) => [...h]);
    luoi[r][c] = v;
    doi({ ...b, [kho]: luoi });
  };

  const suaCot = (c: number, v: string) => {
    const t = [...bang.tieuDeCot];
    t[c] = v;
    doi({ ...bang, tieuDeCot: t });
  };

  const themHang = () =>
    doi(dongBo({ ...bang, hang: [...bang.hang, Array(soCot).fill('')] }));

  const xoaHang = (r: number) =>
    doi(dongBo({ ...bang, hang: bang.hang.filter((_, i) => i !== r) }));

  const coDoc = bang.hangDoc?.some((h) => h.some((o) => o.trim()));

  const O: React.FC<{ gt: string; doi: (v: string) => void; nhan: string; dam?: boolean }> =
    ({ gt, doi: d, nhan, dam }) => (
      <input value={gt} onChange={(e) => d(e.target.value)} aria-label={nhan}
        className={`w-full min-w-[70px] px-1.5 py-1 rounded border border-vien bg-white text-xs
          focus:border-verso-600 outline-none ${dam ? 'font-bold' : ''}`} />
    );

  return (
    <div className="mt-3 space-y-4">
      <div>
        <label className="block text-xs font-bold text-muc-mo mb-1">
          Bảng này nói về gì — câu này được đọc trước khi vào bảng
        </label>
        <input value={bang.tomTat} onChange={(e) => doi({ ...bang, tomTat: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-vien bg-white text-sm focus:border-verso-600 outline-none" />
      </div>

      <div>
        <p className="text-xs font-bold text-muc-mo mb-1.5">Hiện trên màn hình</p>
        <div className="overflow-x-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                {bang.tieuDeCot.map((c, i) => (
                  <th key={i} className="p-0.5"><O gt={c} doi={(v) => suaCot(i, v)} nhan={`Tên cột ${i + 1}`} dam /></th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {bang.hang.map((h, r) => (
                <tr key={r}>
                  {h.map((o, c) => (
                    <td key={c} className="p-0.5">
                      <O gt={o} doi={(v) => suaO('hang', r, c, v)} nhan={`Hàng ${r + 1} cột ${c + 1}`} />
                    </td>
                  ))}
                  <td className="p-0.5">
                    <button onClick={() => xoaHang(r)} aria-label={`Xoá hàng ${r + 1}`}
                      className="w-7 h-7 grid place-items-center rounded text-muc-mo hover:text-loi-600 hover:bg-loi-50 text-lg leading-none">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={themHang}
          className="mt-1.5 text-xs font-bold text-verso-700 hover:underline">+ Thêm hàng</button>
      </div>

      <div>
        <p className="text-xs font-bold text-muc-mo mb-1.5">
          Đọc thành lời — trình đọc màn hình đọc lưới này
          {!coDoc && <span className="font-normal"> · để trống nếu ô không có ký hiệu toán</span>}
        </p>
        <div className="overflow-x-auto">
          <table className="border-collapse">
            <tbody>
              {bang.hang.map((h, r) => (
                <tr key={r}>
                  {h.map((_, c) => (
                    <td key={c} className="p-0.5">
                      <O gt={bang.hangDoc?.[r]?.[c] ?? ''}
                        doi={(v) => suaO('hangDoc', r, c, v)}
                        nhan={`Dạng đọc hàng ${r + 1} cột ${c + 1}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
