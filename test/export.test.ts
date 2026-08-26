import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catTheoByte } from '@/lib/tts.server';
import { giayCuaMp3, gioDaisy } from '@/lib/export/mp3';
import { taoZip } from '@/lib/export/zip';
import { taoEpub } from '@/lib/export/epub';
import { taoDaisy, doanCanTieng } from '@/lib/export/daisy';
import { inflateRawSync } from 'node:zlib';
import type { BanVerso, Khoi } from '@/lib/types';

function moZip(z: Buffer): Map<string, Buffer> {
  const ra = new Map<string, Buffer>();
  let i = 0;
  while (i + 30 <= z.length && z.readUInt32LE(i) === 0x04034b50) {
    const pp = z.readUInt16LE(i + 8);
    const coNen = z.readUInt32LE(i + 18);
    const tenDai = z.readUInt16LE(i + 26);
    const thua = z.readUInt16LE(i + 28);
    const ten = z.subarray(i + 30, i + 30 + tenDai).toString('utf8');
    const dau = i + 30 + tenDai + thua;
    const than = z.subarray(dau, dau + coNen);
    ra.set(ten, pp === 8 ? inflateRawSync(than) : Buffer.from(than));
    i = dau + coNen;
  }
  return ra;
}

/* ── công cụ dựng dữ liệu thử ── */
const k = (o: Partial<Khoi>): Khoi =>
  ({ id: 'x', loai: 'van-ban', thuTu: 1, doTinCay: 'cao', daDuyet: true, daSua: false, ...o } as Khoi);

/** Dựng chuỗi khung MPEG2 Layer III hợp lệ — chỉ phần đầu khung là đủ để đo. */
function mp3Gia(soKhung: number): Buffer {
  // MPEG2 (ver=2), Layer III (lop=1), 64 kbps, 24000 Hz, không đệm
  const dai = Math.floor((72 * 64000) / 24000);   // 192 byte mỗi khung
  const b = Buffer.alloc(dai * soKhung);
  for (let i = 0; i < soKhung; i++) {
    const o = i * dai;
    b[o] = 0xff;
    b[o + 1] = 0xf3;   // đồng bộ + ver MPEG2 + layer III
    b[o + 2] = 0x84;   // bitrate index 8 (64 kbps) | samplerate index 1 (24000 Hz)
    b[o + 3] = 0x00;
  }
  return b;
}

const banThu = (): BanVerso => ({
  id: 'd', tieuDe: 'Thử & <xuất>', monHoc: 'tieng-anh', lop: 6,
  nguon: 'Bộ sách thử', nguoiChuyen: 'Cô A', daXuatBan: true, maChiaSe: 'ABCD2345',
  ngayTao: '2026-01-01T00:00:00.000Z', ngayCapNhat: '2026-01-02T00:00:00.000Z',
  trang: [
    { id: 't1', soTrang: 58, thuTu: 1, anhGoc: '', trangThai: 'xong', anhKhongRo: false, ghiChuDocAnh: '', khoi: [
      k({ id: 'a0', loai: 'van-ban', vanBan: 'Câu nằm trước mọi đề mục.' }),
      k({ id: 'a1', loai: 'tieu-de', vanBan: 'Unit 5', capTieuDe: 1, ngonNgu: 'en' }),
      k({ id: 'a2', loai: 'bai-tap', soBaiTap: '1', vanBan: '1. Đọc: [en]Hello there[/en] rồi trả lời [chú thích 1].' }),
      k({ id: 'a3', loai: 'bang', bang: { tieuDeCot: ['[en]Word[/en]', 'Nghĩa'],
        hang: [['[en]peaceful[/en]', 'yên bình']], hangDoc: [], tomTat: 'Bảng từ vựng' } }),
      k({ id: 'a4', loai: 'chu-thich', soChuThich: '1', thuocVe: 'there', vanBan: 'trạng từ chỉ nơi chốn.' }),
      k({ id: 'a5', loai: 'bai-tap', soBaiTap: 'Luyện tập 2', vanBan: 'Viết đoạn văn.' }),
    ] },
    { id: 't2', soTrang: 59, thuTu: 2, anhGoc: '', trangThai: 'xong', anhKhongRo: false, ghiChuDocAnh: '', khoi: [
      k({ id: 'b1', loai: 'tieu-de', vanBan: 'Unit 6', capTieuDe: 1 }),
      k({ id: 'b2', loai: 'bai-tap', soBaiTap: 'Luyện tập 2', vanBan: 'Bài trùng số hiệu.' }),
      k({ id: 'b3', loai: 'chu-thich', soChuThich: '1', vanBan: 'chú thích trùng số ở trang khác.' }),
    ] },
  ],
} as BanVerso);

/* ── cắt theo byte ── */
test('catTheoByte: đo BYTE chứ không đo ký tự', () => {
  // Tiếng Việt có dấu gần 2 byte mỗi chữ; đếm ký tự là vượt trần 5000 của API.
  const cau = 'Tam giác ABC vuông tại A, góc nhọn tại B bằng an-pha. ';
  const dai = cau.repeat(120);
  assert.ok(Buffer.byteLength(dai, 'utf8') > 5000);
  for (const m of catTheoByte(dai)) {
    assert.ok(Buffer.byteLength(m, 'utf8') <= 4200, 'mỗi mảnh phải nằm dưới trần');
  }
  assert.equal(catTheoByte('Ngắn thôi.').length, 1);
});

test('catTheoByte: ghép lại không mất chữ nào', () => {
  const dai = 'Câu thứ nhất. '.repeat(400);
  assert.equal(catTheoByte(dai).join('').replace(/\s+/g, ' ').trim(),
    dai.replace(/\s+/g, ' ').trim());
});

/* ── đo MP3 ── */
test('giayCuaMp3: 100 khung MPEG2 Layer III ở 24 kHz = 2,4 giây', () => {
  assert.equal(giayCuaMp3(mp3Gia(100)).toFixed(3), (100 * 576 / 24000).toFixed(3));
});

test('gioDaisy: đúng dạng giờ của DAISY', () => {
  assert.equal(gioDaisy(83.456), '0:01:23.456');
  assert.equal(gioDaisy(3725.5), '1:02:05.500');
  assert.equal(gioDaisy(0), '0:00:00.000');
});

/* ── ZIP ── */
test('taoZip: mimetype phải là mục ĐẦU TIÊN và KHÔNG nén', () => {
  // Sai điều này là máy đọc sách từ chối cả tệp EPUB.
  const z = taoZip([
    { ten: 'mimetype', noiDung: 'application/epub+zip', khongNen: true },
    { ten: 'khac.txt', noiDung: 'x'.repeat(500) },
  ]);
  assert.equal(z.readUInt32LE(0), 0x04034b50, 'phải mở đầu bằng chữ ký mục cục bộ');
  assert.equal(z.readUInt16LE(8), 0, 'phương pháp nén của mục đầu phải là 0 (lưu nguyên)');
  assert.equal(z.subarray(30, 38).toString(), 'mimetype');
});

/* ── EPUB ── */
test('taoEpub: không để lọt dấu ngôn ngữ, và đánh dấu xml:lang', () => {
  const e = moZip(taoEpub(banThu())).get('EPUB/noi-dung.xhtml')!.toString('utf8');
  assert.ok(!/\[\/?en\]/.test(e), 'dấu [en] không được lọt ra bản đọc');
  assert.ok(e.includes('xml:lang="en-US"'), 'phải đánh dấu phần tiếng Anh');
});

/* ── DAISY ── */
test('taoDaisy: mọi id trong DTBook đều duy nhất', () => {
  const sach = moZip(taoDaisy(banThu())).get('sach.xml')!.toString('utf8');
  const ids = [...sach.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'id trùng làm mục lục nhảy sai chỗ');
});

test('doanCanTieng: theo đúng thứ tự phát và mang ngôn ngữ của khối', () => {
  const ds = doanCanTieng(banThu());
  assert.equal(ds[0].khoiId, 've-ban-doc');
  const thu = ds.map((d) => d.khoiId);
  assert.ok(thu.indexOf('a1') < thu.indexOf('a2'), 'đề mục phải đứng trước phần thân của nó');
  assert.ok(thu.indexOf('a5') < thu.indexOf('b1'), 'hết trang 1 mới sang trang 2');
  assert.equal(ds.find((d) => d.khoiId === 'a1')?.nnu, 'en');
  assert.ok(ds.every((d) => !/\[\/?(en|vi)\]/.test(d.khoiId)));
});

test('DAISY có tiếng: mọi tham chiếu chéo phải phân giải được', () => {
  const ds = doanCanTieng(banThu());
  const tieng = ds.map((d, i) => ({
    khoiId: d.khoiId, par: `par-${i + 1}`,
    tep: `audio/${String(i + 1).padStart(4, '0')}.mp3`,
    mp3: mp3Gia(10), giay: giayCuaMp3(mp3Gia(10)),
  }));
  const tep = moZip(taoDaisy(banThu(), tieng));
  const sach = tep.get('sach.xml')!.toString('utf8');
  const smil = tep.get('sach.smil')!.toString('utf8');
  const ncx = tep.get('navigation.ncx')!.toString('utf8');
  const opf = tep.get('package.opf')!.toString('utf8');
  const par = new Set([...smil.matchAll(/<par id="([^"]+)"/g)].map((m) => m[1]));
  const idDT = new Set([...sach.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

  for (const m of sach.matchAll(/smilref="sach\.smil#([^"]+)"/g)) {
    assert.ok(par.has(m[1]), `smilref trỏ vào đoạn không có: ${m[1]}`);
  }
  for (const m of smil.matchAll(/<text src="sach\.xml#([^"]+)"/g)) {
    assert.ok(idDT.has(m[1]), `SMIL trỏ vào id không có trong DTBook: ${m[1]}`);
  }
  // Mốc nhảy nào cũng phải vào SMIL, kể cả mốc theo số trang và mục "Phần đầu" —
  // trỏ vào chữ thì nhảy xong máy im lặng.
  for (const m of ncx.matchAll(/<content src="([^"]+)"/g)) {
    assert.ok(m[1].startsWith('sach.smil#'), `mốc nhảy còn trỏ vào chữ: ${m[1]}`);
    assert.ok(par.has(m[1].split('#')[1]), `mốc nhảy trỏ vào đoạn không có: ${m[1]}`);
  }
  for (const m of smil.matchAll(/<audio src="([^"]+)"/g)) {
    assert.ok(tep.has(m[1]), `SMIL trỏ vào tệp tiếng không có trong gói: ${m[1]}`);
  }
  assert.ok(opf.includes('audioFullText'));
  assert.ok(!/\[\/?en\]/.test(sach), 'dấu ngôn ngữ không được lọt vào chữ');
});

test('đề mục tiếng Anh cũng phải được đánh dấu ngôn ngữ', () => {
  // Đề mục đi qua đường dựng khác với khối thân bài, rất dễ bị bỏ sót.
  const e = moZip(taoEpub(banThu())).get('EPUB/noi-dung.xhtml')!.toString('utf8');
  const h = /<h\d[^>]*>[^<]*Unit 5/.exec(e)?.[0] ?? '';
  assert.match(h, /lang="en-US"/, `đề mục tiếng Anh trong EPUB chưa có lang: ${h}`);

  const sach = moZip(taoDaisy(banThu())).get('sach.xml')!.toString('utf8');
  const hd = /<h\d[^>]*>[^<]*Unit 5/.exec(sach)?.[0] ?? '';
  assert.match(hd, /xml:lang="en-US"/, `đề mục tiếng Anh trong DTBook chưa có lang: ${hd}`);
});
