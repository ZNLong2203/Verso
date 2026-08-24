import type { MonHoc, LoaiKhoi } from './types';

export const MODEL_CHINH = 'gemini-3.7-flash';
export const MODEL_DU_PHONG = 'gemini-2.5-flash';

export const MON_HOC_INFO: Record<MonHoc, { ten: string; icon: string }> = {
  'toan':      { ten: 'Toán',        icon: '∑' },
  'ngu-van':   { ten: 'Ngữ văn',     icon: '✍' },
  'vat-ly':    { ten: 'Vật lý',      icon: '⚛' },
  'hoa-hoc':   { ten: 'Hoá học',     icon: '⚗' },
  'sinh-hoc':  { ten: 'Sinh học',    icon: '🧬' },
  'lich-su':   { ten: 'Lịch sử',     icon: '⏳' },
  'dia-ly':    { ten: 'Địa lý',      icon: '🗺' },
  'tieng-anh': { ten: 'Tiếng Anh',   icon: 'A' },
  'gdcd':      { ten: 'GDCD',        icon: '⚖' },
  'khac':      { ten: 'Môn khác',    icon: '📘' },
};

export const LOAI_KHOI_INFO: Record<LoaiKhoi, { ten: string; the: string }> = {
  'tieu-de':     { ten: 'Đề mục',      the: 'h2' },
  'van-ban':     { ten: 'Đoạn văn',    the: 'p' },
  'tho':         { ten: 'Thơ',         the: 'blockquote' },
  'hinh-anh':    { ten: 'Hình vẽ',     the: 'figure' },
  'cong-thuc':   { ten: 'Công thức',   the: 'div' },
  'bang':        { ten: 'Bảng',        the: 'table' },
  'bai-tap':     { ten: 'Bài tập',     the: 'section' },
  'chu-thich':   { ten: 'Chú thích',   the: 'aside' },
  'khung-luu-y': { ten: 'Khung lưu ý', the: 'aside' },
};

export const MIEN_TRU =
  'Verso là công cụ hỗ trợ chuyển đổi, không thay thế bản gốc. Giáo viên cần duyệt lại ' +
  'trước khi phát hành cho học sinh. Bản chuyển đổi chỉ dành cho người khuyết tật chữ in ' +
  'theo Điều 25a Luật Sở hữu trí tuệ và Nghị định 17/2023/NĐ-CP.';

export const STORAGE_KEY = 'verso:v1';

/** Giọng đọc tiếng Việt.
 *
 *  Chirp 3 HD là bậc cao nhất của Cloud Text-to-Speech, và vi-VN có 30 giọng
 *  riêng cho tiếng Việt — không phải giọng đa ngữ đọc kèm tiếng Việt. Đổi giọng
 *  chỉ cần sửa đúng dòng này; tệp đã lưu khoá theo tên giọng nên không lẫn nhau. */
export const GIONG_DOC = 'vi-VN-Chirp3-HD-Achernar';

/** Giọng cho phần tiếng Anh trong sách Tiếng Anh.
 *
 *  Cùng "nhân vật" Achernar với giọng Việt, nên chuyển qua lại giữa hai thứ tiếng
 *  nghe như MỘT người đang đọc, không phải hai người thay phiên. */
export const GIONG_DOC_EN = 'en-US-Chirp3-HD-Achernar';

/** Chỗ lưu giọng đã tổng hợp, khoá theo mã nội dung. */
export const THUNG_TIENG = process.env.VERSO_BUCKET_TIENG || 'verso-43e8b-tieng';

/** Bản đọc dùng làm ví dụ ở màn đầu.
 *
 *  Người mở Verso lần đầu gặp ngay một cái form hỏi tên tài liệu — chưa thấy sản
 *  phẩm làm được gì mà đã phải nhập liệu. Muốn nghe được kết quả phải đi hết tám
 *  thao tác và chờ Gemini đọc xong một trang. Đường tắt này cho họ nghe trước,
 *  hỏi sau. Đây là bản chuyển đổi THẬT, không phải màn dựng sẵn. */
export const MA_XEM_THU = 'ZDFZ9VWQ';
