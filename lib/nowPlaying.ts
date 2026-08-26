'use client';

let cuoi: { id: string; nhan: string } = { id: '', nhan: '' };

export const ghiDangNghe = (id: string, nhan: string) => { cuoi = { id, nhan }; };
export const layDangNghe = () => cuoi;
