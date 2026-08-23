/** Mã lỗi từ máy chủ → câu tiếng Việt cho giáo viên đọc. */
export const THONG_BAO_LOI: Record<string, string> = {
  THIEU_KHOA_API: 'Máy chủ chưa được cấp khoá Gemini hợp lệ. Người cài đặt cần kiểm tra lại.',
  THIEU_FIREBASE: 'Máy chủ chưa cấu hình nơi lưu trữ, nên chưa xuất bản được.',
  HET_QUOTA: 'Hôm nay đã dùng hết lượt đọc miễn phí. Thử lại sau nhé.',
  BI_CHAN: 'Nội dung trang này chưa xử lý được. Thử chụp lại hoặc bỏ qua trang này.',
  QUA_LON: 'Tài liệu quá lớn để lưu trong một bản. Hãy tách thành nhiều chương nhỏ hơn.',
  CON_KHOI_CHUA_DUYET: 'Còn phần chưa được duyệt. Xem lại rồi mới xuất bản được.',
  THIEU_TIEU_DE: 'Chưa có tên tài liệu.',
  CHUA_CO_TRANG: 'Chưa có trang nào để xuất bản.',
  LOI_MODEL: 'Chưa đọc được lúc này. Thử lại sau một chút.',
  MAT_MANG: 'Mất kết nối mạng. Kiểm tra rồi thử lại.',
};
