import type { Khoi } from './types';
import { loiChuThich } from './neo';

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
  // Đo trên trang thật: § trong SGK là số hiệu bài, còn · là dấu ngăn ở đầu trang.
  // Để nguyên thì máy đọc hoặc bỏ qua hẳn, hoặc đọc thành tên ký hiệu tiếng Anh.
  [/§\s*/g, 'Bài '], [/\s*·\s*/g, ', '],
  [/[\u201C\u201D\u2033]/g, '"'], [/[\u2018\u2019\u2032]/g, "'"],
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
  /** Câu dẫn ("Mô tả hình vẽ.", "Bài tập 3.") luôn là tiếng Việt, kể cả khi khối
   *  là tiếng Anh — bọc lại để nó không bị đọc bằng giọng Anh. */
  const dan = (t: string) => (k.ngonNgu === 'en' ? `[vi]${t}[/vi]` : t);

  switch (k.loai) {
    case 'hinh-anh':
      return doi(`${dan('Mô tả hình vẽ.')} ${k.moTa ?? ''}`);

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
      return doi(`${dan('Chú thích.')} ${loiChuThich(k)}`);

    case 'bai-tap':
      return doi(`${dan(`Bài tập${k.soBaiTap ? ` ${k.soBaiTap}` : ''}.`)} ${k.vanBanDoc || k.vanBan || ''}`);

    default:
      return doi(k.vanBanDoc || k.vanBan);
  }
}
