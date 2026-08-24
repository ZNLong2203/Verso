/** Verso — kiểu dữ liệu.
 *
 *  Một "bản Verso" là một tài liệu đã được chuyển sang dạng nghe được:
 *  BanVerso  →  nhiều Trang  →  nhiều Khoi (khối nội dung theo đúng thứ tự đọc).
 *
 *  Khối là đơn vị trung tâm. Mỗi khối biết mình là loại gì, nên trình đọc màn hình
 *  đọc đúng cách, và học sinh nhảy được tới đúng bài tập. */

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
  /** Dạng đọc được của từng ô, cùng kích thước với `hang`.
   *  Chỉ có khi bảng chứa công thức — ô "√2/2" thành "căn bậc hai của hai, trên hai".
   *  Trang HTML hiển thị `hang` cho người sáng mắt và đưa `hangDoc` cho trình đọc màn hình. */
  hangDoc: string[][];
  tomTat: string;   // một câu mô tả bảng này nói về gì
}

export interface Khoi {
  id: string;
  loai: LoaiKhoi;
  thuTu: number;

  /** Văn bản nguyên văn — dùng cho tieu-de, van-ban, tho, bai-tap, chu-thich, khung-luu-y. */
  vanBan?: string;

  /** Văn bản đó nhưng mọi ký hiệu toán học viết ở dạng đọc thành lời.
   *  Chỉ có khi trong câu có ký hiệu — sách thật rất hay viết công thức XEN TRONG câu
   *  ("chứng minh rằng sin²α + cos²α = 1"), lúc đó tách ra thành khối riêng sẽ làm
   *  vỡ mạch đọc, nên giữ nguyên câu và kèm thêm bản đọc được. */
  vanBanDoc?: string;

  /** Mô tả hình vẽ, viết như giáo viên giảng cho học sinh khiếm thị. */
  moTa?: string;

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

  /** Ngôn ngữ CHÍNH của khối: 'vi' hoặc 'en'. Mặc định 'vi'.
   *
   *  Phải có vì hai lẽ, cả hai đều nghiêm trọng như nhau:
   *  - Trình đọc màn hình đổi bộ phát âm theo thuộc tính lang. Thiếu nó, NVDA đọc
   *    câu tiếng Anh bằng âm tiếng Việt (WCAG 3.1.2 Ngôn ngữ của từng phần, mức AA).
   *  - Giọng đọc của Verso cũng phải đổi theo, nếu không thì đúng lại lỗi cũ nhưng
   *    ngược chiều: đọc tiếng Anh bằng giọng Việt. */
  ngonNgu?: 'vi' | 'en';

  doTinCay: DoTinCay;
  ghiChu?: string;      // vì sao chưa chắc
  daDuyet: boolean;     // giáo viên đã xác nhận
  daSua: boolean;       // giáo viên đã sửa tay
}

export type TrangThaiTrang = 'cho' | 'dang-doc' | 'xong' | 'loi';

export interface Trang {
  id: string;
  soTrang: number;          // số trang đọc được trên ảnh, 0 nếu không thấy
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
}

export interface KetQuaDocTrang {
  soTrang: number;
  monHocDoan: string;
  khoi: KhoiTho[];
  anhKhongRo: boolean;
  ghiChuDocAnh: string;
}
