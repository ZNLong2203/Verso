import 'server-only';
import type { BanVerso, Khoi } from '@/lib/types';
import { MON_HOC_INFO, MIEN_TRU } from '@/lib/constants';
import { taoZip, xml } from './zip';
import { dungCay, dungNav, dungTrangCua, type Muc, type MucNav } from './noiDung';
import { dungNeo, neoChuThich, nhanMuc } from '@/lib/neo';
import { maSo } from '@/lib/chuoi';

interface Boi { neo: Map<string, string>; trangCua: Map<string, number> }

/** Xuất DAISY 3 dạng chỉ có chữ (ANSI/NISO Z39.86, "textNCX").
 *
 *  Khác EPUB ở một điểm cốt lõi: DAISY sinh ra để NGHE, nên chỗ nào có dạng đọc
 *  thành lời thì dạng đọc CHÍNH LÀ văn bản. DTBook không có aria-hidden, giữ cả
 *  hai sẽ khiến máy đọc "x mũ hai cộng một, x bình phương cộng một" — nghe lắp bắp.
 *
 *  Điểm đáng giá nhất của định dạng này với lớp học: <pagenum> giữ số trang SÁCH
 *  GIẤY, nên thầy cô bảo "mở trang 71" là học sinh nhảy thẳng tới trang 71. */

/** Dạng nên đọc thành tiếng của một khối. */
const loiDoc = (k: Khoi) => k.vanBanDoc || k.vanBan || '';

function tho(s: string): string {
  const kho = s.split(/\n\s*\n/);
  return `<poem>` + kho.map((k) =>
    `<linegroup>` + k.split('\n').filter((d) => d.trim())
      .map((d) => `<line>${xml(d.trim())}</line>`).join('') + `</linegroup>`,
  ).join('') + `</poem>`;
}

/** "[chú thích 3]" thành <noteref> — máy đọc DAISY xướng đây là dấu chú thích
 *  và cho phép nhảy tới lời giải nghĩa rồi quay lại đúng chỗ đang đọc. */
function noiChuThich(s: string, trang: number): string {
  return s.split(/(\[chú thích \d+\])/g).map((p) => {
    const m = p.match(/^\[chú thích (\d+)\]$/);
    return m ? `<noteref idref="#${neoChuThich(trang, m[1])}" class="chu-thich">${m[1]}</noteref>` : xml(p);
  }).join('');
}

function khoiRaDtbook(k: Khoi, b: Boi): string {
  const id = b.neo.get(k.id) ?? `khoi-${k.id}`;
  const ct = (t: string) => noiChuThich(t, b.trangCua.get(k.id) ?? 1);
  switch (k.loai) {
    case 'van-ban':
      // Chạy cả dạng đọc qua noiChuThich: dấu chú thích vẫn còn trong đó, và
      // giữ được nó thành <noteref> nghĩa là người nghe nhảy tới lời giải nghĩa được.
      return `<p>${ct(k.vanBanDoc || k.vanBan || '')}</p>`;

    case 'tho':
      return tho(k.vanBan ?? '');

    case 'hinh-anh':
      // prodnote render="required" = lời do người làm sách thêm vào, BẮT BUỘC đọc.
      // Đúng nghĩa với mô tả hình: không có nó thì học sinh mất hẳn nội dung.
      return `<prodnote id="${xml(id)}" render="required"><p>Mô tả hình vẽ: ${xml(k.moTa)}</p></prodnote>`;

    case 'cong-thuc':
      return `<p id="${xml(id)}" class="cong-thuc">${xml(k.docThanhLoi || k.kyHieuGoc)}</p>`;

    case 'bang': {
      const b = k.bang;
      if (!b) return '';
      const coDoc = (b.hangDoc?.length ?? 0) > 0;
      const o = (v: string, r: number, c: number) =>
        xml((coDoc ? b.hangDoc?.[r]?.[c] : '') || v);
      return `<table id="${xml(id)}"><caption>${xml(b.tomTat)}</caption>`
        + `<thead><tr>${b.tieuDeCot.map((c) => `<th>${xml(c)}</th>`).join('')}</tr></thead><tbody>`
        + b.hang.map((h, r) => `<tr>${h.map((v, c) => `<td>${o(v, r, c)}</td>`).join('')}</tr>`).join('')
        + `</tbody></table>`;
    }

    case 'bai-tap': {
      const dan = k.soBaiTap ? `${nhanMuc(k)}. ` : 'Bài tập. ';
      const than = ct(k.vanBanDoc || k.vanBan || '');
      return `<p id="${xml(id)}" class="bai-tap">${xml(dan)}${than}</p>`;
    }

    case 'chu-thich': {
      return `<note id="${xml(id)}"><p>`
        + (k.thuocVe ? `${xml(k.thuocVe)}: ` : '') + xml(k.vanBan) + `</p></note>`;
    }

    case 'khung-luu-y':
      return `<sidebar id="${xml(id)}" render="required"><p>${xml(k.vanBan)}</p></sidebar>`;

    default:
      return `<p>${xml(loiDoc(k))}</p>`;
  }
}

export function taoDaisy(ban: BanVerso): Buffer {
  const boi: Boi = { neo: dungNeo(ban), trangCua: dungTrangCua(ban) };
  const cay = dungCay(ban, boi.neo);
  const mon = MON_HOC_INFO[ban.monHoc] ?? MON_HOC_INFO.khac;
  const uid = `verso-${ban.maChiaSe || ban.id}`;
  const ngay = (ban.ngayCapNhat || ban.ngayTao || '').slice(0, 10) || '2026-01-01';

  // Số trang sách giấy gắn vào khối ĐẦU TIÊN của mỗi trang, để chèn <pagenum>
  // đúng chỗ trong dòng chảy nội dung.
  const dauTrang = new Map<string, string>();
  ban.trang.forEach((t) => {
    const d = t.khoi[0];
    if (d) dauTrang.set(d.id, String(t.soTrang || t.thuTu));
  });
  const dsTrang = ban.trang.map((t, i) => {
    const so = String(t.soTrang || t.thuTu || i + 1);
    return { so, id: `trang-${maSo(so)}` };
  });
  const soTrangCuoi = dsTrang.reduce((m, t) => Math.max(m, parseInt(t.so, 10) || 0), 0);

  const danhSoTrang = (k: Khoi) => {
    const so = dauTrang.get(k.id);
    if (!so) return '';
    return `<pagenum id="trang-${maSo(so)}" page="normal">${xml(so)}</pagenum>`;
  };

  const mucRaDtbook = (m: Muc): string => {
    const cap = Math.min(m.cap, 3);
    // Trang mới thường bắt đầu ĐÚNG ở một đề mục, mà đề mục thì thành <level>
    // chứ không phải khối — nên phải tra riêng, nếu không mất hẳn số trang đó.
    const soMo = m.id.startsWith('khoi-') ? dauTrang.get(m.id.slice(5)) : undefined;
    // pagenum phải nằm SAU thẻ h: DTBook không cho nội dung nào đứng trước đề mục
    // trong cùng một level.
    return `<level${cap} id="${xml(m.id)}"><h${cap}>${xml(m.nhan)}</h${cap}>`
      + (soMo ? `<pagenum id="trang-${maSo(soMo)}" page="normal">${xml(soMo)}</pagenum>` : '')
      + m.khoi.map((k) => danhSoTrang(k) + khoiRaDtbook(k, boi)).join('\n')
      + m.con.map(mucRaDtbook).join('\n')
      + `</level${cap}>`;
  };

  const dtbook = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE dtbook PUBLIC "-//NISO//DTD dtbook 2005-3//EN" "http://www.daisy.org/z3986/2005/dtbook-2005-3.dtd">
<dtbook xmlns="http://www.daisy.org/z3986/2005/dtbook/" version="2005-3" xml:lang="vi">
<head>
<meta name="dtb:uid" content="${xml(uid)}"/>
<meta name="dc:Title" content="${xml(ban.tieuDe)}"/>
<meta name="dc:Language" content="vi"/>
<meta name="dc:Date" content="${xml(ngay)}"/>
<meta name="dc:Publisher" content="Verso"/>
</head>
<book>
<frontmatter>
<doctitle>${xml(ban.tieuDe)}</doctitle>
${ban.nguoiChuyen ? `<docauthor>${xml(ban.nguoiChuyen)}</docauthor>` : ''}
<level1 id="ve-ban-doc"><h1>Về bản đọc này</h1>
<p>${xml(mon.ten)}${ban.lop ? `, lớp ${ban.lop}` : ''}. ${ban.trang.length} trang sách.</p>
${ban.nguon ? `<p>Nguồn: ${xml(ban.nguon)}.</p>` : ''}
<p>${xml(MIEN_TRU)}</p>
</level1>
</frontmatter>
<bodymatter>
${cay.map(mucRaDtbook).join('\n')}
</bodymatter>
</book>
</dtbook>`;

  // NCX: mục lục để nhảy theo cấp, và pageList để nhảy theo số trang sách giấy.
  // navMap phải lồng nhau và theo đúng thứ tự đọc: máy đọc DAISY dùng playOrder
  // để biết "đang ở đâu", nhảy lùi số thứ tự sẽ làm nút chuyển mục chạy sai.
  let thuTu = 0;
  const raDiem = (ds: MucNav[], cap: number): string =>
    ds.map((m) => {
      const n = ++thuTu;
      const c = Math.min(cap, 6);
      return `<navPoint id="np-${n}" playOrder="${n}" class="level${c}">`
        + `<navLabel><text>${xml(m.nhan)}</text></navLabel>`
        + `<content src="sach.xml#${xml(m.id)}"/>`
        + (m.con.length ? raDiem(m.con, cap + 1) : '')
        + `</navPoint>`;
    }).join('\n');

  const navMap = raDiem(
    [{ id: 've-ban-doc', nhan: 'Về bản đọc này', con: [] }, ...dungNav(cay, boi.neo)],
    1,
  );

  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="vi">
<head>
<meta name="dtb:uid" content="${xml(uid)}"/>
<meta name="dtb:depth" content="3"/>
<meta name="dtb:totalPageCount" content="${dsTrang.length}"/>
<meta name="dtb:maxPageNumber" content="${soTrangCuoi}"/>
<meta name="dtb:generator" content="Verso"/>
</head>
<docTitle><text>${xml(ban.tieuDe)}</text></docTitle>
${ban.nguoiChuyen ? `<docAuthor><text>${xml(ban.nguoiChuyen)}</text></docAuthor>` : ''}
<navMap>
${navMap}
</navMap>
<pageList id="ds-trang">
${dsTrang.map((t, i) => `<pageTarget id="pt-${i + 1}" type="normal" value="${parseInt(t.so, 10) || i + 1}" playOrder="${thuTu + i + 1}">`
  + `<navLabel><text>${xml(t.so)}</text></navLabel><content src="sach.xml#${xml(t.id)}"/></pageTarget>`).join('\n')}
</pageList>
</ncx>`;

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE package PUBLIC "+//ISBN 0-9673008-1-9//DTD OEB 1.2 Package//EN" "http://openebook.org/dtds/oeb-1.2/oebpkg12.dtd">
<package xmlns="http://openebook.org/namespaces/oeb-package/1.0/" unique-identifier="uid">
<metadata>
<dc-metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:Title>${xml(ban.tieuDe)}</dc:Title>
<dc:Identifier id="uid">${xml(uid)}</dc:Identifier>
<dc:Language>vi</dc:Language>
<dc:Date>${xml(ngay)}</dc:Date>
<dc:Publisher>Verso</dc:Publisher>
${ban.nguoiChuyen ? `<dc:Contributor>${xml(ban.nguoiChuyen)}</dc:Contributor>` : ''}
${ban.nguon ? `<dc:Source>${xml(ban.nguon)}</dc:Source>` : ''}
<dc:Rights>${xml(MIEN_TRU)}</dc:Rights>
</dc-metadata>
<x-metadata>
<meta name="dtb:multimediaType" content="textNCX"/>
<meta name="dtb:multimediaContent" content="text"/>
<meta name="dtb:totalTime" content="0:00:00"/>
</x-metadata>
</metadata>
<manifest>
<item id="opf" href="package.opf" media-type="text/xml"/>
<item id="sach" href="sach.xml" media-type="application/x-dtbook+xml"/>
<item id="ncx" href="navigation.ncx" media-type="application/x-dtbncx+xml"/>
</manifest>
<spine><itemref idref="sach"/></spine>
</package>`;

  return taoZip([
    { ten: 'package.opf', noiDung: opf },
    { ten: 'sach.xml', noiDung: dtbook },
    { ten: 'navigation.ncx', noiDung: ncx },
  ]);
}
