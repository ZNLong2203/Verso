'use client';

import React from 'react';
import { Nut, The, Icon, Nhan, ThanhTienDo } from './ui';
import { useVerso } from '@/lib/store';
import { nenAnh, anhNho } from '@/lib/anh';
import { THONG_BAO_LOI } from '@/lib/loi';

export const BuocTaiTrang: React.FC = () => {
  const { ban, themTrang, thayTrang, xoaTrang, doiThuTuTrang, datBuoc } = useVerso();
  const [dangChay, setDangChay] = React.useState(false);
  const [tienDo, setTienDo] = React.useState({ xong: 0, tong: 0 });
  const [loi, setLoi] = React.useState<string[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const docLaiRef = React.useRef<HTMLInputElement>(null);
  // ref chứ không phải state: nút bấm mở ngay hộp thoại chọn tệp, sự kiện change
  // có thể về TRƯỚC khi React dựng lại — lúc đó state mới chưa tới tay hàm xử lý.
  const dangThay = React.useRef('');

  const xuLy = async (files: FileList | File[] | null) => {
    if (!files?.length) return;
    const ds = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!ds.length) return;

    setDangChay(true); setLoi([]); setTienDo({ xong: 0, tong: ds.length });

    // Xử lý TUẦN TỰ, không song song: mỗi trang là một lượt gọi model khá nặng,
    // bắn cùng lúc dễ chạm hạn mức và mất luôn cả loạt.
    for (let i = 0; i < ds.length; i++) {
      try {
        const a = await nenAnh(ds[i]);
        const r = await fetch('/api/doc-trang', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anhBase64: a.base64, mimeType: a.mimeType, monHoc: ban.monHoc }),
        });
        const kq = await r.json();
        if (kq.loi) { setLoi((l) => [...l, `${ds[i].name}: ${THONG_BAO_LOI[kq.loi] ?? kq.loi}`]); }
        else { themTrang(kq, await anhNho(a.dataUrl)); }
      } catch {
        setLoi((l) => [...l, `${ds[i].name}: không đọc được tệp này`]);
      }
      setTienDo({ xong: i + 1, tong: ds.length });
    }
    setDangChay(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  /** Đọc lại một trang, giữ nguyên vị trí trong sách.
   *
   *  Ảnh gốc không được giữ lại (chỉ có bản thu nhỏ để xem), nên phải chọn lại
   *  tệp — nhưng trang mới thay đúng chỗ trang cũ, không rơi xuống cuối. */
  const docLai = async (files: FileList | null) => {
    const id = dangThay.current;
    const f = files?.[0];
    if (docLaiRef.current) docLaiRef.current.value = '';
    dangThay.current = '';
    if (!id || !f?.type.startsWith('image/')) return;

    setDangChay(true); setLoi([]); setTienDo({ xong: 0, tong: 1 });
    try {
      const a = await nenAnh(f);
      const r = await fetch('/api/doc-trang', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anhBase64: a.base64, mimeType: a.mimeType, monHoc: ban.monHoc }),
      });
      const kq = await r.json();
      if (kq.loi) setLoi([`${f.name}: ${THONG_BAO_LOI[kq.loi] ?? kq.loi}`]);
      else thayTrang(id, kq, await anhNho(a.dataUrl));
    } catch {
      setLoi([`${f.name}: không đọc được tệp này`]);
    }
    setTienDo({ xong: 1, tong: 1 });
    setDangChay(false);
  };

  /** Thử ngay bằng trang sách mẫu.
   *
   *  Người mở Verso lần đầu hầu như không có sẵn ảnh trang sách trong máy, mà
   *  chưa thấy kết quả thì không hiểu công cụ này làm gì. Hai trang mẫu dưới đây
   *  do chính dự án soạn và vẽ — không phải bản chụp sách có bản quyền. */
  const dungMau = async (ten: string, nhan: string) => {
    setDangChay(true); setLoi([]); setTienDo({ xong: 0, tong: 1 });
    try {
      const r = await fetch(`/mau/${ten}.png`);
      if (!r.ok) throw new Error('khong-tai-duoc');
      const f = new File([await r.blob()], `${nhan}.png`, { type: 'image/png' });
      setDangChay(false);
      await xuLy([f]);
    } catch {
      setDangChay(false);
      setLoi(['Không tải được trang mẫu. Kiểm tra kết nối mạng rồi thử lại.']);
    }
  };

  const tongKhoi = ban.trang.reduce((s, t) => s + t.khoi.length, 0);

  return (
    <div className="max-w-3xl grid gap-5">
      <The lop="p-6">
        <h2 className="text-xl font-extrabold m-0">Tải trang sách lên</h2>
        <p className="text-muc-nhat mt-2 leading-relaxed">
          Chọn nhiều trang một lúc cũng được. Verso đọc lần lượt từng trang và giữ đúng thứ tự
          bạn chọn. Ảnh chụp bằng điện thoại dùng tốt, miễn là <b>chụp thẳng, đủ sáng, thấy hết
          bốn góc trang</b>.
        </p>

        <label className={`mt-5 block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dangChay ? 'border-vien bg-giay-sau pointer-events-none opacity-60' : 'border-verso-200 bg-verso-50 hover:border-verso-600'
        }`}>
          <input ref={fileRef} type="file" accept="image/*" multiple className="chi-doc-man-hinh"
            onChange={(e) => xuLy(e.target.files)} disabled={dangChay} />
          <span className="inline-flex flex-col items-center gap-2 text-verso-700">
            <Icon ten="tai" co={34} />
            <span className="font-extrabold text-base">
              {dangChay ? 'Đang đọc…' : 'Chọn ảnh trang sách'}
            </span>
            <span className="text-sm text-muc-mo font-normal">
              JPG hoặc PNG · chọn được nhiều tệp cùng lúc
            </span>
          </span>
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muc-mo">Chưa có ảnh trang sách?</span>
          <button type="button" disabled={dangChay} onClick={() => dungMau('toan-9', 'Trang mẫu Toán 9')}
            className="text-sm font-bold text-verso-700 underline underline-offset-2 min-h-[44px] px-2 rounded
                       hover:bg-verso-50 disabled:opacity-50 disabled:no-underline">
            Thử trang mẫu Toán 9
          </button>
          <span aria-hidden="true" className="text-muc-mo">·</span>
          <button type="button" disabled={dangChay} onClick={() => dungMau('ngu-van-9', 'Trang mẫu Ngữ văn 9')}
            className="text-sm font-bold text-verso-700 underline underline-offset-2 min-h-[44px] px-2 rounded
                       hover:bg-verso-50 disabled:opacity-50 disabled:no-underline">
            Thử trang mẫu Ngữ văn 9
          </button>
        </div>

        {dangChay && (
          <div className="mt-5">
            <ThanhTienDo xong={tienDo.xong} tong={tienDo.tong} nhan="Đang đọc trang" />
            <p className="text-sm text-muc-mo mt-2">Mỗi trang mất khoảng 5–15 giây. Đừng đóng tab.</p>
          </div>
        )}

        {loi.length > 0 && (
          <div role="alert" className="mt-5 p-4 rounded-lg bg-loi-50 border border-loi-200">
            <p className="font-bold text-loi-700 m-0 mb-1">Có {loi.length} trang chưa đọc được</p>
            <ul className="m-0 pl-5 text-sm text-muc-nhat">{loi.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
        )}
      </The>

      {ban.trang.length > 0 && (
        <The lop="p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-base font-extrabold m-0">
              Đã đọc {ban.trang.length} trang · {tongKhoi} phần nội dung
            </h3>
          </div>
          {ban.trang.length > 1 && (
            <p className="text-sm text-muc-mo mb-3">
              Thứ tự dưới đây là thứ tự học sinh sẽ nghe. Trang nào đọc chưa tốt thì bấm
              <b> Đọc lại</b> — trang mới thay đúng chỗ trang cũ, không phải xếp lại.
            </p>
          )}
          {/* Một ô chọn tệp dùng chung cho mọi nút Đọc lại — dangThay giữ trang nào đang thay */}
          <input ref={docLaiRef} type="file" accept="image/*" className="chi-doc-man-hinh"
            aria-hidden="true" tabIndex={-1} onChange={(e) => docLai(e.target.files)} />

          <ul className="grid gap-2 m-0 p-0 list-none">
            {ban.trang.map((t, idx) => {
              const hinh = t.khoi.filter((k) => k.loai === 'hinh-anh').length;
              const canKiem = t.khoi.filter((k) => !k.daDuyet).length;
              return (
                <li key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-vien-nhat">
                  {t.anhGoc
                    ? <img src={t.anhGoc} alt="" className="w-12 h-16 object-cover rounded border border-vien" />
                    : <div className="w-12 h-16 rounded bg-giay-sau grid place-items-center text-muc-mo"><Icon ten="anh" co={18} /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold m-0 text-sm">
                      Trang {t.soTrang || t.thuTu}{t.soTrang ? '' : ' (không thấy số trang)'}
                    </p>
                    <p className="text-sm text-muc-mo m-0 flex flex-wrap gap-2 mt-1">
                      <span>{t.khoi.length} phần</span>
                      {hinh > 0 && <span>· {hinh} hình đã mô tả</span>}
                      {t.anhKhongRo && <Nhan kieu="canh">⚠ ảnh khó đọc</Nhan>}
                      {canKiem > 0 && <Nhan kieu="canh">{canKiem} phần cần kiểm</Nhan>}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => doiThuTuTrang(t.id, -1)} disabled={idx === 0}
                      aria-label={`Đưa trang ${t.soTrang || t.thuTu} lên trước`}
                      className="w-10 h-10 grid place-items-center rounded-lg text-muc-mo hover:text-verso-700 hover:bg-verso-50 disabled:opacity-25 disabled:pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m18 15-6-6-6 6" />
                      </svg>
                    </button>
                    <button onClick={() => doiThuTuTrang(t.id, 1)} disabled={idx === ban.trang.length - 1}
                      aria-label={`Đưa trang ${t.soTrang || t.thuTu} xuống sau`}
                      className="w-10 h-10 grid place-items-center rounded-lg text-muc-mo hover:text-verso-700 hover:bg-verso-50 disabled:opacity-25 disabled:pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    <button onClick={() => { dangThay.current = t.id; docLaiRef.current?.click(); }}
                      disabled={dangChay}
                      aria-label={`Đọc lại trang ${t.soTrang || t.thuTu} bằng ảnh khác`}
                      title="Đọc lại trang này"
                      className="w-10 h-10 grid place-items-center rounded-lg text-muc-mo hover:text-verso-700 hover:bg-verso-50 disabled:opacity-25 disabled:pointer-events-none">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" />
                      </svg>
                    </button>
                    <button onClick={() => xoaTrang(t.id)} aria-label={`Xoá trang ${t.soTrang || t.thuTu}`}
                      className="w-10 h-10 grid place-items-center rounded-lg text-muc-mo hover:text-loi-600 hover:bg-loi-50">
                      <Icon ten="xoa" co={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </The>
      )}

      <div className="flex gap-3">
        <Nut kieu="phu" icon="trai" onClick={() => datBuoc('thong-tin')}>Quay lại</Nut>
        <Nut co="lon" icon="phai" onClick={() => datBuoc('duyet')} tat={!ban.trang.length || dangChay}>
          Tiếp — duyệt nội dung
        </Nut>
      </div>
    </div>
  );
};
