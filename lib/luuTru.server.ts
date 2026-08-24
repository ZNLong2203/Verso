import 'server-only';
import { Storage } from '@google-cloud/storage';
import { THUNG_TIENG } from './constants';

/** Một chỗ duy nhất dựng client Cloud Storage.
 *
 *  Có khoá thì dùng khoá, không có thì mượn danh tính sẵn có của máy chủ. Gom về
 *  đây vì hai nơi cần nó — kho giọng và kho hình — và trước đó chỗ nào cũng tự
 *  dựng lấy, nên sửa quy tắc đăng nhập ở một nơi là nơi kia lệch theo. */
const DU_AN =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  '';

let _thung: ReturnType<Storage['bucket']> | null = null;

export function thungLuu() {
  if (_thung) return _thung;
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  const khoa = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  _thung = new Storage({
    projectId: DU_AN || undefined,
    ...(email && khoa ? { credentials: { client_email: email, private_key: khoa } } : {}),
  }).bucket(THUNG_TIENG);
  return _thung;
}
