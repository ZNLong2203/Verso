
export type Nnu = 'vi' | 'en';

export interface DoanNnu {
  nnu: Nnu;
  text: string;
}

const MOC = /\[(en|vi)\]([\s\S]*?)\[\/\1\]/g;

// Mảnh chỉ toàn dấu câu phải bị bỏ: gửi riêng "." tới Cloud TTS thì máy ĐỌC THÀNH
// LỜI "dấu chấm" — đo được 1,25 giây, dài hơn cả từ "yên bình".
const coChu = (t: string) => /[0-9A-Za-zÀ-ỹ]/.test(t);

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
  const sach = ra
    .map((d) => ({ ...d, text: d.text.replace(/\[\/?(?:en|vi)\]/g, '') }))
    .filter((d) => d.text.length > 0)
    .reduce<DoanNnu[]>((gom, d) => {
      const cuoi = gom[gom.length - 1];
      // Mảnh không có chữ nào — khoảng trắng, dấu chấm, hai chấm — phải DÍNH vào
      // mảnh trước chứ không đứng riêng. Bỏ hẳn thì dính chữ ("Read.Then."), để
      // riêng thì máy đọc nó thành lời ("dấu chấm"). Gộp luôn hai mảnh cùng ngôn
      // ngữ liền nhau, vì mỗi mảnh là một lượt tổng hợp riêng.
      if (cuoi && (cuoi.nnu === d.nnu || !coChu(d.text))) cuoi.text += d.text;
      else gom.push({ ...d });
      return gom;
    }, []);

  // Dấu câu đứng ngay đầu chuỗi thì không có mảnh trước để dính — dồn sang mảnh sau.
  while (sach.length > 1 && !coChu(sach[0].text)) {
    sach[1].text = sach[0].text + sach[1].text;
    sach.shift();
  }
  return sach.filter((d) => d.text.trim().length > 0);
}

/** Mã ngôn ngữ đầy đủ cho thuộc tính lang / xml:lang. */
export const maNnu = (n: Nnu) => (n === 'en' ? 'en-US' : 'vi-VN');
