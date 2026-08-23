'use client';

import type { Khoi } from './types';

/** Lưới an toàn: đổi ký hiệu còn sót sang tiếng Việt.
 *
 *  Đúng ra Gemini phải điền dạng đọc cho mọi câu có ký hiệu, và prompt đã yêu cầu vậy.
 *  Nhưng model bỏ sót là chuyện có thật — đo trên bản mẫu thấy α và ° vẫn lọt. */
const KY_HIEU: [RegExp, string][] = [
  [/°/g, ' độ'], [/α/g, 'an-pha'], [/β/g, 'bê-ta'], [/γ/g, 'gam-ma'], [/δ/g, 'đen-ta'],
  [/θ/g, 'tê-ta'], [/λ/g, 'lam-đa'], [/μ/g, 'muy'], [/π/g, 'pi'], [/φ/g, 'phi'],
  [/ω/g, 'ô-mê-ga'], [/Δ/g, 'đen-ta'], [/Ω/g, 'ô-mê-ga'],
  [/≤/g, ' nhỏ hơn hoặc bằng '], [/≥/g, ' lớn hơn hoặc bằng '], [/≠/g, ' khác '],
  [/±/g, ' cộng trừ '], [/×/g, ' nhân '], [/÷/g, ' chia '], [/∞/g, ' vô cùng '],
  [/⊥/g, ' vuông góc với '], [/∥/g, ' song song với '], [/√/g, ' căn bậc hai của '],
  [/²/g, ' bình phương'], [/³/g, ' lập phương'],
  [/₀/g, ' không '], [/₁/g, ' một '], [/₂/g, ' hai '], [/₃/g, ' ba '], [/₄/g, ' bốn '],
  [/₅/g, ' năm '], [/₆/g, ' sáu '], [/₇/g, ' bảy '], [/₈/g, ' tám '], [/₉/g, ' chín '],
];

export function doiKyHieuSot(s: string): string {
  let r = s;
  for (const [re, thay] of KY_HIEU) r = r.replace(re, thay);
  return r.replace(/\s{2,}/g, ' ').trim();
}

/** Lời đọc của MỘT khối, tính thẳng từ dữ liệu.
 *
 *  Dùng ở màn duyệt, nơi khối được hiển thị dưới dạng ô nhập chứ không phải HTML cuối,
 *  nên không đi qua DOM được. Phải khớp với những gì KhoiDoc dựng ra. */
export function loiDocCuaKhoi(k: Khoi): string {
  const doi = (s?: string) => doiKyHieuSot(s ?? '');

  switch (k.loai) {
    case 'hinh-anh':
      return doi(`Mô tả hình vẽ. ${k.moTa ?? ''}`);

    case 'cong-thuc':
      // Trang thật đưa docThanhLoi cho trình đọc màn hình, ký hiệu bị aria-hidden
      return doi(k.docThanhLoi || k.kyHieuGoc);

    case 'bang': {
      const b = k.bang;
      if (!b) return '';
      const doc = (b.hangDoc?.length ?? 0) > 0 ? b.hangDoc : null;
      const hang = (doc ?? b.hang).map((h, i) =>
        h.map((o, c) => `${b.tieuDeCot[c] ?? ''}: ${o}`).join(', '),
      );
      return doi([b.tomTat, ...hang].join('. '));
    }

    case 'chu-thich':
      return doi(`Chú thích${k.thuocVe ? ` cho từ ${k.thuocVe}` : ''}. ${k.vanBan ?? ''}`);

    case 'bai-tap':
      return doi(`Bài tập${k.soBaiTap ? ` ${k.soBaiTap}` : ''}. ${k.vanBanDoc || k.vanBan || ''}`);

    default:
      return doi(k.vanBanDoc || k.vanBan);
  }
}

/** Chrome cắt ngang khi chuỗi quá dài — chia thành đoạn ≤180 ký tự theo ranh giới câu. */
export function chiaDoan(s: string): string[] {
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

let _giong: SpeechSynthesisVoice | null = null;
export function giongViet(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  if (_giong) return _giong;
  const ds = window.speechSynthesis.getVoices();
  _giong = ds.find((v) => v.lang === 'vi-VN') ?? ds.find((v) => v.lang.startsWith('vi')) ?? null;
  return _giong;
}

export const coGiongDoc = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Đọc một chuỗi, trả về hàm dừng. */
export function docTo(text: string, xong?: () => void): () => void {
  if (!coGiongDoc() || !text.trim()) return () => {};
  window.speechSynthesis.cancel();
  const doan = chiaDoan(text);
  let i = 0;
  let huy = false;
  const noi = () => {
    if (huy) return;
    if (i >= doan.length) { xong?.(); return; }
    const u = new SpeechSynthesisUtterance(doan[i++]);
    u.lang = 'vi-VN';
    const g = giongViet();
    if (g) u.voice = g;
    u.rate = 1;
    u.onend = noi;
    u.onerror = noi;
    window.speechSynthesis.speak(u);
  };
  noi();
  return () => { huy = true; window.speechSynthesis.cancel(); };
}
