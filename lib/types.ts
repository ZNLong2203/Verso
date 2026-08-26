
export type MonHoc =
  | 'toan' | 'ngu-van' | 'vat-ly' | 'hoa-hoc' | 'sinh-hoc'
  | 'lich-su' | 'dia-ly' | 'tieng-anh' | 'gdcd' | 'khac';

export type LoaiKhoi =
  | 'tieu-de'      // đề mục — tạo cấu trúc để nhảy nhanh
  | 'van-ban'      // đoạn văn xuôi thường
  | 'tho'          // thơ: phải giữ nguyên dòng và khổ
  | 'hinh-anh'     // hình vẽ, sơ đồ, bản đồ, ảnh chụp
  | 'cong-thuc'    // công thức toán / lý / hoá
  | 'bang'         // bảng biểu
  | 'bai-tap'      // đề bài tập, có số hiệu để nhảy tới
  | 'chu-thich'    // chú thích, giải nghĩa từ khó
  | 'khung-luu-y'; // hộp "Ghi nhớ", "Em có biết"

export type DoTinCay = 'cao' | 'trung-binh' | 'thap';

export interface BangDuLieu {
  tieuDeCot: string[];
  hang: string[][];
  hangDoc: string[][];
  tomTat: string;   // một câu mô tả bảng này nói về gì
}

export interface Khoi {
  id: string;
  loai: LoaiKhoi;
  thuTu: number;

  /** Văn bản nguyên văn — dùng cho tieu-de, van-ban, tho, bai-tap, chu-thich, khung-luu-y. */
  vanBan?: string;

  vanBanDoc?: string;

  /** Mô tả hình vẽ, viết như giáo viên giảng cho học sinh khiếm thị. */
  moTa?: string;

  /** Khung bao hình trên trang gốc: [ymin, xmin, ymax, xmax], chuẩn hoá 0–1000.
   *  Dùng để cắt đúng phần hình ra khỏi ảnh trang. */
  khungHinh?: [number, number, number, number];

  /** Ảnh hình đã cắt. Trong bản nháp là dataURL; sau khi phát hành là mã tệp đã
   *  lưu — ảnh không nhét vào tài liệu Firestore được, một tài liệu chỉ chứa 1 MB. */
  anhHinh?: string;
  maHinh?: string;

  /** Dạng đọc thành tiếng Việt của công thức.
   *  Ví dụ: "x mũ hai cộng hai x trừ ba bằng không". */
  docThanhLoi?: string;

  /** Ký hiệu gốc của công thức, để giáo viên sáng mắt đối chiếu. */
  kyHieuGoc?: string;

  bang?: BangDuLieu;

  /** Cấp đề mục 1–3, chỉ dùng cho loai = 'tieu-de'. */
  capTieuDe?: number;

  /** Số hiệu bài tập ("3", "3a", "Bài 12") — dùng làm mốc nhảy nhanh. */
  soBaiTap?: string;

  /** Chú thích này thuộc về từ nào trong văn bản. */
  thuocVe?: string;

  /** Số thứ tự của chú thích ("1", "2") — là thứ nối dấu [chú thích 1] trong bài
   *  với lời giải nghĩa ở chân trang. Thiếu nó thì bấm vào dấu chú thích không đi đâu cả. */
  soChuThich?: string;

  ngonNgu?: 'vi' | 'en';

  doTinCay: DoTinCay;
  ghiChu?: string;      // vì sao chưa chắc
  daDuyet: boolean;     // giáo viên đã xác nhận
  daSua: boolean;       // giáo viên đã sửa tay
}

export type TrangThaiTrang = 'cho' | 'dang-doc' | 'xong' | 'loi';

export interface Trang {
  id: string;
  soTrang: number;          // số trang IN TRÊN SÁCH, đọc được từ ảnh; 0 nếu không thấy
  /** Trang thứ mấy trong tệp PDF. KHÔNG dùng cho bản xuất — DAISY và EPUB phải nhảy
   *  theo số in trên sách giấy. */
  soTrangPdf?: number;
  thuTu: number;            // thứ tự người dùng tải lên
  anhGoc: string;           // dataURL bản thu nhỏ
  khoi: Khoi[];
  trangThai: TrangThaiTrang;
  loi?: string;
  anhKhongRo: boolean;
  ghiChuDocAnh: string;
}

export interface BanVerso {
  id: string;
  tieuDe: string;           // "Toán 9 — Chương 3: Hệ hai phương trình bậc nhất"
  monHoc: MonHoc;
  lop: number | null;
  nguon: string;            // nhà xuất bản / bộ sách
  nguoiChuyen: string;      // tên giáo viên / tình nguyện viên
  trang: Trang[];
  daXuatBan: boolean;
  maChiaSe: string;         // mã trong đường link công khai
  /** Chìa khoá riêng để mở lại bản này mà sửa. KHÔNG bao giờ hiện trên trang đọc. */
  maSua?: string;
  ngayTao: string;
  ngayCapNhat: string;
}

/* ---------------- Kết quả thô từ Gemini ---------------- */

export interface KhoiTho {
  loai: string;
  thuTu: number;
  vanBan: string;
  vanBanDoc: string;
  moTa: string;
  docThanhLoi: string;
  kyHieuGoc: string;
  bang: BangDuLieu | null;
  capTieuDe: number;
  soBaiTap: string;
  thuocVe: string;
  doTinCay: string;
  ghiChu: string;
  soChuThich: string;
  ngonNgu: string;
  khungHinh: number[] | null;
}

export interface KetQuaDocTrang {
  soTrang: number;
  monHocDoan: string;
  khoi: KhoiTho[];
  anhKhongRo: boolean;
  ghiChuDocAnh: string;
}
