import 'server-only';
import type { BanVerso, Khoi } from '@/lib/types';
import { MON_HOC_INFO, MIEN_TRU } from '@/lib/constants';
import { taoZip, xml } from './zip';
import { dungCay, dungNav, dungTrangCua, type Muc, type MucNav } from './noiDung';
import { dungNeo, neoChuThich } from '@/lib/neo';

/** Mọi thứ bộ dựng cần biết ngoài bản thân khối. */
interface Boi { neo: Map<string, string>; trangCua: Map<string, number> }

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
.tho { white-space: pre-wrap; margin: 1em 0 1em 1.5em; }
.cong-thuc { margin: 1em 0; padding: 0.6em 0.9em; background: #f3f0e8; border-radius: 6px; }
figure { margin: 1em 0; padding: 0.8em 1em; background: #f3f0e8; border-radius: 6px; }
figcaption { font-weight: bold; font-size: 0.9em; text-transform: uppercase; letter-spacing: .04em; }
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

/** "[chú thích 3]" → liên kết nhảy tới lời giải nghĩa CỦA CHÍNH TRANG ĐÓ. */
function noiChuThich(s: string, trang: number): string {
  return s.split(/(\[chú thích \d+\])/g).map((p) => {
    const m = p.match(/^\[chú thích (\d+)\]$/);
    return m
      ? `<a href="#${neoChuThich(trang, m[1])}" epub:type="noteref" aria-label="Chú thích ${m[1]}, nhảy tới phần giải nghĩa"><sup>[${m[1]}]</sup></a>`
      : xml(p);
  }).join('');
}

function khoiRaXhtml(k: Khoi, b: Boi): string {
  const id = b.neo.get(k.id) ?? `khoi-${k.id}`;
  const ct = (t: string) => noiChuThich(t, b.trangCua.get(k.id) ?? 1);
  switch (k.loai) {
    case 'van-ban':
      return k.vanBanDoc
        ? `<p><span aria-hidden="true">${ct(k.vanBan ?? '')}</span><span class="chi-doc-man-hinh">${ct(k.vanBanDoc)}</span></p>`
        : `<p>${ct(k.vanBan ?? '')}</p>`;

    case 'tho':
      return `<div class="tho" role="group" aria-label="Đoạn thơ">${ct(k.vanBan ?? '')}</div>`;

    case 'hinh-anh':
      // Mô tả là nội dung thật, không phải thuộc tính alt của một tấm ảnh vắng mặt.
      return `<figure id="${xml(id)}"><figcaption>Mô tả hình vẽ</figcaption><p>${xml(k.moTa)}</p></figure>`;

    case 'cong-thuc':
      return `<div id="${xml(id)}" class="cong-thuc" role="math" aria-label="${xml(k.docThanhLoi || k.kyHieuGoc)}">`
        + capDoi(k.kyHieuGoc ?? '', k.docThanhLoi ?? '') + `</div>`;

    case 'bang': {
      const b = k.bang;
      if (!b) return '';
      const coDoc = (b.hangDoc?.length ?? 0) > 0;
      const o = (v: string, r: number, c: number) => {
        const d = coDoc ? b.hangDoc?.[r]?.[c] : undefined;
        return d && d !== v ? capDoi(v, d) : xml(v);
      };
      return `<p class="tom-tat">${xml(b.tomTat)}</p><table><caption class="chi-doc-man-hinh">${xml(b.tomTat)}</caption>`
        + `<thead><tr>${b.tieuDeCot.map((c) => `<th scope="col">${xml(c)}</th>`).join('')}</tr></thead><tbody>`
        + b.hang.map((h, r) => `<tr>${h.map((v, c) =>
            c === 0 ? `<th scope="row">${o(v, r, c)}</th>` : `<td>${o(v, r, c)}</td>`).join('')}</tr>`).join('')
        + `</tbody></table>`;
    }

    case 'bai-tap': {
      const dan = k.soBaiTap ? `Bài tập ${k.soBaiTap}. ` : 'Bài tập. ';
      const than = k.vanBanDoc
        ? `<span aria-hidden="true">${ct(k.vanBan ?? '')}</span><span class="chi-doc-man-hinh">${ct(k.vanBanDoc)}</span>`
        : ct(k.vanBan ?? '');
      return `<div class="bai-tap" id="${xml(id)}"><span class="chi-doc-man-hinh">${xml(dan)}</span>${than}</div>`;
    }

    case 'chu-thich': {
      const so = (k.vanBan ?? '').match(/^\((\d+)\)/)?.[1];
      return `<aside epub:type="footnote" id="${xml(id)}">`
        + `<span class="chi-doc-man-hinh">Chú thích${so ? ` ${so}` : ''}: </span>`
        + (k.thuocVe ? `<b>${xml(k.thuocVe)}: </b>` : '') + xml(k.vanBan) + `</aside>`;
    }

    case 'khung-luu-y':
      return `<aside id="${xml(id)}" aria-label="Khung lưu ý">${xml(k.vanBan)}</aside>`;

    default:
      return `<p>${xml(k.vanBan)}</p>`;
  }
}

function mucRaXhtml(m: Muc, b: Boi, lech = 1): string {
  const cap = Math.min(m.cap + lech, 6);
  return `<section id="${xml(m.id)}"><h${cap}>${xml(m.nhan)}</h${cap}>`
    + m.khoi.map((k) => khoiRaXhtml(k, b)).join('\n')
    + m.con.map((c) => mucRaXhtml(c, b, lech)).join('\n')
    + `</section>`;
}

export function taoEpub(ban: BanVerso): Buffer {
  const boi: Boi = { neo: dungNeo(ban), trangCua: dungTrangCua(ban) };
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
  ]);
}
