'use client';

import React from 'react';

const P: Record<string, React.ReactNode> = {
  tai: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 9 5-5 5 5M12 4v12" /></>,
  anh: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
  check: <path d="m4 12.5 5.5 5.5L20 7" />,
  canh: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  sua: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  xoa: <><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></>,
  lien: <><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>,
  sach: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
  phai: <path d="m9 18 6-6-6-6" />,
  trai: <path d="m15 18-6-6 6-6" />,
  cong: <path d="M12 5v14M5 12h14" />,
  dong: <path d="M18 6 6 18M6 6l12 12" />,
  mat: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  loa: <><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /></>,
};

export const Icon: React.FC<{ ten: string; co?: number; lop?: string }> = ({ ten, co = 20, lop = '' }) => (
  <svg width={co} height={co} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" className={lop} aria-hidden="true">{P[ten] ?? P.sach}</svg>
);

type NutProps = {
  children: React.ReactNode; onClick?: () => void;
  kieu?: 'chinh' | 'phu' | 'nhe' | 'nguy'; co?: 'lon' | 'vua' | 'nho';
  icon?: string; day?: boolean; tat?: boolean; lop?: string; type?: 'button' | 'submit';
};
export const Nut: React.FC<NutProps> = ({ children, onClick, kieu = 'chinh', co = 'vua', icon, day, tat, lop = '', type = 'button' }) => {
  const k = {
    chinh: 'bg-verso-700 text-white hover:bg-verso-800',
    phu: 'bg-white text-muc border-2 border-vien hover:border-verso-600 hover:text-verso-700',
    nhe: 'bg-verso-50 text-verso-800 hover:bg-verso-100',
    nguy: 'bg-loi-600 text-white hover:bg-loi-700',
  }[kieu];
  const c = { lon: 'text-base px-6 py-3.5', vua: 'text-sm px-4 py-2.5', nho: 'text-xs px-3 py-2' }[co];
  return (
    <button type={type} onClick={onClick} disabled={tat}
      className={`inline-flex items-center justify-center gap-2 font-bold rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none ${k} ${c} ${day ? 'w-full' : ''} ${lop}`}>
      {icon && <Icon ten={icon} co={co === 'lon' ? 20 : 16} />}{children}
    </button>
  );
};

export const The: React.FC<{ children: React.ReactNode; lop?: string }> = ({ children, lop = '' }) => (
  <div className={`bg-white rounded-xl border border-vien shadow-the ${lop}`}>{children}</div>
);

export const O: React.FC<{
  nhan: string; gt: string; doi: (v: string) => void;
  goiY?: string; kieu?: string; batBuoc?: boolean; id?: string;
}> = ({ nhan, gt, doi, goiY, kieu = 'text', batBuoc, id }) => {
  const tuId = React.useId();
  const idThat = id ?? tuId;
  return (
    <div>
      <label htmlFor={idThat} className="block text-sm font-bold text-muc-nhat mb-1.5">
        {nhan}{batBuoc && <span className="text-loi-600" aria-hidden="true"> *</span>}
        {batBuoc && <span className="chi-doc-man-hinh"> (bắt buộc)</span>}
      </label>
      <input id={idThat} type={kieu} value={gt} required={batBuoc} placeholder={goiY}
        onChange={(e) => doi(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-lg border-2 border-vien bg-white focus:border-verso-600 outline-none" />
    </div>
  );
};

export const Nhan: React.FC<{ children: React.ReactNode; kieu?: 'xong' | 'canh' | 'loi' | 'thuong' }> = ({ children, kieu = 'thuong' }) => {
  const k = {
    xong: 'bg-xong-50 text-xong-700 border-xong-200',
    canh: 'bg-can-kiem-50 text-can-kiem-700 border-can-kiem-200',
    loi: 'bg-loi-50 text-loi-700 border-loi-200',
    thuong: 'bg-giay-sau text-muc-nhat border-vien',
  }[kieu];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${k}`}>{children}</span>;
};

export const ThanhTienDo: React.FC<{ xong: number; tong: number; nhan: string }> = ({ xong, tong, nhan }) => (
  <div role="progressbar" aria-valuenow={xong} aria-valuemin={0} aria-valuemax={tong} aria-label={nhan}>
    <div className="flex justify-between text-sm font-bold mb-1.5">
      <span>{nhan}</span><span className="tabular-nums">{xong}/{tong}</span>
    </div>
    <div className="h-2 rounded-full bg-giay-sau overflow-hidden">
      <div className="h-full bg-verso-600 rounded-full transition-[width] duration-500"
        style={{ width: `${tong ? (xong / tong) * 100 : 0}%` }} />
    </div>
  </div>
);
