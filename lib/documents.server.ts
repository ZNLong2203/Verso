import 'server-only';
import { db, coFirebase, BO_SUU_TAP } from './firebase.server';
import type { BanVerso, MonHoc } from './types';
import { boDau } from './text';
import { thungLuu } from './storage.server';
import { createHash } from 'node:crypto';

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

// Firestore không nhận mảng lồng trong mảng, mà bảng của ta là string[][] —
// nên phần nội dung được gói thành một chuỗi JSON ở đúng tầng lưu trữ.
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

async function luuAnhHinh(ban: BanVerso): Promise<BanVerso> {
  const trang = await Promise.all(ban.trang.map(async (t) => ({
    ...t,
    khoi: await Promise.all(t.khoi.map(async (k) => {
      if (k.loai !== 'hinh-anh' || !k.anhHinh?.startsWith('data:')) return k;
      const than = Buffer.from(k.anhHinh.split(',')[1] ?? '', 'base64');
      if (!than.length) return { ...k, anhHinh: undefined };
      const ma = createHash('sha256').update(than).digest('hex').slice(0, 32);
      try {
        const tep = thungLuu().file(`hinh/${ma}.jpg`);
        if (!(await tep.exists())[0]) {
          await tep.save(than, {
            contentType: 'image/jpeg',
            metadata: { cacheControl: 'public, max-age=31536000, immutable' },
          });
        }
        return { ...k, anhHinh: undefined, maHinh: ma };
      } catch {
        // Không lưu được ảnh thì vẫn phát hành: mô tả bằng lời mới là nội dung chính.
        return { ...k, anhHinh: undefined };
      }
    })),
  })));
  return { ...ban, trang };
}

export async function xuatBan(ban: BanVerso, maSuaGui?: string): Promise<{ maChiaSe: string; maSua: string }> {
  const maChiaSe = ban.maChiaSe || taoMaChiaSe();
  const ngayXuatBan = new Date().toISOString();
  const sach = bocAnhGoc({ ...(await luuAnhHinh(ban)), maChiaSe, daXuatBan: true, ngayCapNhat: ngayXuatBan });

  const kho = db().collection(BO_SUU_TAP).doc(maChiaSe);
  const cu = await kho.get();
  const maSuaCu = cu.exists ? ((cu.data() as { maSua?: string }).maSua ?? '') : '';

  // Đã có bản cũ thì phải đưa đúng mã sửa mới được ghi đè.
  if (maSuaCu && maSuaGui !== maSuaCu) throw new Error('SAI_MA_SUA');
  const maSua = maSuaCu || taoMaChiaSe(12);

  const { trang, ...phanConLai } = sach;
  // tomTat() đã chứa ngayXuatBan — trải sau cùng để không khai trùng trường.
  await kho.set({
    ...phanConLai,
    maSua,
    trangJSON: goiNoiDung(trang),
    ...tomTat(sach, ngayXuatBan),
  });
  return { maChiaSe, maSua };
}

/** Mở lại bản đã phát hành để sửa. Chỉ trả về khi đưa đúng mã sửa. */
export async function moDeSua(maChiaSe: string, maSua: string): Promise<BanVerso | null> {
  if (!coFirebase() || !maSua) return null;
  const snap = await db().collection(BO_SUU_TAP).doc(maChiaSe.toUpperCase()).get();
  if (!snap.exists) return null;
  const d = snap.data() as Omit<BanVerso, 'trang'> & { trangJSON?: string; maSua?: string };
  if (!d.maSua || d.maSua !== maSua) return null;
  const { maSua: _bo, trangJSON, ...con } = d;
  return { ...con, trang: moNoiDung(trangJSON ?? '[]') } as BanVerso;
}

export async function docBanDaXuatBan(maChiaSe: string): Promise<BanVerso | null> {
  if (!coFirebase()) return null;
  const snap = await db().collection(BO_SUU_TAP).doc(maChiaSe.toUpperCase()).get();
  if (!snap.exists) return null;
  // maSua KHÔNG được rời khỏi máy chủ theo đường này: trang đọc là trang công khai.
  const { maSua: _bo, trangJSON, ...d } = snap.data() as
    Omit<BanVerso, 'trang'> & { trangJSON?: string; maSua?: string };
  return { ...d, trang: moNoiDung(trangJSON ?? '[]') } as BanVerso;
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

export async function goBan(maChiaSe: string, maSua: string): Promise<{ daGo: boolean }> {
  if (!coFirebase() || !maSua) throw new Error('SAI_MA_SUA');
  const kho = db().collection(BO_SUU_TAP).doc(maChiaSe.toUpperCase());
  const snap = await kho.get();
  if (!snap.exists) return { daGo: false };
  if ((snap.data() as { maSua?: string }).maSua !== maSua) throw new Error('SAI_MA_SUA');
  await kho.delete();
  return { daGo: true };
}

/* ─────────────── Góp ý từ người đọc ─────────────── */

export interface GopY {
  id: string;
  khoiId: string;     // phần nào bị báo, rỗng nếu góp ý chung
  noiDung: string;
  luc: string;
}

const TOI_DA_GOP_Y = 300;

export async function guiGopY(maChiaSe: string, khoiId: string, noiDung: string): Promise<{ daNhan: boolean }> {
  if (!coFirebase()) throw new Error('THIEU_FIREBASE');
  const chu = db().collection(BO_SUU_TAP).doc(maChiaSe.toUpperCase());
  if (!(await chu.get()).exists) throw new Error('KHONG_TIM_THAY');

  const kho = chu.collection('gop-y');
  // Chặn trần để một người rảnh tay không nhấn chìm hộp thư của giáo viên.
  if ((await kho.count().get()).data().count >= TOI_DA_GOP_Y) throw new Error('QUA_NHIEU_GOP_Y');

  await kho.add({
    khoiId: khoiId.slice(0, 80),
    noiDung: noiDung.trim().slice(0, 500),
    luc: new Date().toISOString(),
  });
  return { daNhan: true };
}

/** Đọc góp ý — chỉ chủ bản đọc, tức người có mã sửa. */
export async function docGopY(maChiaSe: string, maSua: string): Promise<GopY[] | null> {
  if (!coFirebase() || !maSua) return null;
  const chu = db().collection(BO_SUU_TAP).doc(maChiaSe.toUpperCase());
  const snap = await chu.get();
  if (!snap.exists || (snap.data() as { maSua?: string }).maSua !== maSua) return null;

  const ds = await chu.collection('gop-y').orderBy('luc', 'desc').limit(100).get();
  return ds.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GopY, 'id'>) }));
}
