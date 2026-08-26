import type { Khoi, KhoiTho, KetQuaDocTrang, LoaiKhoi, DoTinCay, Trang } from './types';

export const taoId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const LOAI_HOP_LE: LoaiKhoi[] = [
  'tieu-de', 'van-ban', 'tho', 'hinh-anh', 'cong-thuc', 'bang', 'bai-tap', 'chu-thich', 'khung-luu-y',
];
const TIN_CAY_HOP_LE: DoTinCay[] = ['cao', 'trung-binh', 'thap'];

/** Biến kết quả thô từ model thành khối dùng được, và tự bảo vệ trước dữ liệu lệch chuẩn. */
export function chuanHoaKhoi(tho: KhoiTho, i: number): Khoi {
  const loai = (LOAI_HOP_LE.includes(tho.loai as LoaiKhoi) ? tho.loai : 'van-ban') as LoaiKhoi;
  const doTinCay = (TIN_CAY_HOP_LE.includes(tho.doTinCay as DoTinCay) ? tho.doTinCay : 'trung-binh') as DoTinCay;

  const bang = tho.bang && Array.isArray(tho.bang.hang)
    ? {
        tieuDeCot: tho.bang.tieuDeCot ?? [],
        hang: tho.bang.hang ?? [],
        // Chỉ giữ hangDoc khi nó khớp đúng kích thước với hang — lệch một ô là
        // trình đọc màn hình đọc sai ô, còn tệ hơn không có.
        hangDoc:
          Array.isArray(tho.bang.hangDoc) &&
          tho.bang.hangDoc.length === (tho.bang.hang?.length ?? 0) &&
          tho.bang.hangDoc.every((h, r) => h.length === (tho.bang!.hang[r]?.length ?? 0))
            ? tho.bang.hangDoc
            : [],
        tomTat: tho.bang.tomTat ?? '',
      }
    : undefined;

  return {
    id: taoId(),
    loai,
    thuTu: tho.thuTu || i + 1,
    vanBan: tho.vanBan || undefined,
    vanBanDoc: tho.vanBanDoc && tho.vanBanDoc !== tho.vanBan ? tho.vanBanDoc : undefined,
    moTa: tho.moTa || undefined,
    docThanhLoi: tho.docThanhLoi || undefined,
    kyHieuGoc: tho.kyHieuGoc || undefined,
    bang,
    capTieuDe: tho.capTieuDe || undefined,
    soBaiTap: tho.soBaiTap || undefined,
    thuocVe: tho.thuocVe || undefined,
    soChuThich: tho.soChuThich || undefined,
    ngonNgu: tho.ngonNgu === 'en' ? 'en' : undefined,
    anhHinh: (tho as { anhHinh?: string }).anhHinh || undefined,
    khungHinh: Array.isArray(tho.khungHinh) && tho.khungHinh.length === 4
      && tho.khungHinh.every((n) => Number.isFinite(n))
      ? (tho.khungHinh.map(Number) as [number, number, number, number])
      : undefined,
    doTinCay,
    ghiChu: tho.ghiChu || undefined,
    // Hình vẽ và công thức LUÔN phải qua mắt giáo viên, dù model có tự tin đến đâu.
    //
    // Lý do: đây là hai chỗ mà học sinh khiếm thị KHÔNG CÓ CÁCH NÀO tự phát hiện sai.
    // Một lỗi chính tả trong đoạn văn thì đọc lên là thấy ngợ; còn mô tả sai một cạnh
    // tam giác, hay đọc sai một dấu trong công thức, thì các em cứ thế học theo.
    // Model "tự tin" không có nghĩa là model đúng.
    daDuyet:
      loai === 'hinh-anh' || loai === 'cong-thuc' || !!tho.vanBanDoc
        ? false                     // có ký hiệu toán → bắt buộc giáo viên xem
        : doTinCay === 'cao',
    daSua: false,
  };
}

export function chuanHoaTrang(
  kq: KetQuaDocTrang, thuTu: number, anhGoc: string, soTrangPdf?: number,
): Trang {
  return {
    id: taoId(),
    soTrang: kq.soTrang || 0,
    ...(soTrangPdf ? { soTrangPdf } : {}),
    thuTu,
    anhGoc,
    khoi: (kq.khoi ?? []).map(chuanHoaKhoi).sort((a, b) => a.thuTu - b.thuTu),
    trangThai: 'xong',
    anhKhongRo: !!kq.anhKhongRo,
    ghiChuDocAnh: kq.ghiChuDocAnh ?? '',
  };
}

/** Tên một trang, hiện cho giáo viên xem.
 *
 *  Luôn ưu tiên SỐ IN TRÊN SÁCH, vì đó là con số thầy cô và học sinh dùng để gọi
 *  nhau ("làm bài trang 68"), và cũng là con số đi vào DAISY với EPUB.
 *
 *  Số trang PDF gần như luôn lệch — tệp có bìa và mục lục ở đầu. Chọn trang 70 mà
 *  kết quả ghi trang 68 thì trông như đọc nhầm, nên phải nói ra chỗ lệch chứ không
 *  giấu đi, và cũng không được lấy số PDF thay thế. */
export function tenTrang(t: Trang): { chinh: string; phu?: string } {
  if (t.soTrang) {
    return {
      chinh: `Trang ${t.soTrang}`,
      phu: t.soTrangPdf && t.soTrangPdf !== t.soTrang
        ? `số in trên sách · tách từ trang ${t.soTrangPdf} của PDF` : undefined,
    };
  }
  if (t.soTrangPdf) {
    return { chinh: `Trang ${t.soTrangPdf} của PDF`, phu: 'không thấy số in trên sách' };
  }
  return { chinh: `Trang ${t.thuTu}`, phu: 'không thấy số in trên sách' };
}

/** Số khối giáo viên còn phải xem trước khi được phép xuất bản. */
export const demChuaDuyet = (trang: Trang[]) =>
  trang.flatMap((t) => t.khoi).filter((k) => !k.daDuyet).length;
