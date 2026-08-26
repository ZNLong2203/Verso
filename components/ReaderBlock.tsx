import React from 'react';
import type { Khoi } from '@/lib/types';
import { neoChuThich, neoDauChuThich, soTuNeo, loiChuThich, thanBaiTap, nhanMuc } from '@/lib/anchors';
import { chiaNnu, maNnu, type Nnu } from '@/lib/language';

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
      <a key={i} id={neoDauChuThich(trang, m[1])} href={`#${neoChuThich(trang, m[1])}`}
        className="text-verso-700 no-underline inline-grid place-items-center min-w-[24px] min-h-[24px] align-middle"
        aria-label={`Chú thích ${m[1]}`}>
        <sup>[{m[1]}]</sup>
      </a>
    );
  });
}

/** Dựng văn bản có xen tiếng Anh, kèm cả liên kết chú thích.
 *
 *  Thuộc tính lang là thứ trình đọc màn hình dùng để ĐỔI BỘ PHÁT ÂM. Thiếu nó,
 *  NVDA đọc "Hello, how are you" bằng âm tiếng Việt — học sinh học phát âm sai
 *  mà không có cách nào biết. Đây là WCAG 3.1.2 Ngôn ngữ của từng phần, mức AA. */
function chuCoNnu(text: string, goc: Nnu, trang: number, coLien: boolean): React.ReactNode[] {
  return chiaNnu(text, goc).map((d, i) =>
    d.nnu === goc
      ? <React.Fragment key={i}>{noiChuThich(d.text, trang, coLien)}</React.Fragment>
      : <span key={i} lang={maNnu(d.nnu)}>{noiChuThich(d.text, trang, coLien)}</span>,
  );
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
  const goc: Nnu = k.ngonNgu === 'en' ? 'en' : 'vi';
  /** Cả khối là tiếng Anh thì đánh dấu ở chính thẻ bao, đoạn xen thì đánh dấu bên trong. */
  const langKhoi = goc === 'en' ? { lang: maNnu('en') } : {};
  /** ct = bản đọc được (có liên kết) · ctNhin = bản chỉ để nhìn (không tab vào được) */
  const ct = (t: string) => chuCoNnu(t, goc, trang, true);
  const ctNhin = (t: string) => chuCoNnu(t, goc, trang, false);
  const canKiem = hienCoDuyet && !k.daDuyet && k.doTinCay !== 'cao';
  /** id để nhảy tới, và data-khoi để nối góp ý về đúng khối trong màn duyệt. */
  const chung = { id: neo, 'data-khoi': k.id } as const;
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
      return boc(<The {...chung} {...langKhoi}>{ct(k.vanBan ?? '')}</The>);
    }

    case 'van-ban':
      return boc(
        k.vanBanDoc
          ? <p {...chung} {...langKhoi}>
              <span aria-hidden="true">{ctNhin(k.vanBan ?? '')}</span>
              <span className="chi-doc-man-hinh">{ct(k.vanBanDoc)}</span>
            </p>
          : <p {...chung} {...langKhoi}>{ct(k.vanBan ?? '')}</p>,
      );

    case 'tho':
      // white-space: pre-wrap giữ nguyên từng dòng thơ và khoảng cách giữa các khổ
      return boc(
        <div {...chung} className="tho" role="group" aria-label="Đoạn thơ" {...langKhoi}>
          {ct(k.vanBan ?? '')}
        </div>,
      );

    case 'hinh-anh': {
      // Mô tả là NỘI DUNG THẬT, không phải thuộc tính alt của một tấm ảnh không có ở đây.
      // Nhờ vậy nó luôn được đọc, và người sáng mắt cũng đọc được để đối chiếu.
      const nguonAnh = k.maHinh ? `/api/figure/${k.maHinh}` : k.anhHinh;
      return boc(
        <figure {...chung}>
          {nguonAnh && (
            // alt="" là CỐ Ý: mô tả nằm ngay dưới dưới dạng chữ thật, đặt alt nữa
            // là trình đọc màn hình đọc hai lần cùng một nội dung. Ảnh ở đây phục vụ
            // học sinh NHÌN KÉM — phóng to lên vẫn xem được — và giáo viên đối chiếu.
            <img src={nguonAnh} alt="" loading="lazy"
              className="block max-w-full h-auto mx-auto mb-3 rounded border border-vien bg-white" />
          )}
          {/* figcaption phải là con ĐẦU hoặc CUỐI của figure — kẹp giữa <img> và
              <p> là XHTML không hợp lệ, trình duyệt bỏ qua nhưng EPUB thì từ chối.
              Để nó ở cuối và ôm trọn phần mô tả: đó đúng là lời chú của hình. */}
          <figcaption>
            <span className="block">Mô tả hình vẽ</span>
            <p className="m-0 mt-1">{ct(k.moTa ?? '')}</p>
          </figcaption>
        </figure>,
      );
    }

    case 'cong-thuc':
      return boc(
        <div {...chung} className="cong-thuc" role="math" aria-label={k.docThanhLoi || k.kyHieuGoc}>
          <KyHieuVaLoi kyHieu={k.kyHieuGoc ?? ''} loi={k.docThanhLoi ?? ''} />
        </div>,
      );

    case 'bang': {
      const b = k.bang;
      if (!b) return null;
      const coDoc = (b.hangDoc?.length ?? 0) > 0;
      return boc(
        <div {...chung}>
          {/* aria-hidden vì <caption> bên dưới đã mang đúng câu này cho trình đọc
              màn hình. Để cả hai là người nghe nghe tóm tắt bảng hai lần liền. */}
          <p aria-hidden="true" className="text-base text-muc-mo mb-2">{ct(b.tomTat)}</p>
          <div className="overflow-x-auto">
            <table>
              <caption className="chi-doc-man-hinh">{b.tomTat}</caption>
              <thead>
                <tr>{b.tieuDeCot.map((c, i) => <th key={i} scope="col">{ct(c)}</th>)}</tr>
              </thead>
              <tbody>
                {b.hang.map((hang, r) => (
                  <tr key={r}>
                    {hang.map((o, c) => {
                      const doc = coDoc ? b.hangDoc?.[r]?.[c] : undefined;
                      const noiDung = doc && doc !== o
                        ? <KyHieuVaLoi kyHieu={o} loi={doc} />
                        : ct(o);
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
        <div {...chung} tabIndex={-1} {...langKhoi}
          className="my-5 pl-4 border-l-4 border-verso-200">
          <span className="chi-doc-man-hinh">
            {/* nhanMuc chứ không ghép tay: số hiệu "Luyện tập 2" đã tự đọc
                thành tên rồi, ghép nữa thành "Bài tập Luyện tập 2". */}
            {`${nhanMuc(k)}. `}
          </span>
          {k.vanBanDoc ? (
            <>
              <span aria-hidden="true">{ctNhin(k.vanBan ?? '')}</span>
              <span className="chi-doc-man-hinh">{ct(thanBaiTap(k))}</span>
            </>
          ) : ct(thanBaiTap(k))}
        </div>,
      );

    case 'chu-thich': {
      const so = soTuNeo(neo);
      return boc(
        <div {...chung} role="note" {...langKhoi} className="my-4 px-4 py-2 rounded-lg bg-giay-sau text-base">
          <span className="chi-doc-man-hinh">Chú thích{so ? ` ${so}` : ''}: </span>
          {ct(loiChuThich(k))}
          {so && (
            <a href={`#${neoDauChuThich(trang, so)}`}
              className="block mt-1 text-sm font-bold text-verso-700 min-h-[44px] inline-flex items-center gap-1.5">
              <span aria-hidden="true">↩</span> Quay lại chỗ đang đọc
            </a>
          )}
        </div>,
      );
    }

    case 'khung-luu-y':
      // role="note" chứ không phải <aside>: mỗi <aside aria-label="Khung lưu ý">
      // là một landmark, mà trang nào cũng có vài khung — danh sách landmark đầy
      // những mục trùng tên, người dùng trình đọc màn hình không dùng được nữa.
      return boc(
        <div {...chung} role="note" {...langKhoi} className="border-l-4 border-verso-600 pl-4 my-4">
          <span className="chi-doc-man-hinh">Khung lưu ý: </span>
          {ct(k.vanBan ?? '')}
        </div>,
      );

    default:
      return boc(<p {...chung}>{k.vanBan}</p>);
  }
};

