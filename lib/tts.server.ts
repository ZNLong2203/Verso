import 'server-only';
import { createHash } from 'node:crypto';
import { GoogleAuth } from 'google-auth-library';
import { thungLuu } from './storage.server';
import { GIONG_DOC, GIONG_DOC_EN, THUNG_TIENG } from './constants';
import { chiaNnu, type Nnu } from './language';

/** Sinh giọng đọc tiếng Việt ở MÁY CHỦ.
 *
 *  Vì sao không dùng Web Speech API của trình duyệt cho trang học sinh: giọng có
 *  hay không là chuyện may rủi theo từng máy. Chrome trên Windows không cài gói
 *  tiếng Việt thì KHÔNG có giọng vi-VN nào, mà `utterance.lang = 'vi-VN'` chỉ là
 *  một GỢI Ý — trình duyệt lấy giọng mặc định, thường là tiếng Anh, rồi đọc văn
 *  bản tiếng Việt bằng âm tiếng Anh. Người sáng mắt nghe thấy sai ngay; học sinh
 *  khiếm thị thì không có cách nào biết đó không phải giọng đúng.
 *
 *  Cloud Text-to-Speech có 40 giọng riêng cho tiếng Việt, trong đó 30 giọng
 *  Chirp 3 HD. Cùng một câu, mọi máy nghe giống nhau. */

const DU_AN =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  '';

/** Trần cứng của API là 5000 BYTE, không phải ký tự — tiếng Việt có dấu tốn
 *  gần 2 byte mỗi chữ, nên 3000 ký tự đã có thể vượt. Chừa biên cho an toàn. */
const BYTE_TOI_DA = 4200;

const LOI_TAM_THOI = /UNAVAILABLE|INTERNAL|DEADLINE|503|500|502|504|ECONNRESET|ETIMEDOUT|socket hang up|fetch failed/i;

let _auth: GoogleAuth | null = null;
function auth(): GoogleAuth {
  if (_auth) return _auth;
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  const khoa = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  _auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    // Trên Cloud Run thì bỏ trống: dịch vụ tự có danh tính, không cần mang khoá lên máy chủ.
    ...(email && khoa ? { credentials: { client_email: email, private_key: khoa } } : {}),
    ...(DU_AN ? { projectId: DU_AN } : {}),
  });
  return _auth;
}

/** Cắt theo BYTE ở ranh giới câu. Cắt giữa câu làm giọng đọc ngắt sai chỗ,
 *  nghe như đọc nhầm dấu chấm. */
export function catTheoByte(s: string, tran = BYTE_TOI_DA): string[] {
  const dem = (t: string) => Buffer.byteLength(t, 'utf8');
  if (dem(s) <= tran) return [s];

  const manh = s.match(/[^.!?;\n]+[.!?;\n]?/g) ?? [s];
  const ra: string[] = [];
  let gom = '';
  for (const m of manh) {
    if (gom && dem(gom + m) > tran) { ra.push(gom); gom = m; }
    else gom += m;
  }
  if (gom) ra.push(gom);

  // Một câu đơn lẻ vẫn quá dài (mô tả hình dài) thì đành cắt theo dấu phẩy, rồi theo từ.
  return ra.flatMap((p) => {
    if (dem(p) <= tran) return [p];
    const nho: string[] = [];
    let g = '';
    for (const t of p.split(/(?<=[,:])\s+|\s+/)) {
      if (g && dem(`${g} ${t}`) > tran) { nho.push(g); g = t; }
      else g = g ? `${g} ${t}` : t;
    }
    if (g) nho.push(g);
    return nho;
  });
}

const giongCua = (n: Nnu) => (n === 'en' ? GIONG_DOC_EN : GIONG_DOC);
const maCua = (n: Nnu) => (n === 'en' ? 'en-US' : 'vi-VN');

async function motLuot(text: string, giong: string, ma = 'vi-VN'): Promise<Buffer> {
  const client = await auth().getClient();
  const r = await client.request<{ audioContent: string }>({
    url: 'https://texttospeech.googleapis.com/v1/text:synthesize',
    method: 'POST',
    data: {
      input: { text },
      voice: { languageCode: ma, name: giong },
      // Chirp 3 HD không nhận pitch. Tốc độ để nguyên 1.0 và cho người nghe tự
      // đổi bằng playbackRate ở trình duyệt — nhờ vậy một tệp đã lưu dùng được
      // cho mọi tốc độ, không phải tổng hợp lại.
      audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 24000 },
    },
  });
  return Buffer.from(r.data.audioContent, 'base64');
}

async function thuLai<T>(viec: () => Promise<T>, lanToiDa = 3): Promise<T> {
  let cuoi: unknown;
  for (let lan = 0; lan < lanToiDa; lan++) {
    try { return await viec(); } catch (e) {
      cuoi = e;
      if (!LOI_TAM_THOI.test(String((e as Error)?.message ?? e))) throw e;
      if (lan < lanToiDa - 1) {
        await new Promise((r) => setTimeout(r, 600 * 2 ** lan + Math.random() * 300));
      }
    }
  }
  throw cuoi;
}

/** Đổi số này mỗi khi CÁCH đọc thay đổi — đổi giọng, đổi luật tách ngôn ngữ, sửa
 *  bảng ký hiệu. Không đổi thì tệp cũ vẫn được phát tiếp: đã gặp thật, những đoạn
 *  sinh ra trước khi có phần tách ngôn ngữ vẫn đọc "[en]" thành lời, và chúng sống
 *  sót qua mọi lần deploy vì mã băm không hề biết luật đã khác. */
const DOI_TIENG = 2;

export const maNoiDung = (text: string, giong: string) =>
  createHash('sha256')
    .update(`v${DOI_TIENG}|${giong}|${GIONG_DOC_EN}\n${text}`, 'utf8')
    .digest('hex')
    .slice(0, 32);

/** Trả về MP3 của một đoạn, ưu tiên lấy từ chỗ đã lưu.
 *
 *  Cache là phần bắt buộc, không phải tối ưu thêm: một trang sách tốn khoảng
 *  2.500 ký tự, mà tổng hợp lại cho từng người nghe thì đắt gấp nhiều lần chuyển
 *  đổi trang đó. Lưu theo mã nội dung nghĩa là mỗi khối chỉ tổng hợp MỘT lần,
 *  bao nhiêu học sinh nghe cũng vậy. */
export async function tieng(
  text: string,
  ngonNgu: Nnu = 'vi',
  giong = GIONG_DOC,
): Promise<{ mp3: Buffer; tuCache: boolean }> {
  const ma = maNoiDung(`${ngonNgu}:${text}`, giong);
  const tep = thungLuu().file(`${ma}.mp3`);

  try {
    const [co] = await tep.exists();
    if (co) {
      const [d] = await tep.download();
      return { mp3: d, tuCache: true };
    }
  } catch { /* chỗ lưu hỏng thì vẫn tổng hợp được, chỉ là tốn tiền hơn */ }

  // Tách theo ngôn ngữ TRƯỚC khi cắt theo byte: sách Tiếng Anh trộn hai thứ tiếng
  // ngay trong một câu, mà một giọng đọc cả câu thì sai ở nửa này hoặc nửa kia.
  // (Đã thử thẻ SSML <lang> — Cloud TTS nhận nhưng không đổi phát âm, xem lib/nnu.ts.)
  const phan: Buffer[] = [];
  for (const doan of chiaNnu(text, ngonNgu)) {
    for (const m of catTheoByte(doan.text)) {
      // Lưới an toàn cuối: không bao giờ gửi đi một mảnh không có chữ nào.
      // Cloud TTS đọc mảnh "." thành lời "dấu chấm" — 1,25 giây tiếng thừa.
      if (!/[0-9A-Za-zÀ-ỹ]/.test(m)) continue;
      phan.push(await thuLai(() => motLuot(m, giongCua(doan.nnu), maCua(doan.nnu))));
    }
  }
  // Nối trực tiếp được: mỗi khung MP3 tự chứa, máy phát nào cũng đọc liền mạch.
  const mp3 = Buffer.concat(phan);

  try {
    await tep.save(mp3, {
      contentType: 'audio/mpeg',
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
    });
  } catch { /* không lưu được thì thôi, lần sau tổng hợp lại */ }

  return { mp3, tuCache: false };
}
