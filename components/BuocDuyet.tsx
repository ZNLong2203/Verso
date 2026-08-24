'use client';

import React from 'react';
import { Nut, The, Icon, Nhan, ThanhTienDo } from './ui';
import { useVerso } from '@/lib/store';
import { nhanMuc } from '@/lib/neo';
import { LOAI_KHOI_INFO } from '@/lib/constants';
import { THONG_BAO_LOI } from '@/lib/loi';
import type { Khoi, Trang } from '@/lib/types';
import { loiDocCuaKhoi } from '@/lib/loiDoc';
import { taiTieng, LoiTieng, THONG_BAO_TIENG } from '@/lib/tiengKhach';
import { SuaBang } from './SuaBang';

const TinCay: React.FC<{ k: Khoi }> = ({ k }) =>
  k.doTinCay === 'cao' ? null : (
    <Nhan kieu={k.doTinCay === 'thap' ? 'loi' : 'canh'}>
      {k.doTinCay === 'thap' ? '⚠ chưa chắc' : '~ nên xem lại'}
    </Nhan>
  );

/** Nghe thử đúng thứ học sinh sẽ nghe.
 *
 *  Đây là lỗ hổng chất lượng lớn nhất trước đây: giáo viên duyệt mô tả hình bằng MẮT,
 *  nhưng thứ học sinh nhận là ÂM THANH. Đọc thấy trôi chảy không có nghĩa nghe lên trôi chảy —
 *  nhất là với công thức, nơi một dấu đọc sai làm hỏng cả bài. */
/** Nghe thử ĐÚNG giọng học sinh sẽ nghe.
 *
 *  Dùng chung endpoint với trang đọc, nên nghe ở đây khớp một-một với thứ phát ra
 *  cho học sinh — nếu không thì việc "nghe thử để kiểm" mất hết ý nghĩa. */
const NutNgheThu: React.FC<{ k: Khoi }> = ({ k }) => {
  const [trangThai, setTrangThai] = React.useState<'nghi' | 'tai' | 'doc'>('nghi');
  const [loi, setLoi] = React.useState('');
  const may = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => () => { may.current?.pause(); }, []);

  const noiDoc = loiDocCuaKhoi(k);
  if (!noiDoc.trim()) return null;

  const bam = async () => {
    if (trangThai !== 'nghi') { may.current?.pause(); setTrangThai('nghi'); return; }
    setLoi('');
    setTrangThai('tai');
    try {
      const nguon = await taiTieng(noiDoc);
      const a = may.current ?? new Audio();
      may.current = a;
      a.src = nguon;
      a.onended = () => setTrangThai('nghi');
      a.onerror = () => { setLoi(THONG_BAO_TIENG.LOI_TIENG); setTrangThai('nghi'); };
      await a.play();
      setTrangThai('doc');
    } catch (e) {
      setLoi(THONG_BAO_TIENG[(e as LoiTieng)?.ma] ?? THONG_BAO_TIENG.LOI_TIENG);
      setTrangThai('nghi');
    }
  };

  const dangChay = trangThai !== 'nghi';
  return (
    <>
      <button onClick={bam}
        aria-label={dangChay ? 'Dừng nghe thử' : 'Nghe thử phần này như học sinh sẽ nghe'}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold border transition-colors ${
          dangChay ? 'bg-verso-700 border-verso-700 text-white' : 'bg-white border-vien text-verso-700 hover:border-verso-600'
        }`}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {dangChay ? <rect x="6" y="6" width="12" height="12" rx="1" /> : <path d="M8 5v14l11-7z" />}
        </svg>
        {trangThai === 'tai' ? 'Đang tạo…' : dangChay ? 'Dừng' : 'Nghe thử'}
      </button>
      {loi && <span role="alert" className="text-xs font-semibold text-loi-700">{loi}</span>}
    </>
  );
};

const OSua: React.FC<{ nhan: string; gt: string; doi: (v: string) => void; dong?: number }> =
  ({ nhan, gt, doi, dong = 3 }) => {
    const id = React.useId();
    return (
      <div className="mt-2">
        <label htmlFor={id} className="block text-xs font-bold text-muc-mo mb-1">{nhan}</label>
        <textarea id={id} value={gt} rows={dong} onChange={(e) => doi(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-vien bg-white focus:border-verso-600 outline-none text-sm leading-relaxed resize-y" />
      </div>
    );
  };

const KhoiSua: React.FC<{ trang: Trang; k: Khoi }> = ({ trang, k }) => {
  const { suaKhoi, xoaKhoi } = useVerso();
  const [moRong, setMoRong] = React.useState(false);
  const sua = (p: Partial<Khoi>) => suaKhoi(trang.id, k.id, { ...p, daSua: true });
  const info = LOAI_KHOI_INFO[k.loai];

  const xemNhanh =
    k.loai === 'hinh-anh' ? k.moTa
    : k.loai === 'cong-thuc' ? `${k.kyHieuGoc}  →  ${k.docThanhLoi}`
    : k.loai === 'bang' ? k.bang?.tomTat
    : k.vanBan;

  return (
    <li className={`rounded-lg border p-3.5 ${k.daDuyet ? 'border-vien-nhat bg-white' : 'border-can-kiem-200 bg-can-kiem-50'}`}>
      <div className="flex items-start gap-3">
        <label className="flex items-center gap-2 shrink-0 cursor-pointer pt-0.5">
          <input type="checkbox" checked={k.daDuyet} onChange={(e) => suaKhoi(trang.id, k.id, { daDuyet: e.target.checked })}
            className="w-4 h-4 accent-verso-700" />
          <span className="chi-doc-man-hinh">Duyệt phần {info.ten}</span>
        </label>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Nhan>{info.ten}</Nhan>
            {k.soBaiTap && <Nhan>{nhanMuc(k)}</Nhan>}
            <TinCay k={k} />
            {k.daSua && <Nhan kieu="xong">đã sửa</Nhan>}
            <NutNgheThu k={k} />
          </div>

          {k.ghiChu && (
            <p className="text-xs text-can-kiem-700 mt-1.5 mb-0 font-semibold">⚠ {k.ghiChu}</p>
          )}

          <p className={`text-sm mt-2 mb-0 leading-relaxed ${moRong ? '' : 'line-clamp-3'} ${k.loai === 'tho' ? 'whitespace-pre-wrap italic' : ''}`}>
            {xemNhanh}
          </p>

          {moRong && (
            <div className="mt-3 pt-3 border-t border-vien-nhat">
              {k.loai === 'hinh-anh' && (
                <OSua nhan="Mô tả hình — học sinh chỉ biết hình này qua đoạn văn dưới đây" dong={5}
                  gt={k.moTa ?? ''} doi={(v) => sua({ moTa: v })} />
              )}
              {k.loai === 'cong-thuc' && (
                <>
                  <OSua nhan="Ký hiệu như trên sách" dong={1} gt={k.kyHieuGoc ?? ''} doi={(v) => sua({ kyHieuGoc: v })} />
                  <OSua nhan="Đọc thành lời — trình đọc màn hình sẽ đọc đúng dòng này" dong={2}
                    gt={k.docThanhLoi ?? ''} doi={(v) => sua({ docThanhLoi: v })} />
                </>
              )}
              {k.loai === 'chu-thich' && (
                <>
                  <OSua nhan="Chú thích này giải nghĩa từ nào" dong={1} gt={k.thuocVe ?? ''} doi={(v) => sua({ thuocVe: v })} />
                  {/* Số này nối dấu [chú thích 1] trong bài với lời giải nghĩa ở đây.
                      Sai số thì học sinh bấm vào dấu chú thích mà không tới được đâu cả. */}
                  <OSua nhan="Số chú thích — phải khớp với dấu [chú thích …] trong bài" dong={1}
                    gt={k.soChuThich ?? ''} doi={(v) => sua({ soChuThich: v.trim() })} />
                </>
              )}
              {k.loai === 'bai-tap' && (
                // Số hiệu là mốc để học sinh nhảy thẳng tới bài thầy cô giao.
                <OSua nhan="Số hiệu bài — mốc để nhảy nhanh tới đúng bài" dong={1}
                  gt={k.soBaiTap ?? ''} doi={(v) => sua({ soBaiTap: v.trim() })} />
              )}
              {k.loai !== 'hinh-anh' && k.loai !== 'cong-thuc' && k.loai !== 'bang' && (
                <>
                  <OSua nhan={k.loai === 'tho' ? 'Nội dung thơ — giữ nguyên từng dòng' : 'Nội dung'}
                    dong={k.loai === 'tho' ? 8 : 4} gt={k.vanBan ?? ''} doi={(v) => sua({ vanBan: v })} />
                  {k.vanBanDoc && (
                    <OSua nhan="Bản đọc thành lời — có ký hiệu toán trong câu, trình đọc màn hình sẽ đọc dòng này"
                      dong={4} gt={k.vanBanDoc} doi={(v) => sua({ vanBanDoc: v })} />
                  )}
                </>
              )}
              {k.loai === 'bang' && k.bang && (
                <SuaBang bang={k.bang} doi={(b) => sua({ bang: b })} />
              )}
              <button onClick={() => xoaKhoi(trang.id, k.id)}
                className="mt-3 text-xs font-bold text-muc-mo hover:text-loi-600 inline-flex items-center gap-1.5">
                <Icon ten="xoa" co={13} /> Xoá phần này
              </button>
            </div>
          )}

          <button onClick={() => setMoRong((v) => !v)} aria-expanded={moRong}
            className="mt-2 text-xs font-bold text-verso-700 inline-flex items-center gap-1">
            <Icon ten={moRong ? 'dong' : 'sua'} co={13} />
            {moRong ? 'Thu gọn' : 'Xem và sửa'}
          </button>
        </div>
      </div>
    </li>
  );
};

export const BuocDuyet: React.FC = () => {
  const { ban, datBuoc, soChuaDuyet, duyetTatCa, datMaXuatBan } = useVerso();
  const [chiCanKiem, setChiCanKiem] = React.useState(true);
  const [dangXuatBan, setDangXuatBan] = React.useState(false);
  const [loi, setLoi] = React.useState('');

  const tongKhoi = ban.trang.reduce((s, t) => s + t.khoi.length, 0);
  const daDuyet = tongKhoi - soChuaDuyet;

  const xuatBan = async () => {
    setDangXuatBan(true); setLoi('');
    try {
      const r = await fetch('/api/xuat-ban', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ban),
      });
      const d = await r.json();
      if (d.loi) { setLoi(THONG_BAO_LOI[d.loi] ?? d.loi); return; }
      datMaXuatBan(d.maChiaSe);
      datBuoc('xong');
    } catch {
      setLoi(THONG_BAO_LOI.MAT_MANG);
    } finally {
      setDangXuatBan(false);
    }
  };

  return (
    <div className="max-w-3xl grid gap-5">
      <The lop="p-6">
        <h2 className="text-xl font-extrabold m-0">Duyệt trước khi phát hành</h2>
        <p className="text-muc-nhat mt-2 leading-relaxed">
          Học sinh khiếm thị <b>không có cách nào tự đối chiếu với sách gốc</b>. Sai sót lọt ra là
          các em học sai mà không biết. Verso đã tự đánh dấu những phần nó không chắc — bạn xem
          lại đúng những chỗ đó là đủ.
        </p>
        <p className="mt-3 text-sm text-muc-nhat bg-verso-50 border border-verso-200 rounded-lg px-3.5 py-2.5">
          💡 Với hình vẽ và công thức, hãy bấm <b>Nghe thử</b> thay vì chỉ đọc bằng mắt —
          đọc thấy trôi chảy không có nghĩa nghe lên trôi chảy.
        </p>
        <div className="mt-5"><ThanhTienDo xong={daDuyet} tong={tongKhoi} nhan="Phần đã duyệt" /></div>

        {soChuaDuyet > 0 && (
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <Nut kieu="phu" co="nho" icon="check" onClick={duyetTatCa}>Duyệt tất cả {soChuaDuyet} phần còn lại</Nut>
            <span className="text-xs text-muc-mo">Chỉ nên dùng khi bạn đã đọc qua toàn bộ</span>
          </div>
        )}
      </The>

      <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
        <input type="checkbox" checked={chiCanKiem} onChange={(e) => setChiCanKiem(e.target.checked)}
          className="w-4 h-4 accent-verso-700" />
        Chỉ hiện phần cần kiểm ({soChuaDuyet})
      </label>

      {ban.trang.map((t) => {
        const ds = chiCanKiem ? t.khoi.filter((k) => !k.daDuyet) : t.khoi;
        if (!ds.length) return null;
        return (
          <The key={t.id} lop="p-5">
            <div className="flex items-center gap-3 mb-3">
              {t.anhGoc && <img src={t.anhGoc} alt="" className="w-10 h-14 object-cover rounded border border-vien" />}
              <h3 className="text-base font-extrabold m-0">
                Trang {t.soTrang || t.thuTu}
                <span className="font-normal text-muc-mo text-sm ml-2">{ds.length}/{t.khoi.length} phần</span>
              </h3>
            </div>
            <ul className="grid gap-2 m-0 p-0 list-none">
              {ds.map((k) => <KhoiSua key={k.id} trang={t} k={k} />)}
            </ul>
          </The>
        );
      })}

      {chiCanKiem && soChuaDuyet === 0 && (
        <The lop="p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-xong-50 text-xong-700 grid place-items-center mx-auto mb-3">
            <Icon ten="check" co={26} />
          </div>
          <p className="font-extrabold m-0">Đã duyệt hết {tongKhoi} phần</p>
          <p className="text-muc-mo text-sm mt-1 mb-0">Bỏ tick ở trên để xem lại toàn bộ nội dung.</p>
        </The>
      )}

      {loi && <div role="alert" className="p-4 rounded-lg bg-loi-50 border border-loi-200 text-loi-700 font-semibold">{loi}</div>}

      <div className="flex gap-3 flex-wrap">
        <Nut kieu="phu" icon="trai" onClick={() => datBuoc('tai-trang')}>Quay lại</Nut>
        <Nut co="lon" icon="lien" onClick={xuatBan} tat={soChuaDuyet > 0 || dangXuatBan}>
          {dangXuatBan ? 'Đang xuất bản…' : 'Xuất bản và lấy link'}
        </Nut>
        {soChuaDuyet > 0 && (
          <span className="text-sm text-muc-mo self-center">Còn {soChuaDuyet} phần chưa duyệt</span>
        )}
      </div>
    </div>
  );
};
