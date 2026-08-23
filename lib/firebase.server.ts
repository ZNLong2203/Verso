import 'server-only';
import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/** Firestore chỉ được truy cập từ MÁY CHỦ, qua Admin SDK.
 *
 *  Vì sao không dùng SDK phía trình duyệt:
 *  1. Trang học sinh đọc phải dựng sẵn ở máy chủ. Học sinh khiếm thị thường dùng máy cũ,
 *     mạng yếu; HTML có sẵn thì trình đọc màn hình đọc được ngay, không phải chờ JavaScript.
 *  2. Không có đường nào cho người lạ ghi thẳng vào cơ sở dữ liệu. Luật bảo mật Firestore
 *     đặt là chặn hết; Admin SDK đi vòng qua luật, nên mọi thao tác ghi đều qua route của ta. */

const DU_AN =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  '';
const EMAIL = process.env.FIREBASE_CLIENT_EMAIL || '';
const KHOA = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

/** Chạy trên Cloud Run thì không cần khoá: dịch vụ tự có danh tính của chính nó.
 *  K_SERVICE là biến Cloud Run luôn tự đặt — đáng tin hơn GOOGLE_CLOUD_PROJECT,
 *  vì Cloud Run KHÔNG tự đặt biến đó (đã kiểm chứng bằng một lần deploy hỏng). */
const TREN_GOOGLE_CLOUD = !!(
  process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT
);

// Trên Google Cloud, SDK tự dò được project từ metadata nên không bắt buộc có DU_AN.
export const coFirebase = () => TREN_GOOGLE_CLOUD || !!(DU_AN && EMAIL && KHOA);

/** Cache trên globalThis chứ không phải biến module.
 *
 *  Next.js nạp Server Component và Route Handler ở HAI không gian module khác nhau.
 *  Biến module vì thế rỗng ở nơi thứ hai, trong khi Firebase app thì đã tồn tại —
 *  gọi settings() lần nữa là ném lỗi và trang trả 500 một cách ngẫu nhiên. */
const g = globalThis as unknown as { __versoApp?: App; __versoDb?: Firestore };

export function db(): Firestore {
  if (!coFirebase()) throw new Error('THIEU_FIREBASE');
  if (g.__versoDb) return g.__versoDb;

  // Trên Cloud Run: dùng danh tính sẵn có của dịch vụ (Application Default Credentials).
  // Nhờ vậy KHÔNG phải mang khoá riêng tư lên máy chủ — không có file khoá thì
  // cũng không có gì để rò rỉ. Chạy ở máy cá nhân thì mới cần khoá service account.
  const app: App = g.__versoApp ?? getApps()[0] ?? initializeApp(
    EMAIL && KHOA
      ? { credential: cert({ projectId: DU_AN, clientEmail: EMAIL, privateKey: KHOA }), projectId: DU_AN }
      // Không truyền projectId rỗng — để SDK tự dò từ metadata của Cloud Run.
      : DU_AN
        ? { credential: applicationDefault(), projectId: DU_AN }
        : { credential: applicationDefault() },
  );
  g.__versoApp = app;

  const store = getFirestore(app);
  try {
    store.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Đã được cấu hình ở một không gian module khác — không sao, giữ nguyên.
  }
  g.__versoDb = store;
  return store;
}

export const BO_SUU_TAP = 'ban-verso';
