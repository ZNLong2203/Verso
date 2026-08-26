'use client';

import React from 'react';
import { doiKyHieuSot, donDauCau } from '@/lib/speechText';
import { taiTieng, taiTruoc, LoiTieng, THONG_BAO_TIENG } from '@/lib/audioClient';
import { ghiDangNghe } from '@/lib/nowPlaying';

function layLoiDoc(el: Element, nnuGoc: 'vi' | 'en' = 'vi'): string {
  let ra = '';
  const di = (n: Node, nnu: 'vi' | 'en') => {
    if (n.nodeType === Node.TEXT_NODE) { ra += n.textContent ?? ''; return; }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const e = n as Element;
    if (e.getAttribute('aria-hidden') === 'true') return;   // ký hiệu dành cho mắt
    if (e.tagName === 'SCRIPT' || e.tagName === 'STYLE') return;
    // aria-label THAY nội dung, nhưng CHỈ ở những phần tử lấy tên từ chính nội dung
    // của mình: liên kết, nút, công thức, hình. Thiếu bước này thì dấu chú thích
    // "[1]" bị đọc thành một chữ "một" trơ trọi giữa câu, trong khi NVDA đọc
    // "Chú thích 1" — nút nghe hết còn kiểm được gì.
    //
    // Tuyệt đối KHÔNG áp cho vùng chứa: <div role="group" aria-label="Đoạn thơ">
    // chỉ được ĐẶT TÊN cho khổ thơ, nội dung bên trong vẫn phải đọc. Áp nhầm là
    // nuốt trọn cả bài thơ, chỉ còn đọc hai chữ "Đoạn thơ".
    // Dấu chú thích thì bỏ hẳn, không đọc: nó cắt ngang mạch câu, mà lời giải
    // nghĩa nằm ngay phía dưới nên đọc tuần tự là gặp.
    if (e.tagName === 'A' && (e.getAttribute('href') ?? '').startsWith('#chu-thich')) return;

    const nhan = e.getAttribute('aria-label');
    const vai = e.getAttribute('role');
    if (nhan && (e.tagName === 'A' || e.tagName === 'BUTTON' || vai === 'math' || vai === 'img')) {
      ra += ` ${nhan}. `;
      return;
    }
    const lg = (e.getAttribute('lang') || '').toLowerCase();
    const nnuCon: 'vi' | 'en' = lg.startsWith('en') ? 'en' : lg.startsWith('vi') ? 'vi' : nnu;
    const doi = nnuCon !== nnu;
    if (doi) ra += `[${nnuCon}]`;
    for (const con of Array.from(e.childNodes)) di(con, nnuCon);
    if (doi) ra += `[/${nnuCon}]`;
    // FIGCAPTION và ô bảng cũng là ranh giới — thiếu chúng thì chữ dính liền:
    // "Mô tả hình vẽHình 4.17"
    // Chỉ chèn dấu chấm khi phần vừa đọc CHƯA tự kết thúc — chèn bừa thì thành
    // ".." và máy đọc ngắt hai lần, nghe như vấp ở từng dấu câu.
    if (/^(P|DIV|LI|TR|TD|TH|H1|H2|H3|H4|FIGURE|FIGCAPTION|CAPTION|ASIDE|SECTION)$/.test(e.tagName)) {
      ra += /[.!?;:,]\s*$/.test(ra) ? ' ' : '. ';
    }
  };
  di(el, nnuGoc);
  return doiKyHieuSot(donDauCau(ra));
}

/** Khoá ghi chỗ đang nghe dở, riêng cho từng bản đọc. */
const khoaViTri = (ma: string) => `verso:cho-nghe:${ma}`;

export const TrinhNghe: React.FC<{ ma?: string }> = ({ ma }) => {
  // null = chưa dựng xong ở trình duyệt. Nếu khởi tạo bằng false, HTML máy chủ sẽ
  // chứa câu "không đọc được" — và người dùng trình đọc màn hình có thể nghe đúng
  // câu sai đó trước khi JavaScript kịp chạy.
  const [sanSang, setSanSang] = React.useState<boolean | null>(null);
  const [dangTai, setDangTai] = React.useState(false);
  const [dangDoc, setDangDoc] = React.useState(false);
  const [tamDung, setTamDung] = React.useState(false);
  const [viTri, setViTri] = React.useState(0);
  const [tong, setTong] = React.useState(0);
  const [tocDo, setTocDo] = React.useState(1);
  const [loi, setLoi] = React.useState('');
  const [thongBao, setThongBao] = React.useState('');
  /** Chỗ nghe dở lần trước, để mời nghe tiếp thay vì bắt nghe lại từ đầu. */
  const [choDo, setChoDo] = React.useState(0);

  const khoi = React.useRef<Element[]>([]);
  const loiDoc = React.useRef<string[]>([]);
  const may = React.useRef<HTMLAudioElement | null>(null);
  const phien = React.useRef(0);

  React.useEffect(() => {
    const goc = document.getElementById('noi-dung');
    if (goc) {
      const ds = Array.from(goc.querySelectorAll('article > *'))
        .map((e) => [e, layLoiDoc(e)] as const)
        .filter(([, t]) => t.length > 1);
      khoi.current = ds.map(([e]) => e);
      loiDoc.current = ds.map(([, t]) => t);
      setTong(ds.length);
    }
    const a = new Audio();
    a.preload = 'auto';
    may.current = a;
    // Sách dài mấy chục phần: bắt nghe lại từ đầu mỗi lần mở là bỏ cả buổi học trước.
    if (ma) {
      try {
        const n = Number(localStorage.getItem(khoaViTri(ma)));
        if (Number.isInteger(n) && n > 0) setChoDo(n);
      } catch { /* trình duyệt chặn localStorage thì thôi */ }
    }
    setSanSang(true);
    return () => { a.pause(); a.src = ''; };
  }, []);

  // Đổi tốc độ ngay giữa lúc đang phát, không phải tổng hợp lại tệp nào.
  React.useEffect(() => { if (may.current) may.current.playbackRate = tocDo; }, [tocDo]);

  const toSang = (i: number) => {
    khoi.current.forEach((e) => e.classList.remove('dang-nghe'));
    const e = khoi.current[i];
    if (!e) return;
    e.classList.add('dang-nghe');
    // Ghi lại để ô "Báo chỗ đọc sai" còn biết phần nào, kể cả sau khi đã dừng.
    ghiDangNghe(e.getAttribute('data-khoi') ?? '', (e.textContent ?? '').trim().slice(0, 60));
    e.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const donDep = (bao = '') => {
    khoi.current.forEach((e) => e.classList.remove('dang-nghe'));
    setDangDoc(false); setTamDung(false); setDangTai(false); setViTri(0);
    setThongBao(bao);
  };

  const docTu = React.useCallback(async (batDau: number) => {
    const a = may.current;
    if (!a || !loiDoc.current.length) return;
    const toi = ++phien.current;
    const conCuaToi = () => phien.current === toi;
    a.pause();
    setLoi('');
    setDangDoc(true); setTamDung(false);
    setThongBao('Đang tạo giọng đọc, chờ một chút.');

    for (let i = batDau; i < loiDoc.current.length; i++) {
      if (!conCuaToi()) return;
      setViTri(i);
      toSang(i);
      if (ma) { try { localStorage.setItem(khoaViTri(ma), String(i)); } catch { /* bỏ qua */ } }
      let nguon: string;
      try {
        setDangTai(true);
        nguon = await taiTieng(loiDoc.current[i]);
      } catch (e) {
        if (!conCuaToi()) return;
        setDangTai(false);
        setLoi(THONG_BAO_TIENG[(e as LoiTieng).ma] ?? THONG_BAO_TIENG.LOI_TIENG);
        donDep();
        return;
      }
      if (!conCuaToi()) return;
      setDangTai(false);
      if (i === batDau) setThongBao('Bắt đầu đọc.');

      // Nạp sẵn đoạn sau trong lúc đoạn này đang phát: chỉ đoạn đầu phải chờ.
      taiTruoc(loiDoc.current[i + 1]);

      a.src = nguon;
      a.playbackRate = tocDo;
      try {
        await new Promise<void>((xong, hong) => {
          a.onended = () => xong();
          a.onerror = () => hong(new Error('phat-hong'));
          a.play().catch(hong);
        });
      } catch {
        if (conCuaToi()) { setLoi(THONG_BAO_TIENG.LOI_TIENG); donDep(); }
        return;
      }
    }
    if (conCuaToi()) donDep('Đã đọc hết trang.');
  }, [tocDo]);

  const dungHan = () => {
    phien.current++;          // mọi lượt đang chạy tự thoát
    may.current?.pause();
    setChoDo(viTri);          // dừng ở đâu, lần sau mời nghe tiếp từ đó
    donDep('Đã dừng.');
  };

  const phimTrongCum = (e: React.KeyboardEvent) => {
    if (!dangDoc) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); docTu(Math.min(viTri + 1, tong - 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); docTu(Math.max(viTri - 1, 0)); }
  };

  const tamDungTiep = () => {
    const a = may.current;
    if (!a) return;
    if (tamDung) { a.play().catch(() => {}); setTamDung(false); setThongBao('Đọc tiếp.'); }
    else { a.pause(); setTamDung(true); setThongBao('Đã tạm dừng.'); }
  };

  // Chưa dựng xong: giữ chỗ trung tính, không khẳng định điều gì.
  if (sanSang === null) {
    return <p className="text-sm text-muc-mo m-0">Đang chuẩn bị phần nghe…</p>;
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2.5"
        role="group" aria-label="Điều khiển nghe" onKeyDown={phimTrongCum}>
        {!dangDoc ? (
          <button onClick={() => docTu(0)}
            className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-lg bg-verso-700 text-white font-bold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            {choDo > 0 ? 'Nghe lại từ đầu' : 'Nghe cả trang'}
          </button>
        ) : (
          <>
            <button onClick={tamDungTiep} disabled={dangTai}
              className="inline-flex items-center gap-2 px-4 py-3 min-h-[44px] rounded-lg bg-verso-700 text-white font-bold disabled:opacity-50">
              {tamDung ? 'Đọc tiếp' : 'Tạm dừng'}
            </button>
            <button onClick={dungHan}
              className="inline-flex items-center gap-2 px-4 py-3 min-h-[44px] rounded-lg border-2 border-vien bg-white font-bold">
              Dừng
            </button>
            {/* Nghe lại chỗ vừa nghe là thao tác chính lúc học, không phải thao tác phụ. */}
            <button onClick={() => docTu(Math.max(viTri - 1, 0))} disabled={viTri === 0}
              className="px-4 py-3 min-h-[44px] rounded-lg border-2 border-vien bg-white font-bold disabled:opacity-40">
              ‹ Phần trước
            </button>
            <button onClick={() => docTu(Math.min(viTri + 1, tong - 1))} disabled={viTri >= tong - 1}
              className="px-4 py-3 min-h-[44px] rounded-lg border-2 border-vien bg-white font-bold disabled:opacity-40">
              Phần sau ›
            </button>
            {/* Không đặt aria-live ở đây: số phần đổi liên tục, trình đọc màn hình
                sẽ xướng đè lên chính giọng đang đọc. Chỉ những chuyển biến đáng
                báo mới đi vào vùng thông báo bên dưới. */}
            <span className="text-sm text-muc-mo tabular-nums">
              {dangTai ? 'đang tạo giọng đọc…' : `phần ${viTri + 1}/${tong}`}
            </span>
          </>
        )}

        <label className="flex items-center gap-2 text-sm ml-1">
          <span className="text-muc-mo">Tốc độ</span>
          <select value={tocDo} onChange={(e) => setTocDo(Number(e.target.value))}
            className="px-3 py-2.5 min-h-[44px] rounded border-2 border-vien bg-white text-sm">
            <option value={0.75}>Chậm</option>
            <option value={1}>Bình thường</option>
            <option value={1.25}>Nhanh</option>
            <option value={1.5}>Rất nhanh</option>
          </select>
        </label>
      </div>

      {!dangDoc && choDo > 0 && (
        <p className="text-base m-0">
          <button onClick={() => docTu(choDo)}
            className="font-bold text-verso-700 underline underline-offset-2 min-h-[44px] px-2 -mx-2 rounded hover:bg-verso-50">
            Nghe tiếp từ phần {choDo + 1}
          </button>
          <span className="text-muc-mo"> — chỗ bạn nghe dở lần trước.</span>
        </p>
      )}

      {dangDoc && (
        <p className="text-sm text-muc-mo m-0">
          Đang ở trong cụm nút: bấm mũi tên trái/phải để lùi hoặc sang phần khác.
        </p>
      )}

      {/* Vùng thông báo: chỉ những chuyển biến người nghe cần biết, không phải
          từng bước tiến độ. */}
      <p role="status" aria-live="polite" className="chi-doc-man-hinh">{thongBao}</p>

      {loi && (
        <p role="alert" className="text-sm font-semibold text-loi-700 m-0">{loi}</p>
      )}
    </div>
  );
};
