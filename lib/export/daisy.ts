import 'server-only';
import type { BanVerso, Khoi } from '@/lib/types';
import { MON_HOC_INFO, MIEN_TRU } from '@/lib/constants';
import { taoZip, xml } from './zip';
import { dungCay, dungNav, dungTrangCua, type Muc, type MucNav } from './outline';
import { dungNeo, neoChuThich, nhanMuc, soTuNeo, loiChuThich, thanBaiTap } from '@/lib/anchors';
import { maSo } from '@/lib/text';
import { loiDocCuaKhoi, doiKyHieuSot } from '@/lib/speechText';
import { giayCuaMp3, gioDaisy } from './mp3';
import { chiaNnu, maNnu, type Nnu } from '@/lib/language';

interface Boi {
  anh: Map<string, Buffer>;
  neo: Map<string, string>;
  trangCua: Map<string, number>;
  /** Chỉ có ở bản CÓ TIẾNG: khối nào ứng với đoạn SMIL nào. */
  par?: Map<string, string>;
  /** Ngôn ngữ của từng khối, tra được cả cho đề mục — Muc không giữ lại Khoi gốc. */
  nnuCua: Map<string, Nnu>;
}

/** Một đoạn tiếng đã tổng hợp, gắn với đúng khối văn bản của nó. */
interface DoanTieng {
  khoiId: string;
  par: string;
  tep: string;
  mp3: Buffer;
  giay: number;
}

/** Dạng nên đọc thành tiếng của một khối. */
const loiDoc = (k: Khoi) => k.vanBanDoc || k.vanBan || '';

function tho(s: string, ct: (t: string) => string): string {
  const kho = s.split(/\n\s*\n/);
  // Từng dòng cũng phải đi qua ct: thơ Ngữ văn đầy chú thích từ Hán-Việt, mà
  // dòng thơ thì không được gộp lại — mỗi <line> là một dòng đúng như trên sách.
  return `<poem>` + kho.map((k) =>
    `<linegroup>` + k.split('\n').filter((d) => d.trim())
      .map((d) => `<line>${ct(d.trim())}</line>`).join('') + `</linegroup>`,
  ).join('') + `</poem>`;
}

/** "[chú thích 3]" thành <noteref> — máy đọc DAISY xướng đây là dấu chú thích
 *  và cho phép nhảy tới lời giải nghĩa rồi quay lại đúng chỗ đang đọc. */
function noiChuThich(s: string, trang: number, goc: Nnu = 'vi'): string {
  const mot = (t: string) => t.split(/(\[chú thích \d+\])/g).map((p) => {
    const m = p.match(/^\[chú thích (\d+)\]$/);
    return m ? `<noteref idref="#${neoChuThich(trang, m[1])}" class="chu-thich">${m[1]}</noteref>` : xml(p);
  }).join('');
  // Đoạn xen tiếng Anh phải mang xml:lang, nếu không máy đọc phát âm bằng tiếng Việt.
  return chiaNnu(s, goc).map((d) =>
    d.nnu === goc ? mot(d.text) : `<span xml:lang="${maNnu(d.nnu)}">${mot(d.text)}</span>`,
  ).join('');
}

function khoiRaDtbook(k: Khoi, b: Boi): string {
  const id = b.neo.get(k.id) ?? `khoi-${k.id}`;
  const ct = (t: string) => noiChuThich(t, b.trangCua.get(k.id) ?? 1, goc);
  // smilref nối khối văn bản với đoạn tiếng của nó. Thiếu nó thì máy đọc DAISY
  // phát được tiếng nhưng không biết đang đọc tới chữ nào — mất hẳn khả năng
  // nhảy theo câu và tô sáng theo tiếng.
  const sr = b.par?.get(k.id) ? ` smilref="sach.smil#${b.par.get(k.id)}"` : '';
  const goc: Nnu = k.ngonNgu === 'en' ? 'en' : 'vi';
  // xml:lang là thứ máy đọc DAISY dùng để đổi bộ phát âm ở bản chỉ có chữ.
  const lg = goc === 'en' ? ` xml:lang="${maNnu('en')}"` : '';
  switch (k.loai) {
    case 'van-ban':
      // Chạy cả dạng đọc qua noiChuThich: dấu chú thích vẫn còn trong đó, và
      // giữ được nó thành <noteref> nghĩa là người nghe nhảy tới lời giải nghĩa được.
      return `<p id="${xml(id)}"${sr}${lg}>${ct(k.vanBanDoc || k.vanBan || '')}</p>`;

    case 'tho':
      return `<div id="${xml(id)}"${sr}${lg}>` + tho(k.vanBan ?? '', ct) + `</div>`;

    case 'hinh-anh':
      // prodnote render="required" = lời do người làm sách thêm vào, BẮT BUỘC đọc.
      // Đúng nghĩa với mô tả hình: không có nó thì học sinh mất hẳn nội dung.
      // <imggroup> là cấu trúc DTBook dành đúng cho "một hình kèm lời mô tả":
      // máy đọc hiểu prodnote là lời người làm sách thêm vào cho hình bên cạnh.
      if (k.maHinh && b.anh.has(k.maHinh)) {
        return `<imggroup id="${xml(id)}"${sr}${lg}>`
          + `<img id="a-${xml(id)}" src="hinh/${xml(k.maHinh)}.jpg" alt=""/>`
          + `<prodnote render="required"><p>Mô tả hình vẽ: ${xml(k.moTa)}</p></prodnote>`
          + `</imggroup>`;
      }
      return `<prodnote id="${xml(id)}"${sr}${lg} render="required"><p>Mô tả hình vẽ: ${xml(k.moTa)}</p></prodnote>`;

    case 'cong-thuc':
      return `<p id="${xml(id)}"${sr} class="cong-thuc">${xml(k.docThanhLoi || k.kyHieuGoc)}</p>`;

    case 'bang': {
      const b = k.bang;
      if (!b) return '';
      const coDoc = (b.hangDoc?.length ?? 0) > 0;
      const o = (v: string, r: number, c: number) =>
        ct((coDoc ? b.hangDoc?.[r]?.[c] : '') || v);
      return `<table id="${xml(id)}"${sr}${lg}><caption>${ct(b.tomTat)}</caption>`
        + `<thead><tr>${b.tieuDeCot.map((c) => `<th>${ct(c)}</th>`).join('')}</tr></thead><tbody>`
        + b.hang.map((h, r) => `<tr>${h.map((v, c) => `<td>${o(v, r, c)}</td>`).join('')}</tr>`).join('')
        + `</tbody></table>`;
    }

    case 'bai-tap': {
      const dan = `${nhanMuc(k)}. `;
      const than = ct(thanBaiTap(k));
      return `<p id="${xml(id)}"${sr}${lg} class="bai-tap">${xml(dan)}${than}</p>`;
    }

    case 'chu-thich': {
      // Xướng "Chú thích 1" trước lời giải nghĩa: người nghe nhảy tới đây từ
      // giữa bài, cần biết ngay mình đang nghe chú thích số mấy.
      const so = soTuNeo(id);
      return `<note id="${xml(id)}"${sr}${lg}><p>Chú thích${so ? ` ${so}` : ''}: `
        + ct(loiChuThich(k)) + `</p></note>`;
    }

    case 'khung-luu-y':
      return `<sidebar id="${xml(id)}"${sr}${lg} render="required"><p>${xml(k.vanBan)}</p></sidebar>`;

    default:
      return `<p id="${xml(id)}"${sr}>${xml(loiDoc(k))}</p>`;
  }
}

/** Câu mở đầu, dùng chung cho cả phần chữ lẫn phần tiếng nên hai bên không lệch. */
function loiMoDau(ban: BanVerso): string {
  const mon = MON_HOC_INFO[ban.monHoc] ?? MON_HOC_INFO.khac;
  return [
    `${mon.ten}${ban.lop ? `, lớp ${ban.lop}` : ''}. ${ban.trang.length} trang sách.`,
    ban.nguon ? `Nguồn: ${ban.nguon}.` : '',
    MIEN_TRU,
  ].filter(Boolean).join(' ');
}

export function doanCanTieng(ban: BanVerso): { khoiId: string; text: string; nnu: 'vi' | 'en' }[] {
  const neo = dungNeo(ban);
  const cay = dungCay(ban, neo);
  // Đề mục cũng có thể là tiếng Anh. Muc không giữ lại Khoi gốc nên tra bảng riêng.
  const nnuCua = new Map<string, 'vi' | 'en'>();
  for (const t of ban.trang) for (const k of t.khoi) nnuCua.set(k.id, k.ngonNgu === 'en' ? 'en' : 'vi');
  const ra: { khoiId: string; text: string; nnu: 'vi' | 'en' }[] =
    [{ khoiId: 've-ban-doc', text: doiKyHieuSot(loiMoDau(ban)), nnu: 'vi' }];

  const diMuc = (m: Muc) => {
    if (m.id.startsWith('khoi-')) {
      const id = m.id.slice(5);
      ra.push({ khoiId: id, text: doiKyHieuSot(m.nhan), nnu: nnuCua.get(id) ?? 'vi' });
    }
    for (const k of m.khoi) {
      const t = loiDocCuaKhoi(k).trim();
      if (t) ra.push({ khoiId: k.id, text: t, nnu: k.ngonNgu === 'en' ? 'en' : 'vi' });
    }
    m.con.forEach(diMuc);
  };
  cay.forEach(diMuc);
  return ra.filter((d) => d.text.trim().length > 1);
}

export function taoDaisy(ban: BanVerso, tieng?: DoanTieng[], anh: Map<string, Buffer> = new Map()): Buffer {
  const coTieng = !!tieng?.length;
  const nnuKhoi = new Map<string, Nnu>();
  for (const t of ban.trang) for (const x of t.khoi) nnuKhoi.set(x.id, x.ngonNgu === 'en' ? 'en' : 'vi');
  const boi: Boi = {
    anh,
    neo: dungNeo(ban),
    trangCua: dungTrangCua(ban),
    nnuCua: nnuKhoi,
    par: coTieng ? new Map(tieng!.map((d) => [d.khoiId, d.par])) : undefined,
  };
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
  const parMoDau = boi.par?.get('ve-ban-doc');
  const srMoDau = parMoDau ? ` smilref="sach.smil#${parMoDau}"` : '';

  const danhSoTrang = (k: Khoi) => {
    const so = dauTrang.get(k.id);
    if (!so) return '';
    // Gắn pagenum vào chính đoạn tiếng của khối mở đầu trang: nhảy "tới trang 71"
    // sẽ phát từ đầu trang 71, chứ không rơi vào một mốc câm.
    const sr = boi.par?.get(k.id) ? ` smilref="sach.smil#${boi.par.get(k.id)}"` : '';
    return `<pagenum id="trang-${maSo(so)}"${sr} page="normal">${xml(so)}</pagenum>`;
  };

  const parDauCuaMuc = (m: Muc): string | undefined => {
    const tuDeMuc = m.id.startsWith('khoi-') ? boi.par?.get(m.id.slice(5)) : undefined;
    if (tuDeMuc) return tuDeMuc;
    for (const k of m.khoi) { const x = boi.par?.get(k.id); if (x) return x; }
    for (const c of m.con) { const x = parDauCuaMuc(c); if (x) return x; }
    return undefined;
  };
  const mucRaDtbook = (m: Muc): string => {
    const cap = Math.min(m.cap, 3);
    // Trang mới thường bắt đầu ĐÚNG ở một đề mục, mà đề mục thì thành <level>
    // chứ không phải khối — nên phải tra riêng, nếu không mất hẳn số trang đó.
    const soMo = m.id.startsWith('khoi-') ? dauTrang.get(m.id.slice(5)) : undefined;
    // pagenum phải nằm SAU thẻ h: DTBook không cho nội dung nào đứng trước đề mục
    // trong cùng một level.
    // Đề mục cũng cần smilref: nhảy tới một chương là phải phát đúng tiếng đọc
    // tên chương đó, không phải im lặng cho tới đoạn văn đầu tiên.
    const parH = parDauCuaMuc(m);
    const srH = parH ? ` smilref="sach.smil#${parH}"` : '';
    const gocH: Nnu = (m.id.startsWith('khoi-') ? boi.nnuCua.get(m.id.slice(5)) : undefined) ?? 'vi';
    const lgH = gocH === 'en' ? ` xml:lang="${maNnu('en')}"` : '';
    const nhanH = chiaNnu(m.nhan, gocH).map((d) =>
      d.nnu === gocH ? xml(d.text) : `<span xml:lang="${maNnu(d.nnu)}">${xml(d.text)}</span>`,
    ).join('');
    // Đánh dấu trên chính thẻ h, không phải trên <level>: level bọc cả phần thân,
    // mà thân thường vẫn là tiếng Việt.
    return `<level${cap} id="${xml(m.id)}"><h${cap}${srH}${lgH}>${nhanH}</h${cap}>`
      + (soMo ? `<pagenum id="trang-${maSo(soMo)}"${srH} page="normal">${xml(soMo)}</pagenum>` : '')
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
<p${srMoDau}>${xml(loiMoDau(ban))}</p>
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
  // Khi có tiếng, mọi mốc nhảy phải trỏ vào SMIL chứ không phải DTBook: máy đọc
  // DAISY lấy chính src này làm điểm BẮT ĐẦU PHÁT. Trỏ vào chữ là nhảy xong im lặng.
  const parTheoNeo = new Map<string, string>();
  if (coTieng) {
    for (const d of tieng!) {
      const anchor = d.khoiId === 've-ban-doc' ? 've-ban-doc' : boi.neo.get(d.khoiId);
      if (anchor) parTheoNeo.set(anchor, d.par);
    }
  }
  // Mốc nhảy theo SỐ TRANG cũng phải trỏ vào tiếng. Neo trang không phải neo khối,
  // nên phải bắc cầu riêng: trang 71 → khối mở đầu trang 71 → đoạn tiếng của nó.
  // Thiếu bước này thì "nhảy tới trang 71" xong máy im lặng.
  if (coTieng) {
    for (const [khoiId, so] of dauTrang) {
      const par = boi.par?.get(khoiId);
      if (par) parTheoNeo.set(`trang-${maSo(so)}`, par);
    }
  }

  if (coTieng) {
    const di = (m: Muc) => {
      const x = parDauCuaMuc(m);
      if (x && !parTheoNeo.has(m.id)) parTheoNeo.set(m.id, x);
      m.con.forEach(di);
    };
    cay.forEach(di);
  }

  const dich = (neoId: string) =>
    coTieng && parTheoNeo.has(neoId) ? `sach.smil#${parTheoNeo.get(neoId)}` : `sach.xml#${neoId}`;

  let thuTu = 0;
  const raDiem = (ds: MucNav[], cap: number): string =>
    ds.map((m) => {
      const n = ++thuTu;
      const c = Math.min(cap, 6);
      return `<navPoint id="np-${n}" playOrder="${n}" class="level${c}">`
        + `<navLabel><text>${xml(m.nhan)}</text></navLabel>`
        + `<content src="${xml(dich(m.id))}"/>`
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
  + `<navLabel><text>${xml(t.so)}</text></navLabel><content src="${xml(dich(t.id))}"/></pageTarget>`).join('\n')}
</pageList>
</ncx>`;

  const tongGiay = (tieng ?? []).reduce((a, d) => a + d.giay, 0);

  const smil = !coTieng ? '' : `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE smil PUBLIC "-//NISO//DTD dtbsmil 2005-2//EN" "http://www.daisy.org/z3986/2005/dtbsmil-2005-2.dtd">
<smil xmlns="http://www.w3.org/2001/SMIL20/">
<head>
<meta name="dtb:uid" content="${xml(uid)}"/>
<meta name="dtb:totalElapsedTime" content="0:00:00"/>
<meta name="dtb:generator" content="Verso"/>
</head>
<body>
<seq id="chuoi-chinh" dur="${tongGiay.toFixed(3)}s">
${tieng!.map((d) => {
  const anchor = d.khoiId === 've-ban-doc' ? 've-ban-doc' : (boi.neo.get(d.khoiId) ?? `khoi-${d.khoiId}`);
  return `<par id="${xml(d.par)}"><text src="sach.xml#${xml(anchor)}"/>`
    + `<audio src="${xml(d.tep)}" clipBegin="0:00:00.000" clipEnd="${gioDaisy(d.giay)}"/></par>`;
}).join('\n')}
</seq>
</body>
</smil>`;

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
<meta name="dtb:multimediaType" content="${coTieng ? 'audioFullText' : 'textNCX'}"/>
<meta name="dtb:multimediaContent" content="${coTieng ? 'audio,text' : 'text'}"/>
<meta name="dtb:totalTime" content="${coTieng ? gioDaisy(tongGiay) : '0:00:00'}"/>
</x-metadata>
</metadata>
<manifest>
<item id="opf" href="package.opf" media-type="text/xml"/>
<item id="sach" href="sach.xml" media-type="application/x-dtbook+xml"/>
<item id="ncx" href="navigation.ncx" media-type="application/x-dtbncx+xml"/>
${[...anh.keys()].map((m) => `<item id="h${m.slice(0, 8)}" href="hinh/${xml(m)}.jpg" media-type="image/jpeg"/>`).join('\n')}
${coTieng ? '<item id="smil" href="sach.smil" media-type="application/smil"/>' : ''}
${coTieng ? tieng!.map((d, i) => `<item id="am${i + 1}" href="${xml(d.tep)}" media-type="audio/mpeg"/>`).join('\n') : ''}
</manifest>
<spine><itemref idref="${coTieng ? 'smil' : 'sach'}"/></spine>
</package>`;

  return taoZip([
    { ten: 'package.opf', noiDung: opf },
    { ten: 'sach.xml', noiDung: dtbook },
    { ten: 'navigation.ncx', noiDung: ncx },
    ...(coTieng ? [{ ten: 'sach.smil', noiDung: smil }] : []),
    // MP3 đã nén rồi, nén lại chỉ tốn thời gian mà không nhỏ đi.
    ...(tieng ?? []).map((d) => ({ ten: d.tep, noiDung: d.mp3, khongNen: true })),
    ...[...anh].map(([m, d]) => ({ ten: `hinh/${m}.jpg`, noiDung: d, khongNen: true })),
  ]);
}
