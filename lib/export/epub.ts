import 'server-only';
import type { BanVerso, Khoi } from '@/lib/types';
import { MON_HOC_INFO, MIEN_TRU } from '@/lib/constants';
import { taoZip, xml } from './zip';
import { dungCay, dungNav, dungTrangCua, type Muc, type MucNav } from './outline';
import { dungNeo, neoChuThich, soTuNeo, loiChuThich, thanBaiTap, nhanMuc } from '@/lib/anchors';
import { chiaNnu, maNnu, type Nnu } from '@/lib/language';

/** Mọi thứ bộ dựng cần biết ngoài bản thân khối. */
interface Boi {
  anh: Map<string, Buffer>;
  neo: Map<string, string>;
  trangCua: Map<string, number>;
  /** Ngôn ngữ của từng khối, tra được cả cho đề mục — Muc không giữ lại Khoi gốc. */
  nnuCua: Map<string, Nnu>;
}

/** Xuất EPUB 3.
 *
 *  EPUB giữ CẢ HAI dạng như trang web: ký hiệu cho người sáng mắt (aria-hidden),
 *  dạng đọc thành lời cho trình đọc màn hình (ẩn khỏi mắt). Khác với DAISY —
 *  DAISY sinh ra để nghe nên ở đó dạng đọc là văn bản chính. */

const CSS = `
body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.7; margin: 1em; }
h1,h2,h3,h4 { line-height: 1.3; }
.chi-doc-man-hinh { position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
.chi-doc-man-hinh:focus-within { position: static; width: auto; height: auto;
  overflow: visible; clip: auto; clip-path: none; white-space: normal; }
.tho { white-space: pre-wrap; margin: 1em 0 1em 1.5em; }
.cong-thuc { margin: 1em 0; padding: 0.6em 0.9em; background: #f3f0e8; border-radius: 6px; }
figure { margin: 1em 0; padding: 0.8em 1em; background: #f3f0e8; border-radius: 6px; }
figure img { display: block; max-width: 100%; height: auto; margin: 0 auto 0.8em; background: #fff; }
figcaption .nhan-hinh { display: block; font-weight: bold; font-size: 0.9em; text-transform: uppercase; letter-spacing: .04em; }
figcaption p { margin: .4em 0 0; font-weight: normal; text-transform: none; letter-spacing: 0; }
.bai-tap { margin: 1.2em 0; padding-left: 1em; border-left: 4px solid #8a7a5c; }
aside { margin: 1em 0; padding: 0.6em 1em; border-left: 4px solid #b9ac8e; font-size: 0.95em; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { border: 1px solid #b9ac8e; padding: 0.4em 0.6em; text-align: left; }
.tom-tat { font-size: 0.9em; color: #5b5344; }
`.trim();

/** Ký hiệu hiện ra, dạng đọc dành cho trình đọc màn hình.
 *  aria-hidden là bắt buộc — thiếu nó máy sẽ đọc cả hai, nghe thành lắp bắp. */
const capDoi = (kyHieu: string, loi: string) =>
  `<span aria-hidden="true">${xml(kyHieu)}</span><span class="chi-doc-man-hinh">${xml(loi)}</span>`;

/** "[chú thích 3]" → liên kết nhảy tới lời giải nghĩa CỦA CHÍNH TRANG ĐÓ.
 *
 *  coLien = false cho bản chỉ để NHÌN (đã aria-hidden): liên kết nằm trong vùng
 *  aria-hidden thì người dùng bàn phím vẫn tab vào được một thứ trình đọc màn
 *  hình không hề xướng. */
function noiChuThich(s: string, trang: number, coLien = true, goc: Nnu = 'vi'): string {
  const mot = (t: string) => t.split(/(\[chú thích \d+\])/g).map((p) => {
    const m = p.match(/^\[chú thích (\d+)\]$/);
    if (!m) return xml(p);
    return coLien
      ? `<a href="#${neoChuThich(trang, m[1])}" epub:type="noteref" aria-label="Chú thích ${m[1]}"><sup>[${m[1]}]</sup></a>`
      : `<sup>[${m[1]}]</sup>`;
  }).join('');
  // xml:lang trên đoạn xen: trình đọc màn hình đổi bộ phát âm theo chính thuộc tính này.
  return chiaNnu(s, goc).map((d) =>
    d.nnu === goc ? mot(d.text) : `<span xml:lang="${maNnu(d.nnu)}" lang="${maNnu(d.nnu)}">${mot(d.text)}</span>`,
  ).join('');
}

function khoiRaXhtml(k: Khoi, b: Boi): string {
  const id = b.neo.get(k.id) ?? `khoi-${k.id}`;
  const goc: Nnu = k.ngonNgu === 'en' ? 'en' : 'vi';
  const lg = goc === 'en' ? ` xml:lang="${maNnu('en')}" lang="${maNnu('en')}"` : '';
  const ct = (t: string) => noiChuThich(t, b.trangCua.get(k.id) ?? 1, true, goc);
  const ctNhin = (t: string) => noiChuThich(t, b.trangCua.get(k.id) ?? 1, false, goc);
  switch (k.loai) {
    case 'van-ban':
      return k.vanBanDoc
        ? `<p${lg}><span aria-hidden="true">${ctNhin(k.vanBan ?? '')}</span><span class="chi-doc-man-hinh">${ct(k.vanBanDoc)}</span></p>`
        : `<p${lg}>${ct(k.vanBan ?? '')}</p>`;

    case 'tho':
      return `<div class="tho" role="group" aria-label="Đoạn thơ"${lg}>${ct(k.vanBan ?? '')}</div>`;

    case 'hinh-anh':
      // Mô tả là nội dung thật, không phải thuộc tính alt của một tấm ảnh vắng mặt.
      // alt="" là cố ý: mô tả nằm ngay dưới dưới dạng chữ thật, đặt alt nữa là
      // trình đọc màn hình đọc hai lần cùng một nội dung.
      const anh = k.maHinh && b.anh.has(k.maHinh)
        ? `<img src="hinh/${xml(k.maHinh)}.jpg" alt=""/>` : '';
      // figcaption đứng CUỐI và ôm cả phần mô tả: nó phải là con đầu hoặc cuối
      // của figure, kẹp giữa <img> và <p> là XHTML không hợp lệ.
      return `<figure id="${xml(id)}">${anh}<figcaption>`
        + `<span class="nhan-hinh">Mô tả hình vẽ</span>`
        + `<p${lg}>${ct(k.moTa ?? '')}</p></figcaption></figure>`;

    case 'cong-thuc':
      return `<div id="${xml(id)}" class="cong-thuc" role="math" aria-label="${xml(k.docThanhLoi || k.kyHieuGoc)}">`
        + capDoi(k.kyHieuGoc ?? '', k.docThanhLoi ?? '') + `</div>`;

    case 'bang': {
      const b = k.bang;
      if (!b) return '';
      const coDoc = (b.hangDoc?.length ?? 0) > 0;
      const o = (v: string, r: number, c: number) => {
        const d = coDoc ? b.hangDoc?.[r]?.[c] : undefined;
        return d && d !== v ? capDoi(v, d) : ct(v);
      };
      return `<p class="tom-tat" aria-hidden="true"${lg}>${ct(b.tomTat)}</p>`
        + `<table${lg}><caption class="chi-doc-man-hinh">${ct(b.tomTat)}</caption>`
        + `<thead><tr>${b.tieuDeCot.map((c) => `<th scope="col">${ct(c)}</th>`).join('')}</tr></thead><tbody>`
        + b.hang.map((h, r) => `<tr>${h.map((v, c) =>
            c === 0 ? `<th scope="row">${o(v, r, c)}</th>` : `<td>${o(v, r, c)}</td>`).join('')}</tr>`).join('')
        + `</tbody></table>`;
    }

    case 'bai-tap': {
      const dan = `${nhanMuc(k)}. `;
      const than = k.vanBanDoc
        ? `<span aria-hidden="true">${ctNhin(k.vanBan ?? '')}</span><span class="chi-doc-man-hinh">${ct(thanBaiTap(k))}</span>`
        : ct(thanBaiTap(k));
      return `<div class="bai-tap" id="${xml(id)}"${lg}><span class="chi-doc-man-hinh">${xml(dan)}</span>${than}</div>`;
    }

    case 'chu-thich': {
      const so = soTuNeo(id);
      return `<aside epub:type="footnote" id="${xml(id)}"${lg}>`
        + `<span class="chi-doc-man-hinh">Chú thích${so ? ` ${so}` : ''}: </span>`
        + ct(loiChuThich(k)) + `</aside>`;
    }

    case 'khung-luu-y':
      return `<aside id="${xml(id)}"${lg} aria-label="Khung lưu ý">${ct(k.vanBan ?? '')}</aside>`;

    default:
      return `<p>${xml(k.vanBan)}</p>`;
  }
}

function mucRaXhtml(m: Muc, b: Boi, lech = 1): string {
  const cap = Math.min(m.cap + lech, 6);
  // Đề mục dựng qua đường riêng nên rất dễ quên đánh dấu ngôn ngữ. Quên là trình
  // đọc màn hình đọc "Unit 5. Our Neighbourhood" bằng âm tiếng Việt.
  const goc: Nnu = (m.id.startsWith('khoi-') ? b.nnuCua.get(m.id.slice(5)) : undefined) ?? 'vi';
  // Đánh dấu trên CHÍNH thẻ đề mục, không phải trên <section>: section bọc cả phần
  // thân, mà thân thì thường vẫn là tiếng Việt — đánh dấu ở ngoài là cả chương bị
  // đọc bằng giọng Anh do kế thừa.
  const lg = goc === 'en' ? ` xml:lang="${maNnu('en')}" lang="${maNnu('en')}"` : '';
  const nhan = chiaNnu(m.nhan, goc).map((d) =>
    d.nnu === goc ? xml(d.text) : `<span xml:lang="${maNnu(d.nnu)}" lang="${maNnu(d.nnu)}">${xml(d.text)}</span>`,
  ).join('');
  return `<section id="${xml(m.id)}"><h${cap}${lg}>${nhan}</h${cap}>`
    + m.khoi.map((k) => khoiRaXhtml(k, b)).join('\n')
    + m.con.map((c) => mucRaXhtml(c, b, lech)).join('\n')
    + `</section>`;
}

export function taoEpub(ban: BanVerso, anh: Map<string, Buffer> = new Map()): Buffer {
  const nnuCua = new Map<string, Nnu>();
  for (const t of ban.trang) for (const x of t.khoi) nnuCua.set(x.id, x.ngonNgu === 'en' ? 'en' : 'vi');
  const boi: Boi = { anh, neo: dungNeo(ban), trangCua: dungTrangCua(ban), nnuCua };
  const cay = dungCay(ban, boi.neo);
  const mon = MON_HOC_INFO[ban.monHoc] ?? MON_HOC_INFO.khac;
  const uid = `urn:verso:${ban.maChiaSe || ban.id}`;
  const ngay = (ban.ngayCapNhat || ban.ngayTao || '').slice(0, 10) || '2026-01-01';
  const moiKhoi = ban.trang.flatMap((t) => t.khoi);
  const soHinh = moiKhoi.filter((k) => k.loai === 'hinh-anh').length;

  const than = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="vi" lang="vi">
<head><meta charset="utf-8"/><title>${xml(ban.tieuDe)}</title>
<link rel="stylesheet" type="text/css" href="verso.css"/></head>
<body>
<h1>${xml(ban.tieuDe)}</h1>
<p>${xml(mon.ten)}${ban.lop ? ` · Lớp ${ban.lop}` : ''} · ${ban.trang.length} trang · ${moiKhoi.length} phần${soHinh ? ` · ${soHinh} hình đã được mô tả` : ''}</p>
${cay.map((m) => mucRaXhtml(m, boi)).join('\n')}
<hr/>
<p>${ban.nguoiChuyen ? `Người chuyển đổi: ${xml(ban.nguoiChuyen)}. ` : ''}${xml(MIEN_TRU)}</p>
</body></html>`;

  const dsNav = dungNav(cay, boi.neo);
  const raOl = (ds: MucNav[]): string =>
    `<ol>` + ds.map((m) =>
      `<li><a href="noi-dung.xhtml#${xml(m.id)}">${xml(m.nhan)}</a>`
      + (m.con.length ? raOl(m.con) : '') + `</li>`).join('') + `</ol>`;

  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="vi" lang="vi">
<head><meta charset="utf-8"/><title>Mục lục</title></head>
<body><nav epub:type="toc" id="toc"><h1>Mục lục</h1>
${raOl(dsNav)}
</nav></body></html>`;

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="vi">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">${xml(uid)}</dc:identifier>
<dc:title>${xml(ban.tieuDe)}</dc:title>
<dc:language>vi</dc:language>
<dc:date>${xml(ngay)}</dc:date>
${ban.nguon ? `<dc:source>${xml(ban.nguon)}</dc:source>` : ''}
${ban.nguoiChuyen ? `<dc:contributor>${xml(ban.nguoiChuyen)}</dc:contributor>` : ''}
<dc:publisher>Verso</dc:publisher>
<dc:rights>${xml(MIEN_TRU)}</dc:rights>
<meta property="dcterms:modified">${xml(ngay)}T00:00:00Z</meta>
<meta property="schema:accessMode">textual</meta>
<meta property="schema:accessModeSufficient">textual</meta>
<meta property="schema:accessibilityFeature">structuralNavigation</meta>
<meta property="schema:accessibilityFeature">longDescription</meta>
<meta property="schema:accessibilityFeature">readingOrder</meta>
<meta property="schema:accessibilityHazard">none</meta>
<meta property="schema:accessibilitySummary">Toàn bộ hình vẽ và công thức đã được mô tả thành lời tiếng Việt, có mục lục nhảy nhanh tới từng bài tập.</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="noidung" href="noi-dung.xhtml" media-type="application/xhtml+xml"/>
<item id="css" href="verso.css" media-type="text/css"/>
${[...anh.keys()].map((m) => `<item id="h${m.slice(0, 8)}" href="hinh/${xml(m)}.jpg" media-type="image/jpeg"/>`).join('\n')}
</manifest>
<spine><itemref idref="noidung"/></spine>
</package>`;

  return taoZip([
    // Phải là mục đầu tiên và không nén — quy định của EPUB, sai là máy đọc từ chối.
    { ten: 'mimetype', noiDung: 'application/epub+zip', khongNen: true },
    { ten: 'META-INF/container.xml', noiDung: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>` },
    { ten: 'EPUB/package.opf', noiDung: opf },
    { ten: 'EPUB/nav.xhtml', noiDung: nav },
    { ten: 'EPUB/noi-dung.xhtml', noiDung: than },
    { ten: 'EPUB/verso.css', noiDung: CSS },
    // JPEG đã nén rồi, nén lại chỉ tốn thời gian mà không nhỏ đi.
    ...[...anh].map(([m, d]) => ({ ten: `EPUB/hinh/${m}.jpg`, noiDung: d, khongNen: true })),
  ]);
}
