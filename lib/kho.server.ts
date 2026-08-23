import 'server-only';
import { db, coFirebase, BO_SUU_TAP } from './firebase.server';
import type { BanVerso, MonHoc } from './types';
import { boDau } from './chuoi';

export { boDau };


/** Mã chia sẻ: 8 ký tự, bỏ các chữ dễ đọc nhầm (0/O, 1/I/l).
 *  Đủ ngắn để đọc qua điện thoại cho đồng nghiệp, đủ dài để không dò ra được. */
const BANG_CHU = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function taoMaChiaSe(dai = 8): string {
  const b = new Uint8Array(dai);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => BANG_CHU[x % BANG_CHU.length]).join('');
}

export interface TomTatBan {
  maChiaSe: string;
  tieuDe: string;
  monHoc: MonHoc;
  lop: number | null;
  nguon: string;
  nguoiChuyen: string;
  soTrang: number;
  soKhoi: number;
  soHinh: number;
  ngayXuatBan: string;
}

/** Bỏ ảnh scan gốc trước khi lưu.
 *
 *  Ngoại lệ bản quyền theo Điều 25a Luật SHTT cho phép tạo và phân phối BẢN TIẾP CẬN ĐƯỢC
 *  cho người khuyết tật chữ in — không phải phát tán lại bản scan nguyên trang.
 *  Nên thứ đi lên máy chủ chỉ là nội dung đã chuyển dạng. Lợi thêm: nhẹ hơn rất nhiều. */
function bocAnhGoc(ban: BanVerso): BanVerso {
  return { ...ban, trang: ban.trang.map((t) => ({ ...t, anhGoc: '' })) };
}

function tomTat(ban: BanVerso, ngayXuatBan: string): TomTatBan {
  const khoi = ban.trang.flatMap((t) => t.khoi);
  return {
    maChiaSe: ban.maChiaSe,
    tieuDe: ban.tieuDe,
    monHoc: ban.monHoc,
    lop: ban.lop,
    nguon: ban.nguon,
    nguoiChuyen: ban.nguoiChuyen,
    soTrang: ban.trang.length,
    soKhoi: khoi.length,
    soHinh: khoi.filter((k) => k.loai === 'hinh-anh').length,
    ngayXuatBan,
  };
}

/** Giới hạn tài liệu Firestore là 1 MB. Chừa biên an toàn. */
const GIOI_HAN_BYTE = 900_000;

/**
 * Firestore KHÔNG cho phép mảng lồng trực tiếp trong mảng, mà bảng của ta là
 * string[][]. Thay vì bẻ cong mô hình dữ liệu cho vừa hạ tầng, ta gói toàn bộ
 * phần nội dung thành một chuỗi JSON ở đúng tầng lưu trữ.
 *
 * Đổi lại không truy vấn được vào bên trong — nhưng ta không cần: thư viện lọc
 * bằng các trường tóm tắt để phẳng ở cấp cao nhất.
 */
function goiNoiDung(trang: BanVerso['trang']): string {
  const chuoi = JSON.stringify(trang);
  const byte = Buffer.byteLength(chuoi, 'utf8');
  if (byte > GIOI_HAN_BYTE) {
    throw new Error(`QUA_LON:${Math.round(byte / 1024)}`);
  }
  return chuoi;
}

const moNoiDung = (chuoi: string): BanVerso['trang'] => {
  try { return JSON.parse(chuoi); } catch { return []; }
};

export async function xuatBan(ban: BanVerso): Promise<{ maChiaSe: string }> {
  const maChiaSe = ban.maChiaSe || taoMaChiaSe();
  const ngayXuatBan = new Date().toISOString();
  const sach = bocAnhGoc({ ...ban, maChiaSe, daXuatBan: true, ngayCapNhat: ngayXuatBan });

  const { trang, ...phanConLai } = sach;
  // tomTat() đã chứa ngayXuatBan — trải sau cùng để không khai trùng trường.
  await db().collection(BO_SUU_TAP).doc(maChiaSe).set({
    ...phanConLai,
    trangJSON: goiNoiDung(trang),
    ...tomTat(sach, ngayXuatBan),
  });
  return { maChiaSe };
}

export async function docBanDaXuatBan(maChiaSe: string): Promise<BanVerso | null> {
  if (!coFirebase()) return null;
  const snap = await db().collection(BO_SUU_TAP).doc(maChiaSe.toUpperCase()).get();
  if (!snap.exists) return null;
  const d = snap.data() as Omit<BanVerso, 'trang'> & { trangJSON?: string };
  return { ...d, trang: moNoiDung(d.trangJSON ?? '[]') } as BanVerso;
}

/** Thư viện dùng chung: chuyển một lần, mọi trường cùng dùng.
 *  Đây là chỗ Verso thôi là công cụ và bắt đầu thành hạ tầng. */
export async function danhSachThuVien(
  loc: { monHoc?: MonHoc; lop?: number; tuKhoa?: string } = {},
  gioiHan = 60,
): Promise<TomTatBan[]> {
  if (!coFirebase()) return [];

  // Chỉ sắp xếp theo MỘT trường — Firestore tự tạo index đơn trường, không cần
  // khai composite index. Bộ sưu tập này chỉ chứa bản đã xuất bản (ta chỉ ghi
  // lúc xuất bản), nên không cần thêm điều kiện where.
  //
  // Lọc môn và lớp làm trong bộ nhớ: mỗi tổ hợp where + orderBy lại đòi thêm một
  // composite index, mà thư viện chỉ vài trăm bản thì lọc tại chỗ là đủ nhanh.
  let ds: TomTatBan[];
  try {
    const snap = await db().collection(BO_SUU_TAP)
      .orderBy('ngayXuatBan', 'desc').limit(gioiHan).get();
    ds = snap.docs.map((d) => d.data() as TomTatBan);
  } catch {
    // Bản đọc mới xuất bản có thể chưa kịp vào index. Thà trả về danh sách chưa
    // sắp xếp còn hơn để cả trang thư viện chết.
    const snap = await db().collection(BO_SUU_TAP).limit(gioiHan).get();
    ds = snap.docs.map((d) => d.data() as TomTatBan)
      .sort((a, b) => (b.ngayXuatBan ?? '').localeCompare(a.ngayXuatBan ?? ''));
  }

  if (loc.monHoc) ds = ds.filter((b) => b.monHoc === loc.monHoc);
  if (loc.lop) ds = ds.filter((b) => b.lop === loc.lop);

  const tk = boDau(loc.tuKhoa ?? '');
  if (!tk) return ds;
  return ds.filter((b) =>
    boDau([b.tieuDe, b.nguon, b.nguoiChuyen].join(' ')).includes(tk));
}
