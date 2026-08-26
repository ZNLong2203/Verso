import 'server-only';
import { deflateRawSync } from 'node:zlib';

// Tự viết thay vì thêm thư viện: EPUB đòi mục `mimetype` nằm ĐẦU TIÊN và KHÔNG NÉN,
// ràng buộc mà đa số thư viện zip giấu đi. Ở đây nó là một tham số rõ ràng.

const BANG_CRC = (() => {
  const b = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    b[i] = c;
  }
  return b;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = BANG_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** Giờ DOS cố định (2020-01-01 00:00) — cùng nội dung thì cùng byte, dễ kiểm thử. */
const NGAY_DOS = ((2020 - 1980) << 9) | (1 << 5) | 1;
const GIO_DOS = 0;

export interface MucZip {
  ten: string;
  noiDung: string | Buffer;
  /** true = lưu nguyên, không nén. Bắt buộc cho `mimetype` của EPUB. */
  khongNen?: boolean;
}

export function taoZip(muc: MucZip[]): Buffer {
  const cucBo: Buffer[] = [];
  const trungTam: Buffer[] = [];
  let viTri = 0;

  for (const m of muc) {
    const ten = Buffer.from(m.ten, 'utf8');
    const goc = Buffer.isBuffer(m.noiDung) ? m.noiDung : Buffer.from(m.noiDung, 'utf8');
    const nen = m.khongNen ? goc : deflateRawSync(goc, { level: 9 });
    // Nén mà không nhỏ đi thì lưu nguyên cho đỡ phí
    const dungNen = !m.khongNen && nen.length < goc.length;
    const than = dungNen ? nen : goc;
    const pp = dungNen ? 8 : 0;
    const crc = crc32(goc);

    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);          // cần phiên bản 2.0
    h.writeUInt16LE(0x0800, 6);      // cờ: tên file mã hoá UTF-8
    h.writeUInt16LE(pp, 8);
    h.writeUInt16LE(GIO_DOS, 10);
    h.writeUInt16LE(NGAY_DOS, 12);
    h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(than.length, 18);
    h.writeUInt32LE(goc.length, 22);
    h.writeUInt16LE(ten.length, 26);
    h.writeUInt16LE(0, 28);
    cucBo.push(h, ten, than);

    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);          // phiên bản tạo ra
    c.writeUInt16LE(20, 6);          // phiên bản cần để giải nén
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(pp, 10);
    c.writeUInt16LE(GIO_DOS, 12);
    c.writeUInt16LE(NGAY_DOS, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(than.length, 20);
    c.writeUInt32LE(goc.length, 24);
    c.writeUInt16LE(ten.length, 28);
    c.writeUInt32LE(viTri, 42);
    trungTam.push(c, ten);

    viTri += 30 + ten.length + than.length;
  }

  const dauTT = viTri;
  const dlTT = Buffer.concat(trungTam);
  const ket = Buffer.alloc(22);
  ket.writeUInt32LE(0x06054b50, 0);
  ket.writeUInt16LE(muc.length, 8);
  ket.writeUInt16LE(muc.length, 10);
  ket.writeUInt32LE(dlTT.length, 12);
  ket.writeUInt32LE(dauTT, 16);

  return Buffer.concat([...cucBo, dlTT, ket]);
}

/** Thoát ký tự cho XML. Sách giáo khoa đầy `<`, `&`, và dấu ngoặc kép tiếng Việt. */
export const xml = (s: string | undefined | null): string =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
