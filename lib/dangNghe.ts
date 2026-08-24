'use client';

/** Phần vừa nghe gần nhất, dùng chung giữa trình nghe và ô báo lỗi.
 *
 *  Cần giữ lại SAU KHI dừng: luồng tự nhiên là nghe thấy sai → bấm Dừng → báo.
 *  Nếu chỉ dựa vào dấu tô sáng thì thao tác Dừng xoá mất đúng ngữ cảnh mà người
 *  ta vừa muốn báo, và góp ý về thành chung chung, thầy cô không biết chỗ nào. */
let cuoi: { id: string; nhan: string } = { id: '', nhan: '' };

export const ghiDangNghe = (id: string, nhan: string) => { cuoi = { id, nhan }; };
export const layDangNghe = () => cuoi;
