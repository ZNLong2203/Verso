/** Xử lý chuỗi tiếng Việt — dùng được ở cả máy chủ lẫn trình duyệt. */

export function boDau(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // bỏ dấu thanh và dấu mũ
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')  // đ không tách được bằng NFD
    .toLowerCase()
    .trim();
}

export const maSo = (s: string) =>
  boDau(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
