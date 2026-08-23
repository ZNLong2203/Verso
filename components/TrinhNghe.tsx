'use client';

import React from 'react';
import { doiKyHieuSot, chiaDoan, giongViet } from '@/lib/loiDoc';

/**
 * Trình nghe cho trang đọc.
 *
 * Nguyên tắc quyết định: nó đọc ĐÚNG THỨ mà trình đọc màn hình đọc — không phải
 * thứ hiện trên màn hình. Nghĩa là bỏ qua mọi phần tử aria-hidden (ký hiệu công thức,
 * ô bảng dạng ký hiệu) và lấy phần .chi-doc-man-hinh (dạng đọc thành lời).
 *
 * Nhờ vậy nút nghe cũng là công cụ tự kiểm: nghe thấy "căn bậc hai của hai trên hai"
 * nghĩa là NVDA cũng sẽ nghe thấy đúng như thế.
 */

/** Lấy lời đọc của một phần tử, đi đúng cách trình đọc màn hình đi. */
function layLoiDoc(el: Element): string {
  let ra = '';
  const di = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) { ra += n.textContent ?? ''; return; }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const e = n as Element;
    if (e.getAttribute('aria-hidden') === 'true') return;   // ký hiệu dành cho mắt
    if (e.tagName === 'SCRIPT' || e.tagName === 'STYLE') return;
    for (const con of Array.from(e.childNodes)) di(con);
    // FIGCAPTION và ô bảng cũng là ranh giới — thiếu chúng thì chữ dính liền:
    // "Mô tả hình vẽHình 4.17"
    if (/^(P|DIV|LI|TR|TD|TH|H1|H2|H3|H4|FIGURE|FIGCAPTION|CAPTION|ASIDE|SECTION)$/.test(e.tagName)) ra += '. ';
  };
  di(el);
  return doiKyHieuSot(ra.replace(/\s+/g, ' ').replace(/\.\s*\./g, '.').trim());
}


export const TrinhNghe: React.FC = () => {
  // null = chưa kiểm (đang dựng ở máy chủ). Nếu khởi tạo bằng false, HTML máy chủ sẽ
  // chứa câu "trình duyệt không hỗ trợ" — và người dùng trình đọc màn hình có thể nghe
  // đúng câu sai đó trước khi JavaScript kịp chạy.
  const [coGiong, setCoGiong] = React.useState<boolean | null>(null);
  const [dangDoc, setDangDoc] = React.useState(false);
  const [tamDung, setTamDung] = React.useState(false);
  const [viTri, setViTri] = React.useState(0);
  const [tong, setTong] = React.useState(0);
  const [tocDo, setTocDo] = React.useState(1);

  const khoi = React.useRef<Element[]>([]);
  const dung = React.useRef(false);
  const giong = React.useRef<SpeechSynthesisVoice | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setCoGiong(true);

    const napGiong = () => { giong.current = giongViet(); };
    napGiong();
    window.speechSynthesis.onvoiceschanged = napGiong;

    const goc = document.getElementById('noi-dung');
    if (goc) {
      khoi.current = Array.from(goc.querySelectorAll('article > *')).filter(
        (e) => layLoiDoc(e).length > 1,
      );
      setTong(khoi.current.length);
    }
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  const toSang = (i: number) => {
    khoi.current.forEach((e) => e.classList.remove('dang-nghe'));
    const e = khoi.current[i];
    if (!e) return;
    e.classList.add('dang-nghe');
    e.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const docTu = React.useCallback((batDau: number) => {
    if (!khoi.current.length) return;
    dung.current = false;
    setDangDoc(true); setTamDung(false);
    window.speechSynthesis.cancel();

    let i = batDau;
    const doc1 = () => {
      if (dung.current || i >= khoi.current.length) {
        khoi.current.forEach((e) => e.classList.remove('dang-nghe'));
        setDangDoc(false); setViTri(0);
        return;
      }
      setViTri(i);
      toSang(i);
      const doan = chiaDoan(layLoiDoc(khoi.current[i]));
      let j = 0;
      const noi = () => {
        if (dung.current) return;
        if (j >= doan.length) { i++; doc1(); return; }
        const u = new SpeechSynthesisUtterance(doan[j++]);
        u.lang = 'vi-VN';
        if (giong.current) u.voice = giong.current;
        u.rate = tocDo;
        u.onend = noi;
        u.onerror = noi;
        window.speechSynthesis.speak(u);
      };
      noi();
    };
    doc1();
  }, [tocDo]);

  const dungHan = () => {
    dung.current = true;
    window.speechSynthesis.cancel();
    khoi.current.forEach((e) => e.classList.remove('dang-nghe'));
    setDangDoc(false); setTamDung(false); setViTri(0);
  };

  const tamDungTiep = () => {
    if (tamDung) { window.speechSynthesis.resume(); setTamDung(false); }
    else { window.speechSynthesis.pause(); setTamDung(true); }
  };

  // Chưa kiểm xong: giữ chỗ trung tính, không khẳng định điều gì.
  if (coGiong === null) {
    return <p className="text-sm text-muc-mo m-0">Đang chuẩn bị phần nghe…</p>;
  }

  if (!coGiong) {
    return (
      <p className="text-sm text-muc-mo m-0">
        Trình duyệt này chưa đọc được tiếng Việt. Hãy dùng Chrome, hoặc bật trình đọc màn hình
        sẵn có của máy (NVDA, VoiceOver, TalkBack).
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {!dangDoc ? (
        <button onClick={() => docTu(0)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-verso-700 text-white font-bold">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
          Nghe cả trang
        </button>
      ) : (
        <>
          <button onClick={tamDungTiep}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-verso-700 text-white font-bold">
            {tamDung ? 'Đọc tiếp' : 'Tạm dừng'}
          </button>
          <button onClick={dungHan}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-vien bg-white font-bold">
            Dừng
          </button>
          <button onClick={() => docTu(Math.min(viTri + 1, tong - 1))}
            className="px-4 py-3 rounded-lg border-2 border-vien bg-white font-bold">
            Phần sau ›
          </button>
          <span className="text-sm text-muc-mo tabular-nums" role="status" aria-live="polite">
            phần {viTri + 1}/{tong}
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
  );
};
