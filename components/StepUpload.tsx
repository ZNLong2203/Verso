'use client';

import React from 'react';
import { Nut, The, Icon, Nhan, ThanhTienDo } from './ui';
import { useVerso } from '@/lib/store';
import { nenAnh, anhNho, catHinh } from '@/lib/image';
import { moPdf, docKhoangTrang, gopKhoang, TOI_DA_MOI_LAN, type TaiLieuPdf } from '@/lib/pdf';
import { XemTruocPdf, XemTruocAnh, type AnhXem } from './FilePreview';
import { THONG_BAO_LOI } from '@/lib/errors';
import { tenTrang } from '@/lib/normalize';
import type { KetQuaDocTrang } from '@/lib/types';

/** Cắt mọi hình trên trang ra khỏi ảnh gốc, ngay tại máy giáo viên.
 *
 *  Cắt ở đây chứ không ở máy chủ: ảnh trang gốc vốn đã nằm sẵn trong trình duyệt,
 *  gửi đi rồi gửi về chỉ tốn băng thông của một người đang chờ. */
async function catCacHinh(kq: KetQuaDocTrang, anhTrang: string): Promise<KetQuaDocTrang> {
  const khoi = await Promise.all((kq.khoi ?? []).map(async (k) => {
    const kh = k.khungHinh;
    if (k.loai !== 'hinh-anh' || !Array.isArray(kh) || kh.length !== 4) return k;
    const anh = await catHinh(anhTrang, kh as [number, number, number, number]);
    return anh ? { ...k, anhHinh: anh } : k;
  }));
  return { ...kq, khoi };
}

/** Ba trang mẫu do chính dự án soạn và vẽ — không phải bản chụp sách có bản quyền.
 *  Có ảnh thật kèm theo vì "Thử trang mẫu Toán 9" không nói được cho giáo viên biết
 *  họ sắp thấy gì; nhìn cái hình tam giác thì biết ngay. */
const TRANG_MAU = [
  { ten: 'toan-9', nhan: 'Toán 9', phu: 'Hình vẽ, công thức và bảng' },
  { ten: 'ngu-van-9', nhan: 'Ngữ văn 9', phu: 'Bài thơ kèm câu hỏi' },
  { ten: 'tieng-anh-6', nhan: 'Tiếng Anh 6', phu: 'Lẫn tiếng Anh và tiếng Việt' },
];

export const BuocTaiTrang: React.FC = () => {
  const { ban, themTrang, thayTrang, xoaTrang, doiThuTuTrang, datBuoc } = useVerso();
  const [dangChay, setDangChay] = React.useState(false);
  const [pdf, setPdf] = React.useState<{ ten: string; tl: TaiLieuPdf } | null>(null);
  /** Ảnh đang xem trước. Giữ cả object URL để còn thu hồi — quên thu hồi thì một
   *  buổi soạn 20 trang là hai chục ảnh gốc nằm lại trong bộ nhớ tab. */
  const [anhXem, setAnhXem] = React.useState<AnhXem[]>([]);
  const [chonTrang, setChonTrang] = React.useState('');
  const [dangTach, setDangTach] = React.useState('');
  const [tienDo, setTienDo] = React.useState({ xong: 0, tong: 0 });
  const [loi, setLoi] = React.useState<string[]>([]);
  /** Nhắc một câu về thao tác (chọn trang, mở tệp) — khác hẳn danh sách trang đọc hỏng,
   *  nên không dùng chung khung, kẻo hiện thành "Có 1 trang chưa đọc được". */
  const [nhac, setNhac] = React.useState('');
  /** Đang rê tệp lên ô tải. Trước đây ô này là <label> bọc <input>, mà thả tệp vào
   *  label thì trình duyệt không làm gì cả — giáo viên kéo tệp vào rồi tưởng hỏng. */
  const [dangKeo, setDangKeo] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const docLaiRef = React.useRef<HTMLInputElement>(null);
  // ref chứ không phải state: nút bấm mở ngay hộp thoại chọn tệp, sự kiện change
  // có thể về TRƯỚC khi React dựng lại — lúc đó state mới chưa tới tay hàm xử lý.
  const dangThay = React.useRef('');

  // Đóng tệp PDF và thu hồi ảnh xem trước khi rời bước này. Dùng ref vì hàm dọn
  // chạy lúc gỡ component, khi ấy state trong closure đã là bản cũ.
  const pdfRef = React.useRef<TaiLieuPdf | null>(null);
  const urlRef = React.useRef<string[]>([]);
  React.useEffect(() => () => {
    pdfRef.current?.dong();
    urlRef.current.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  /** Đóng tệp PDF đang mở, nếu có. */
  const dongPdf = React.useCallback(() => {
    pdfRef.current?.dong();
    pdfRef.current = null;
    setPdf(null);
  }, []);

  /** Bỏ hết ảnh xem trước và trả bộ nhớ. */
  const xoaAnhXem = React.useCallback(() => {
    urlRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlRef.current = [];
    setAnhXem([]);
  }, []);

  /** @param soPdf tệp nào tách ra từ trang PDF số mấy — chỉ có khi đi từ nút tách PDF. */
  const xuLy = async (files: FileList | File[] | null, soPdf?: Map<File, number>) => {
    if (!files?.length) return;
    const tep = Array.from(files);

    // PDF thì chưa đọc vội: sách giáo khoa cả trăm trang, phải hỏi cần trang nào đã.
    const tepPdf = tep.find((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (tepPdf) {
      if (fileRef.current) fileRef.current.value = '';
      setLoi([]);
      // Chọn cả thư mục thì rất dễ dính lẫn ảnh và vài tệp PDF. Mỗi lần chỉ mở
      // được một tệp, nhưng lặng lẽ bỏ những tệp kia đi thì giáo viên tưởng
      // Verso đã nhận hết.
      const conLai = tep.length - 1;
      setNhac(conLai > 0
        ? `Mỗi lần chỉ mở được một tệp PDF. Đang mở "${tepPdf.name}"; ${conLai} tệp còn lại chưa `
          + 'được nhận — chọn lại sau khi tách xong tệp này.'
        : '');
      try {
        setDangTach('Đang mở tệp PDF…');
        dongPdf(); xoaAnhXem();
        const tl = await moPdf(tepPdf);
        pdfRef.current = tl;
        setPdf({ ten: tepPdf.name, tl });
        setChonTrang(tl.soTrang <= TOI_DA_MOI_LAN ? `1-${tl.soTrang}` : '1-5');
      } catch {
        setNhac('Không mở được tệp PDF này. Nếu tệp có mật khẩu thì cần bỏ mật khẩu trước.');
      } finally {
        setDangTach('');
      }
      return;
    }

    const ds = tep.filter((f) => f.type.startsWith('image/'));
    if (!ds.length) {
      // Trước đây chỗ này return trắng: kéo nhầm tệp Word vào thì ô sáng lên rồi
      // tắt, không một chữ nào. Người dùng không có cách nào biết mình sai ở đâu.
      setLoi([]);
      setNhac(tep.length === 1
        ? `Không dùng được tệp "${tep[0].name}". Verso nhận ảnh JPG, PNG hoặc tệp PDF.`
        : `${tep.length} tệp vừa chọn đều không dùng được. Verso nhận ảnh JPG, PNG hoặc tệp PDF.`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    const boQua = tep.length - ds.length;
    setDangChay(true); setLoi([]); setTienDo({ xong: 0, tong: ds.length });
    setNhac(boQua > 0 ? `Đã bỏ qua ${boQua} tệp không phải ảnh hay PDF.` : '');

    // Hiện ảnh ra ngay, đừng đợi đọc xong: đọc một trang mất 5–15 giây, mà giáo
    // viên cần biết mình vừa chọn đúng tệp chưa ngay từ giây đầu.
    xoaAnhXem();
    const xem: AnhXem[] = ds.map((f, i) => {
      const url = URL.createObjectURL(f);
      urlRef.current.push(url);
      const sp = soPdf?.get(f);
      return { id: `${i}-${f.name}`, ten: sp ? `Trang ${sp} của PDF` : f.name, url, xong: false };
    });
    setAnhXem(xem);

    // Xử lý TUẦN TỰ, không song song: mỗi trang là một lượt gọi model khá nặng,
    // bắn cùng lúc dễ chạm hạn mức và mất luôn cả loạt.
    for (let i = 0; i < ds.length; i++) {
      try {
        const a = await nenAnh(ds[i]);
        const r = await fetch('/api/read-page', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anhBase64: a.base64, mimeType: a.mimeType, monHoc: ban.monHoc }),
        });
        const kq = await r.json();
        if (kq.loi) { setLoi((l) => [...l, `${ds[i].name}: ${THONG_BAO_LOI[kq.loi] ?? kq.loi}`]); }
        else { themTrang(await catCacHinh(kq, a.dataUrl), await anhNho(a.dataUrl), soPdf?.get(ds[i])); }
      } catch {
        setLoi((l) => [...l, `${ds[i].name}: không đọc được tệp này`]);
      }
      setTienDo({ xong: i + 1, tong: ds.length });
      setAnhXem((cu) => cu.map((a, j) => (j === i ? { ...a, xong: true } : a)));
    }
    setDangChay(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  /** Tách những trang giáo viên chọn ra khỏi PDF rồi đưa vào đúng luồng đọc ảnh. */
  const tachPdf = async () => {
    if (!pdf) return;
    const ds = docKhoangTrang(chonTrang, pdf.tl.soTrang);
    if (!ds.length) { setNhac('Chưa chọn trang nào. Ví dụ hợp lệ: 71-75 hoặc 71, 73, 80.'); return; }
    if (ds.length > TOI_DA_MOI_LAN) {
      setNhac(`Mỗi lần chỉ nên chuyển tối đa ${TOI_DA_MOI_LAN} trang. Bạn đang chọn ${ds.length} trang — hãy chia thành nhiều lần.`);
      return;
    }
    setNhac('');
    try {
      const anh = await pdf.tl.anhDayDu(ds, (x, t) => setDangTach(`Đang tách trang ${x}/${t}…`));
      setDangTach('');
      dongPdf();
      // Nhớ tệp nào ứng với trang PDF nào. Số này KHÔNG đi vào bản xuất, chỉ để
      // giải thích cho giáo viên vì sao chọn trang 70 mà kết quả ghi trang 68.
      const soPdf = new Map<File, number>();
      const tep = anh.map((a) => {
        const f = new File([a.blob], `trang-${a.so}.jpg`, { type: 'image/jpeg' });
        soPdf.set(f, a.so);
        return f;
      });
      await xuLy(tep, soPdf);
    } catch {
      setDangTach('');
      setNhac('Không tách được trang từ tệp PDF này.');
    }
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
    if (!id) return;
    if (!f?.type.startsWith('image/')) {
      // Chọn nhầm tệp PDF cho nút Đọc lại thì trước đây cũng im lặng như trên.
      if (f) setNhac(`Đọc lại cần một tệp ảnh. "${f.name}" không phải ảnh.`);
      return;
    }

    setDangChay(true); setLoi([]); setTienDo({ xong: 0, tong: 1 });
    try {
      const a = await nenAnh(f);
      const r = await fetch('/api/read-page', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anhBase64: a.base64, mimeType: a.mimeType, monHoc: ban.monHoc }),
      });
      const kq = await r.json();
      if (kq.loi) setLoi([`${f.name}: ${THONG_BAO_LOI[kq.loi] ?? kq.loi}`]);
      else thayTrang(id, await catCacHinh(kq, a.dataUrl), await anhNho(a.dataUrl));
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

  /** Bấm một trang trong ô xem trước thì thêm hoặc bỏ nó khỏi ô nhập.
   *  Vẫn ghi ngược lại thành chuỗi để ô nhập là nguồn sự thật duy nhất — gõ tay
   *  và bấm chuột không được phép cho ra hai danh sách khác nhau. */
  const bamTrang = (so: number) => {
    if (!pdf) return;
    const hien = docKhoangTrang(chonTrang, pdf.tl.soTrang);
    const co = hien.includes(so);
    setChonTrang(gopKhoang(co ? hien.filter((n) => n !== so) : [...hien, so]));
    setNhac('');
  };

  const tongKhoi = ban.trang.reduce((s, t) => s + t.khoi.length, 0);
  const coXemTruoc = !!pdf || anhXem.length > 0;

  return (
    <div className="max-w-5xl grid gap-5">
      <The lop="p-6">
        <h2 className="text-xl font-extrabold m-0">Tải trang sách lên</h2>
        <p className="text-muc-nhat mt-2 leading-relaxed max-w-2xl">
          Có <b>tệp PDF cả cuốn sách</b> thì chọn thẳng tệp đó — Verso hỏi bạn cần trang nào,
          và tách ngay trên máy bạn. Hoặc chọn ảnh từng trang, nhiều tệp một lúc cũng được.
          Ảnh chụp bằng điện thoại dùng tốt, miễn là <b>chụp thẳng, đủ sáng, thấy hết bốn góc
          trang</b>.
        </p>

        <div className={`grid items-start ${coXemTruoc ? 'gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]' : ''}`}>
        <div className="min-w-0">
        <label
          onDragEnter={(e) => { e.preventDefault(); if (!dangChay) setDangKeo(true); }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            // Rê qua chữ bên trong cũng bắn dragleave — chỉ tắt khi ra hẳn khỏi ô.
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDangKeo(false);
          }}
          onDrop={(e) => { e.preventDefault(); setDangKeo(false); if (!dangChay) xuLy(e.dataTransfer.files); }}
          className={`mt-5 block border-2 border-dashed rounded-xl px-6 py-7 text-center cursor-pointer transition-colors ${
            dangChay ? 'border-vien bg-giay-sau pointer-events-none opacity-60'
            : dangKeo ? 'border-verso-600 bg-verso-100 ring-2 ring-verso-600/25'
            : 'border-verso-200 bg-verso-50 hover:border-verso-600 hover:bg-verso-100/60'
          }`}>
          <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" multiple
            className="chi-doc-man-hinh"
            onChange={(e) => xuLy(e.target.files)} disabled={dangChay} />
          <span className="inline-flex flex-col items-center gap-1.5 text-verso-700">
            <Icon ten="tai" co={30} />
            <span className="font-extrabold text-base">
              {dangChay ? 'Đang đọc…' : dangKeo ? 'Thả tệp vào đây' : 'Kéo tệp vào đây, hoặc bấm để chọn'}
            </span>
            <span className="text-sm text-muc-mo font-normal">
              JPG, PNG hoặc PDF · chọn được nhiều tệp cùng lúc
            </span>
          </span>
        </label>

        <div className="mt-4">
          <p className="text-sm text-muc-mo m-0 mb-2">Chưa có ảnh trang sách? Thử một trang mẫu:</p>
          <ul className="grid gap-2 sm:grid-cols-3 m-0 p-0 list-none">
            {TRANG_MAU.map((m) => (
              <li key={m.ten}>
                <button type="button" disabled={dangChay}
                  onClick={() => dungMau(m.ten, `Trang mẫu ${m.nhan}`)}
                  className="w-full h-full flex items-center gap-3 p-2 text-left rounded-lg border border-vien
                             bg-white hover:border-verso-600 hover:bg-verso-50 transition-colors
                             disabled:opacity-50 disabled:pointer-events-none">
                  <img src={`/mau/${m.ten}.png`} alt="" loading="lazy"
                    className="w-11 h-14 shrink-0 object-cover object-top rounded border border-vien bg-white" />
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-verso-700">{m.nhan}</span>
                    <span className="block text-xs text-muc-mo leading-snug">{m.phu}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {dangTach && (
          <p role="status" className="mt-4 text-sm font-bold text-verso-700">{dangTach}</p>
        )}

        {pdf && (
          <div className="mt-5 p-4 rounded-lg bg-verso-50 border border-verso-200">
            <h3 className="text-base font-extrabold m-0">
              {pdf.ten} · {pdf.tl.soTrang} trang
            </h3>
            <p className="text-sm text-muc-nhat mt-1 mb-3 leading-relaxed">
              Chọn những trang cần chuyển. Đây là <b>số trang trong tệp PDF</b>, có thể lệch với
              số in trên sách nếu tệp có bìa và mục lục ở đầu.
            </p>
            <label htmlFor="chon-trang" className="block text-xs font-bold text-muc-mo mb-1">
              Trang cần chuyển — ví dụ 71-75 hoặc 71, 73, 80
            </label>
            <div className="flex flex-wrap gap-2">
              <input id="chon-trang" value={chonTrang} onChange={(e) => setChonTrang(e.target.value)}
                inputMode="numeric"
                className="flex-1 min-w-[12rem] px-3 min-h-[44px] rounded-lg border border-vien bg-white
                           focus:border-verso-600 outline-none text-sm" />
              <Nut onClick={tachPdf} tat={!!dangTach || dangChay} icon="tai">
                Đọc {docKhoangTrang(chonTrang, pdf.tl.soTrang).length || 0} trang này
              </Nut>
              <Nut kieu="phu" onClick={() => { dongPdf(); setNhac(''); }} tat={!!dangTach}>Bỏ</Nut>
            </div>
            <p className="text-sm text-muc-mo mt-2 mb-0">
              Mỗi lần tối đa {TOI_DA_MOI_LAN} trang. Tệp PDF không rời khỏi máy bạn — Verso chỉ gửi đi
              ảnh của những trang bạn chọn.
            </p>
          </div>
        )}

        {dangChay && (
          <div className="mt-5">
            <ThanhTienDo xong={tienDo.xong} tong={tienDo.tong} nhan="Đang đọc trang" />
            <p className="text-sm text-muc-mo mt-2">Mỗi trang mất khoảng 5–15 giây. Đừng đóng tab.</p>
          </div>
        )}

        {nhac && (
          <p role="alert" className="mt-4 p-3 rounded-lg bg-loi-50 border border-loi-200 text-sm font-semibold text-loi-700">
            {nhac}
          </p>
        )}

        {loi.length > 0 && (
          <div role="alert" className="mt-5 p-4 rounded-lg bg-loi-50 border border-loi-200">
            <p className="font-bold text-loi-700 m-0 mb-1">Có {loi.length} trang chưa đọc được</p>
            <ul className="m-0 pl-5 text-sm text-muc-nhat">{loi.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
        )}
        </div>

        {coXemTruoc && (
          <div className="min-w-0 lg:mt-5">
            {pdf
              ? <XemTruocPdf tl={pdf.tl} ten={pdf.ten}
                  chon={docKhoangTrang(chonTrang, pdf.tl.soTrang)} bamTrang={bamTrang} />
              : <XemTruocAnh anh={anhXem} dong={xoaAnhXem} />}
          </div>
        )}
        </div>
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
              const ten = tenTrang(t);
              return (
                <li key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-vien-nhat">
                  {t.anhGoc
                    ? <img src={t.anhGoc} alt="" className="w-12 h-16 object-cover rounded border border-vien" />
                    : <div className="w-12 h-16 rounded bg-giay-sau grid place-items-center text-muc-mo"><Icon ten="anh" co={18} /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold m-0 text-sm">
                      {ten.chinh}
                      {ten.phu && (
                        <span className="font-normal text-muc-mo ml-1.5">· {ten.phu}</span>
                      )}
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
                      aria-label={`Đưa ${ten.chinh.toLowerCase()} lên trước`}
                      className="w-10 h-10 grid place-items-center rounded-lg text-muc-mo hover:text-verso-700 hover:bg-verso-50 disabled:opacity-25 disabled:pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m18 15-6-6-6 6" />
                      </svg>
                    </button>
                    <button onClick={() => doiThuTuTrang(t.id, 1)} disabled={idx === ban.trang.length - 1}
                      aria-label={`Đưa ${ten.chinh.toLowerCase()} xuống sau`}
                      className="w-10 h-10 grid place-items-center rounded-lg text-muc-mo hover:text-verso-700 hover:bg-verso-50 disabled:opacity-25 disabled:pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    <button onClick={() => { dangThay.current = t.id; docLaiRef.current?.click(); }}
                      disabled={dangChay}
                      aria-label={`Đọc lại ${ten.chinh.toLowerCase()} bằng ảnh khác`}
                      title="Đọc lại trang này"
                      className="w-10 h-10 grid place-items-center rounded-lg text-muc-mo hover:text-verso-700 hover:bg-verso-50 disabled:opacity-25 disabled:pointer-events-none">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" />
                      </svg>
                    </button>
                    <button onClick={() => xoaTrang(t.id)} aria-label={`Xoá ${ten.chinh.toLowerCase()}`}
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
