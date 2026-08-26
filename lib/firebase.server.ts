import 'server-only';
import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const DU_AN =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  '';
const EMAIL = process.env.FIREBASE_CLIENT_EMAIL || '';
const KHOA = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

// Dùng K_SERVICE để nhận biết Cloud Run, KHÔNG dùng GOOGLE_CLOUD_PROJECT —
// Cloud Run không tự đặt biến đó (đã kiểm chứng bằng một lần deploy hỏng).
const TREN_GOOGLE_CLOUD = !!(
  process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT
);

// Trên Google Cloud, SDK tự dò được project từ metadata nên không bắt buộc có DU_AN.
export const coFirebase = () => TREN_GOOGLE_CLOUD || !!(DU_AN && EMAIL && KHOA);

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
