/** Tách văn bản thành từng đoạn theo ngôn ngữ.
 *
 *  Sách Tiếng Anh của Việt Nam trộn hai thứ tiếng ngay trong một câu: lệnh bài
 *  bằng tiếng Việt, đoạn hội thoại bằng tiếng Anh. Một giọng đọc cả câu là sai
 *  ở nửa này hoặc nửa kia.
 *
 *  Đã thử thẻ SSML <lang xml:lang="en-US"> với Cloud TTS: API nhận nhưng KHÔNG
 *  đổi cách phát âm — cùng một câu trộn, có thẻ và không thẻ đều ra đúng 5,69
 *  giây. Nên phải tách thật rồi tổng hợp từng đoạn bằng giọng của nó. */

export type Nnu = 'vi' | 'en';

export interface DoanNnu {
  nnu: Nnu;
  text: string;
}

const MOC = /\[(en|vi)\]([\s\S]*?)\[\/\1\]/g;

/** Bỏ mọi dấu [en]…[/en] để lấy chữ trần. */
export const boMocNnu = (s: string) =>
  (s ?? '').replace(MOC, '$2').replace(/\[\/?(?:en|vi)\]/g, '');

/** Chia một chuỗi thành các đoạn theo ngôn ngữ, giữ nguyên thứ tự.
 *  `goc` là ngôn ngữ của phần không được bọc dấu. */
export function chiaNnu(s: string, goc: Nnu = 'vi'): DoanNnu[] {
  const ra: DoanNnu[] = [];
  let i = 0;
  MOC.lastIndex = 0;
  for (let m = MOC.exec(s); m; m = MOC.exec(s)) {
    if (m.index > i) ra.push({ nnu: goc, text: s.slice(i, m.index) });
    ra.push({ nnu: m[1] as Nnu, text: m[2] });
    i = m.index + m[0].length;
  }
  if (i < s.length) ra.push({ nnu: goc, text: s.slice(i) });

  // Dấu lẻ loi (model bỏ quên vế đóng) không được để lọt ra màn hình hay giọng đọc.
  return ra
    .map((d) => ({ ...d, text: d.text.replace(/\[\/?(?:en|vi)\]/g, '') }))
    .filter((d) => d.text.length > 0)
    .reduce<DoanNnu[]>((gom, d) => {
      const cuoi = gom[gom.length - 1];
      // Đoạn chỉ có khoảng trắng KHÔNG được bỏ đi: nó là chỗ ngăn giữa hai đoạn,
      // vứt là dính chữ — "[en]Read.[/en] [en]Then.[/en]" thành "Read.Then.".
      // Gộp luôn hai đoạn cùng ngôn ngữ liền nhau, vì mỗi đoạn là một lượt tổng
      // hợp riêng; cắt vụn làm giọng ngắt quãng và tốn thêm lượt gọi.
      if (cuoi && (cuoi.nnu === d.nnu || !d.text.trim())) cuoi.text += d.text;
      else gom.push({ ...d });
      return gom;
    }, [])
    .filter((d) => d.text.trim().length > 0);
}

/** Mã ngôn ngữ đầy đủ cho thuộc tính lang / xml:lang. */
export const maNnu = (n: Nnu) => (n === 'en' ? 'en-US' : 'vi-VN');
