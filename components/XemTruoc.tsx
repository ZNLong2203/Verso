'use client';

import React from 'react';
import { Icon } from './ui';
import type { TaiLieuPdf } from '@/lib/pdf';

/** Ô xem trước tệp vừa chọn.
 *
 *  Có ô này vì một lý do rất cụ thể: số trang trong tệp PDF gần như luôn lệch với
 *  số in trên sách (bìa, lời nói đầu, mục lục nằm trước). Không nhìn thấy trang thì
 *  giáo viên gõ số một cách mò mẫm, đọc nhầm trang, và mất luôn một lượt gọi model.
 *  Nhìn thấy thì gõ đúng ngay lần đầu. */

/** Một trang PDF trong ô xem trước.
 *
 *  Chỉ dựng khi trang sắp lọt vào tầm nhìn: cuốn Lịch sử — Địa lí 9 có 252 trang,
 *  dựng hết một lượt là treo tab của giáo viên. */
const TrangPdf: React.FC<{
  tl: TaiLieuPdf;
  so: number;
  chon: boolean;
  bam: () => void;
  kho: Map<number, string>;
  oRef: React.RefObject<HTMLDivElement | null>;
}> = ({ tl, so, chon, bam, kho, oRef }) => {
  const [anh, setAnh] = React.useState(() => kho.get(so) ?? '');
  const [hong, setHong] = React.useState(false);
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (anh || hong) return;
    const el = ref.current;
    if (!el) return;
    let bo = false;
    const ng = new IntersectionObserver((muc) => {
      if (!muc.some((m) => m.isIntersecting)) return;
      ng.disconnect();
      tl.xemTruoc(so)
        .then((d) => { if (!bo) { kho.set(so, d); setAnh(d); } })
        .catch(() => { if (!bo) setHong(true); });
      // Dựng sẵn trước khi trang trôi tới, để lúc cuộn không thấy ô trống nhấp nháy.
    }, { root: oRef.current, rootMargin: '400px 0px' });
    ng.observe(el);
    return () => { bo = true; ng.disconnect(); };
  }, [tl, so, anh, hong, kho, oRef]);

  return (
    <button ref={ref} type="button" onClick={bam} aria-pressed={chon}
      className={`group block w-full text-left rounded-lg border-2 p-1.5 transition-colors ${
        chon ? 'border-verso-600 bg-verso-50' : 'border-transparent hover:border-verso-200'}`}>
      <span className={`block rounded overflow-hidden border ${chon ? 'border-verso-600' : 'border-vien'} bg-white`}>
        {anh ? (
          <img src={anh} alt="" className="block w-full h-auto" />
        ) : (
          // Giữ đúng tỉ lệ A4 để danh sách không giật lên xuống lúc ảnh hiện ra.
          <span className="block w-full aspect-[1/1.414] grid place-items-center text-muc-mo bg-giay-sau">
            {hong ? <Icon ten="anh" co={18} /> : <span className="text-xs">…</span>}
          </span>
        )}
      </span>
      <span className={`block text-center text-xs mt-1 tabular-nums ${
        chon ? 'font-extrabold text-verso-700' : 'text-muc-mo'}`}>
        Trang {so}{chon && <span className="chi-doc-man-hinh"> — đã chọn</span>}
      </span>
    </button>
  );
};

export const XemTruocPdf: React.FC<{
  tl: TaiLieuPdf;
  ten: string;
  chon: number[];
  bamTrang: (so: number) => void;
}> = ({ tl, ten, chon, bamTrang }) => {
  const oRef = React.useRef<HTMLDivElement>(null);
  // Giữ theo tệp: đổi tệp thì bỏ hết ảnh cũ, không thì cuộn lên cuộn xuống
  // lại dựng lại từ đầu.
  const kho = React.useMemo(() => new Map<number, string>(), [tl]);
  const daChon = React.useMemo(() => new Set(chon), [chon]);
  const so = React.useMemo(
    () => Array.from({ length: tl.soTrang }, (_, i) => i + 1), [tl.soTrang]);

  return (
    <div className="grid gap-2 min-w-0">
      <p className="text-xs font-bold text-muc-mo m-0 truncate" title={ten}>
        Xem trước · {tl.soTrang} trang
      </p>
      <div ref={oRef} data-o-xem-truoc
        className="max-h-[28rem] overflow-y-auto overscroll-contain rounded-lg border border-vien
                   bg-giay-sau p-2 grid grid-cols-2 gap-2 content-start">
        {so.map((n) => (
          <TrangPdf key={n} tl={tl} so={n} kho={kho} oRef={oRef}
            chon={daChon.has(n)} bam={() => bamTrang(n)} />
        ))}
      </div>
      <p className="text-xs text-muc-mo m-0">Bấm vào trang để thêm hoặc bỏ khỏi danh sách.</p>
    </div>
  );
};

export type AnhXem = { id: string; ten: string; url: string; xong: boolean };

export const XemTruocAnh: React.FC<{ anh: AnhXem[]; dong: () => void }> = ({ anh, dong }) => (
  <div className="grid gap-2 min-w-0">
    <p className="text-xs font-bold text-muc-mo m-0 flex items-center justify-between gap-2">
      <span>Xem trước · {anh.length} ảnh</span>
      <button type="button" onClick={dong}
        className="font-bold text-verso-700 underline underline-offset-2 hover:bg-verso-50 rounded px-1">
        Ẩn
      </button>
    </p>
    <div data-o-xem-truoc
      className="max-h-[28rem] overflow-y-auto overscroll-contain rounded-lg border border-vien
                 bg-giay-sau p-2 grid grid-cols-2 gap-2 content-start">
      {anh.map((a) => (
        <figure key={a.id} className="m-0">
          <span className="block rounded overflow-hidden border border-vien bg-white relative">
            <img src={a.url} alt="" className="block w-full h-auto" />
            {!a.xong && (
              <span className="absolute inset-0 bg-white/70 grid place-items-center text-xs font-bold text-verso-700">
                đang đọc…
              </span>
            )}
          </span>
          <figcaption className="text-center text-xs mt-1 text-muc-mo truncate" title={a.ten}>
            {a.ten}
          </figcaption>
        </figure>
      ))}
    </div>
  </div>
);
