import React from 'react';
import type { Khoi } from '@/lib/types';

/* Không có 'use client' — bộ dựng này chạy được ở máy chủ, nên trang học sinh
   là HTML thuần. Trình đọc màn hình đọc được ngay cả khi JavaScript không tải. */

/** Tách "[chú thích 3]" trong văn bản thành liên kết nhảy tới chú thích tương ứng.
 *  Trình đọc màn hình đọc "chú thích ba, liên kết" — người nghe biết đó là dấu chú
 *  thích chứ không phải một phần của câu, và nhảy tới đọc nghĩa được. */
function noiChuThich(text: string): React.ReactNode[] {
  const phan = text.split(/(\[chú thích \d+\])/g);
  return phan.map((p, i) => {
    const m = p.match(/^\[chú thích (\d+)\]$/);
    if (!m) return <React.Fragment key={i}>{p}</React.Fragment>;
    return (
      <a key={i} href={`#chu-thich-${m[1]}`} className="text-verso-700 no-underline"
        aria-label={`Chú thích ${m[1]}, nhảy tới phần giải nghĩa`}>
        <sup>[{m[1]}]</sup>
      </a>
    );
  });
}

/** Hiện ký hiệu cho người sáng mắt, đưa dạng đọc cho trình đọc màn hình.
 *  aria-hidden trên phần ký hiệu là bắt buộc — nếu không, trình đọc sẽ đọc CẢ HAI. */
const KyHieuVaLoi: React.FC<{ kyHieu: string; loi: string; lop?: string }> = ({ kyHieu, loi, lop }) => (
  <>
    <span aria-hidden="true" className={lop}>{kyHieu}</span>
    <span className="chi-doc-man-hinh">{loi}</span>
  </>
);

export const KhoiDoc: React.FC<{
  khoi: Khoi;
  hienCoDuyet?: boolean;
  /** Đẩy cấp tiêu đề xuống. Trang đọc đã có <h1> là tên tài liệu, nên tiêu đề
   *  cấp 1 TRONG SÁCH phải thành <h2> — một trang chỉ được có đúng một <h1>,
   *  nếu không người dùng trình đọc màn hình mất phương hướng khi nhảy theo cấp. */
  lechCap?: number;
}> = ({ khoi: k, hienCoDuyet, lechCap = 1 }) => {
  const canKiem = hienCoDuyet && !k.daDuyet && k.doTinCay !== 'cao';
  const boc = (con: React.ReactNode) =>
    canKiem ? (
      <div className="chua-duyet pl-4 py-2 my-3">
        <p className="text-sm font-bold text-can-kiem-700 mb-1">
          ⚠ Cần giáo viên kiểm lại{k.ghiChu ? ` — ${k.ghiChu}` : ''}
        </p>
        {con}
      </div>
    ) : <>{con}</>;

  switch (k.loai) {
    case 'tieu-de': {
      const cap = Math.min(Math.max((k.capTieuDe || 2) + lechCap, 1), 6);
      const The = `h${cap}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return boc(<The id={`khoi-${k.id}`}>{k.vanBan}</The>);
    }

    case 'van-ban':
      return boc(
        k.vanBanDoc
          ? <p>
              <span aria-hidden="true">{noiChuThich(k.vanBan ?? '')}</span>
              <span className="chi-doc-man-hinh">{k.vanBanDoc}</span>
            </p>
          : <p>{noiChuThich(k.vanBan ?? '')}</p>,
      );

    case 'tho':
      // white-space: pre-wrap giữ nguyên từng dòng thơ và khoảng cách giữa các khổ
      return boc(
        <div className="tho" role="group" aria-label="Đoạn thơ">
          {noiChuThich(k.vanBan ?? '')}
        </div>,
      );

    case 'hinh-anh':
      // Mô tả là NỘI DUNG THẬT, không phải thuộc tính alt của một tấm ảnh không có ở đây.
      // Nhờ vậy nó luôn được đọc, và người sáng mắt cũng đọc được để đối chiếu.
      return boc(
        <figure id={`khoi-${k.id}`}>
          <figcaption>Mô tả hình vẽ</figcaption>
          <p className="m-0">{k.moTa}</p>
        </figure>,
      );

    case 'cong-thuc':
      return boc(
        <div className="cong-thuc" role="math" aria-label={k.docThanhLoi || k.kyHieuGoc}>
          <KyHieuVaLoi kyHieu={k.kyHieuGoc ?? ''} loi={k.docThanhLoi ?? ''} />
        </div>,
      );

    case 'bang': {
      const b = k.bang;
      if (!b) return null;
      const coDoc = (b.hangDoc?.length ?? 0) > 0;
      return boc(
        <div>
          <p className="text-sm text-muc-mo mb-2">{b.tomTat}</p>
          <div className="overflow-x-auto">
            <table>
              <caption className="chi-doc-man-hinh">{b.tomTat}</caption>
              <thead>
                <tr>{b.tieuDeCot.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr>
              </thead>
              <tbody>
                {b.hang.map((hang, r) => (
                  <tr key={r}>
                    {hang.map((o, c) => {
                      const doc = coDoc ? b.hangDoc?.[r]?.[c] : undefined;
                      const noiDung = doc && doc !== o
                        ? <KyHieuVaLoi kyHieu={o} loi={doc} />
                        : o;
                      return c === 0
                        ? <th key={c} scope="row">{noiDung}</th>
                        : <td key={c}>{noiDung}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>,
      );
    }

    case 'bai-tap':
      return boc(
        <section id={k.soBaiTap ? `bai-${maSo(k.soBaiTap)}` : `khoi-${k.id}`}
          aria-label={k.soBaiTap ? `Bài tập ${k.soBaiTap}` : 'Bài tập'}
          className="my-5 pl-4 border-l-4 border-verso-200">
          {k.vanBanDoc ? (
            <>
              <span aria-hidden="true">{noiChuThich(k.vanBan ?? '')}</span>
              <span className="chi-doc-man-hinh">{k.vanBanDoc}</span>
            </>
          ) : noiChuThich(k.vanBan ?? '')}
        </section>,
      );

    case 'chu-thich': {
      const so = (k.vanBan ?? '').match(/^\((\d+)\)/)?.[1];
      return boc(
        <aside id={so ? `chu-thich-${so}` : `khoi-${k.id}`}>
          <span className="chi-doc-man-hinh">Chú thích{so ? ` ${so}` : ''}: </span>
          {k.thuocVe && <b>{k.thuocVe}: </b>}
          {k.vanBan}
        </aside>,
      );
    }

    case 'khung-luu-y':
      return boc(
        <aside className="border-l-4 border-verso-600" aria-label="Khung lưu ý">
          {k.vanBan}
        </aside>,
      );

    default:
      return boc(<p>{k.vanBan}</p>);
  }
};

/** "Bài 12" hay "3a" → mã dùng được trong id và href */
export const maSo = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
