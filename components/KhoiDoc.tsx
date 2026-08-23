import React from 'react';
import type { Khoi } from '@/lib/types';
import { neoChuThich, soTuNeo, loiChuThich } from '@/lib/neo';

/* Không có 'use client' — bộ dựng này chạy được ở máy chủ, nên trang học sinh
   là HTML thuần. Trình đọc màn hình đọc được ngay cả khi JavaScript không tải. */

/** Tách "[chú thích 3]" trong văn bản thành liên kết nhảy tới chú thích tương ứng.
 *  Trình đọc màn hình đọc "chú thích ba, liên kết" — người nghe biết đó là dấu chú
 *  thích chứ không phải một phần của câu, và nhảy tới đọc nghĩa được.
 *
 *  coLien = false dùng cho bản chỉ để NHÌN (đã aria-hidden). Bên trong vùng
 *  aria-hidden mà đặt liên kết thì người dùng bàn phím vẫn tab vào được một thứ
 *  trình đọc màn hình không hề xướng — lạc hẳn, không biết mình đang ở đâu. */
function noiChuThich(text: string, trang: number, coLien: boolean): React.ReactNode[] {
  const phan = text.split(/(\[chú thích \d+\])/g);
  return phan.map((p, i) => {
    const m = p.match(/^\[chú thích (\d+)\]$/);
    if (!m) return <React.Fragment key={i}>{p}</React.Fragment>;
    if (!coLien) return <sup key={i} className="text-verso-700">[{m[1]}]</sup>;
    return (
      <a key={i} href={`#${neoChuThich(trang, m[1])}`}
        className="text-verso-700 no-underline inline-grid place-items-center min-w-[24px] min-h-[24px] align-middle"
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
  /** id duy nhất trong cả tài liệu, do lib/neo tính sẵn — xem dungNeo. */
  neo: string;
  /** Thứ tự trang (1-based), để dấu chú thích trỏ đúng chú thích của trang này. */
  trang: number;
  hienCoDuyet?: boolean;
  /** Đẩy cấp tiêu đề xuống. Trang đọc đã có <h1> là tên tài liệu, nên tiêu đề
   *  cấp 1 TRONG SÁCH phải thành <h2> — một trang chỉ được có đúng một <h1>,
   *  nếu không người dùng trình đọc màn hình mất phương hướng khi nhảy theo cấp. */
  lechCap?: number;
}> = ({ khoi: k, neo, trang, hienCoDuyet, lechCap = 1 }) => {
  /** ct = bản đọc được (có liên kết) · ctNhin = bản chỉ để nhìn (không tab vào được) */
  const ct = (t: string) => noiChuThich(t, trang, true);
  const ctNhin = (t: string) => noiChuThich(t, trang, false);
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
      return boc(<The id={neo}>{k.vanBan}</The>);
    }

    case 'van-ban':
      return boc(
        k.vanBanDoc
          ? <p>
              <span aria-hidden="true">{ctNhin(k.vanBan ?? '')}</span>
              <span className="chi-doc-man-hinh">{ct(k.vanBanDoc)}</span>
            </p>
          : <p>{ct(k.vanBan ?? '')}</p>,
      );

    case 'tho':
      // white-space: pre-wrap giữ nguyên từng dòng thơ và khoảng cách giữa các khổ
      return boc(
        <div className="tho" role="group" aria-label="Đoạn thơ">
          {ct(k.vanBan ?? '')}
        </div>,
      );

    case 'hinh-anh':
      // Mô tả là NỘI DUNG THẬT, không phải thuộc tính alt của một tấm ảnh không có ở đây.
      // Nhờ vậy nó luôn được đọc, và người sáng mắt cũng đọc được để đối chiếu.
      return boc(
        <figure id={neo}>
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
        // Không dùng <section aria-label> ở đây: mỗi cái sẽ thành một landmark,
        // và hai bài trùng số hiệu sẽ tạo landmark trùng tên. Dùng div kèm câu dẫn ẩn —
        // nhảy tới vẫn được xướng "Bài tập 3", mà không làm loạn danh sách landmark.
        <div id={neo} tabIndex={-1}
          className="my-5 pl-4 border-l-4 border-verso-200">
          <span className="chi-doc-man-hinh">
            {k.soBaiTap ? `Bài tập ${k.soBaiTap}. ` : 'Bài tập. '}
          </span>
          {k.vanBanDoc ? (
            <>
              <span aria-hidden="true">{ctNhin(k.vanBan ?? '')}</span>
              <span className="chi-doc-man-hinh">{ct(k.vanBanDoc)}</span>
            </>
          ) : ct(k.vanBan ?? '')}
        </div>,
      );

    case 'chu-thich': {
      const so = soTuNeo(neo);
      return boc(
        <aside id={neo}>
          <span className="chi-doc-man-hinh">Chú thích{so ? ` ${so}` : ''}: </span>
          {loiChuThich(k)}
        </aside>,
      );
    }

    case 'khung-luu-y':
      // role="note" chứ không phải <aside>: mỗi <aside aria-label="Khung lưu ý">
      // là một landmark, mà trang nào cũng có vài khung — danh sách landmark đầy
      // những mục trùng tên, người dùng trình đọc màn hình không dùng được nữa.
      return boc(
        <div role="note" id={neo} className="border-l-4 border-verso-600 pl-4 my-4">
          <span className="chi-doc-man-hinh">Khung lưu ý: </span>
          {k.vanBan}
        </div>,
      );

    default:
      return boc(<p>{k.vanBan}</p>);
  }
};

