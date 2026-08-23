/** Xử lý chuỗi tiếng Việt — dùng được ở cả máy chủ lẫn trình duyệt. */

/** Bỏ dấu tiếng Việt.
 *  Giáo viên gõ "tam giac" phải tìm ra "tam giác" — gõ có dấu trên máy tính
 *  chậm hơn nhiều, gần như không ai gõ đủ dấu khi tìm nhanh. */
export function boDau(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // bỏ dấu thanh và dấu mũ
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')  // đ không tách được bằng NFD
    .toLowerCase()
    .trim();
}

/** "Bài 12" hay "3a" → mã dùng được trong id và href.
 *  Phải bỏ dấu trước, nếu không "Bài 4.2" thành "b-i-4-2" — vừa xấu vừa dễ
 *  đụng nhau giữa hai số hiệu khác nhau. */
export const maSo = (s: string) =>
  boDau(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
