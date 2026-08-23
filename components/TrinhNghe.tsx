'use client';

import React from 'react';

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

/** Lưới an toàn: đổi ký hiệu còn sót sang tiếng Việt.
 *
 *  Đúng ra Gemini phải điền vanBanDoc cho mọi câu có ký hiệu, và prompt đã yêu cầu vậy.
 *  Nhưng model bỏ sót là chuyện có thật — đo trên bản mẫu thấy α và ° vẫn lọt.
 *  Bảng này không thay được vanBanDoc (nó không hiểu ngữ cảnh), chỉ để câu đọc lên
 *  đỡ thành rác khi model quên. */
const KY_HIEU: [RegExp, string][] = [
  [/°/g, ' độ'], [/α/g, 'an-pha'], [/β/g, 'bê-ta'], [/γ/g, 'gam-ma'], [/δ/g, 'đen-ta'],
  [/θ/g, 'tê-ta'], [/λ/g, 'lam-đa'], [/μ/g, 'muy'], [/π/g, 'pi'], [/φ/g, 'phi'], [/ω/g, 'ô-mê-ga'],
  [/Δ/g, 'đen-ta'], [/Ω/g, 'ô-mê-ga'],
  [/≤/g, ' nhỏ hơn hoặc bằng '], [/≥/g, ' lớn hơn hoặc bằng '], [/≠/g, ' khác '],
  [/±/g, ' cộng trừ '], [/×/g, ' nhân '], [/÷/g, ' chia '], [/∞/g, ' vô cùng '],
  [/⊥/g, ' vuông góc với '], [/∥/g, ' song song với '], [/√/g, ' căn bậc hai của '],
  [/²/g, ' bình phương'], [/³/g, ' lập phương'],
  [/[₀₁₂₃₄₅₆₇₈₉]/g, (m: string) => ' ' + '0123456789'['₀₁₂₃₄₅₆₇₈₉'.indexOf(m)] + ' '] as never,
];

function doiKyHieuSot(s: string): string {
  let r = s;
  for (const [re, thay] of KY_HIEU) r = r.replace(re, thay as string);
  return r.replace(/\s{2,}/g, ' ').trim();
}

/** Chrome cắt ngang khi chuỗi quá dài — chia thành đoạn ≤180 ký tự theo ranh giới câu. */
function chiaDoan(s: string): string[] {
  const cau = s.match(/[^.!?;]+[.!?;]?/g) ?? [s];
  const ra: string[] = [];
  let dem = '';
  for (const c of cau) {
    if ((dem + c).length > 180) { if (dem.trim()) ra.push(dem.trim()); dem = c; }
    else dem += c;
  }
  if (dem.trim()) ra.push(dem.trim());
  return ra;
}

export const TrinhNghe: React.FC = () => {
  const [coGiong, setCoGiong] = React.useState(false);
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

    const napGiong = () => {
      const ds = window.speechSynthesis.getVoices();
      giong.current = ds.find((v) => v.lang === 'vi-VN') ?? ds.find((v) => v.lang.startsWith('vi')) ?? null;
    };
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
          className="px-2 py-1.5 rounded border-2 border-vien bg-white text-sm">
          <option value={0.75}>Chậm</option>
          <option value={1}>Bình thường</option>
          <option value={1.25}>Nhanh</option>
          <option value={1.5}>Rất nhanh</option>
        </select>
      </label>
    </div>
  );
};
