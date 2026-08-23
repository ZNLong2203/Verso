import 'server-only';
import { GoogleGenAI, Type } from '@google/genai';
import { MODEL_CHINH, MODEL_DU_PHONG } from './constants';
import { NGUYEN_TAC, promptDocTrang } from './prompt';
import type { KetQuaDocTrang, MonHoc } from './types';

export const layKhoa = () => process.env.GEMINI_API_KEY || process.env.API_KEY || '';
export const coApiKey = () => !!layKhoa();

let _ai: GoogleGenAI | null = null;
function client(): GoogleGenAI {
  if (!_ai) {
    const apiKey = layKhoa();
    if (!apiKey) throw new Error('THIEU_KHOA_API');
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

/** Lỗi tạm thời của phía Gemini — đo thực tế trên Cloud Run thấy khoảng 1/3 số lượt
 *  trả về "503 Deadline expired" rồi lượt sau lại chạy bình thường. Giáo viên tải
 *  20 trang mà mất 7 trang là không dùng được, nên phải tự thử lại. */
const LOI_TAM_THOI =
  /UNAVAILABLE|Deadline expired|INTERNAL|503|500|502|504|ECONNRESET|ETIMEDOUT|socket hang up|fetch failed/i;

/** Lỗi thật — thử lại bao nhiêu lần cũng vậy, ném ra ngay cho nhanh. */
const LOI_THAT = /API_KEY|PERMISSION|UNAUTHENTICATED|SAFETY|PROHIBITED|INVALID_ARGUMENT/i;

const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function thuLai<T>(viec: () => Promise<T>, lanToiDa = 3): Promise<T> {
  let loiCuoi: unknown;
  for (let lan = 0; lan < lanToiDa; lan++) {
    try {
      return await viec();
    } catch (e) {
      loiCuoi = e;
      const msg = String((e as Error)?.message ?? e);
      if (LOI_THAT.test(msg) || !LOI_TAM_THOI.test(msg)) throw e;
      if (lan < lanToiDa - 1) {
        // Lùi dần kèm nhiễu ngẫu nhiên, tránh nhiều trang cùng thử lại một lúc
        await nghi(800 * 2 ** lan + Math.random() * 400);
      }
    }
  }
  throw loiCuoi;
}

async function goiModel(params: any): Promise<any> {
  try {
    return await thuLai(() => client().models.generateContent({ ...params, model: MODEL_CHINH }));
  } catch (e: any) {
    const msg = String(e?.message || e);
    // Tài khoản chưa mở model mới thì lùi về model ổn định, thay vì để cả app chết.
    if (/not found|NOT_FOUND|not supported|permission|404|400/i.test(msg)) {
      return await thuLai(() => client().models.generateContent({ ...params, model: MODEL_DU_PHONG }));
    }
    throw e;
  }
}

function tachJSON<T>(raw: string, macDinh: T): T {
  if (!raw) return macDinh;
  const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(s) as T; } catch { /* thử cắt */ }
  const d = s.indexOf('{'), c = s.lastIndexOf('}');
  if (d >= 0 && c > d) { try { return JSON.parse(s.slice(d, c + 1)) as T; } catch { /* bỏ */ } }
  return macDinh;
}

/* ----------------------------- Schema ----------------------------- */

const SCHEMA_TRANG = {
  type: Type.OBJECT,
  properties: {
    soTrang: { type: Type.INTEGER, description: 'Số trang in trên trang sách. Dùng 0 nếu không thấy.' },
    monHocDoan: { type: Type.STRING, description: 'Môn học nhận ra từ nội dung trang. Rỗng nếu không chắc.' },
    khoi: {
      type: Type.ARRAY,
      description: 'Các khối nội dung, XẾP THEO ĐÚNG THỨ TỰ ĐỌC của trang.',
      items: {
        type: Type.OBJECT,
        properties: {
          loai: {
            type: Type.STRING,
            enum: ['tieu-de', 'van-ban', 'tho', 'hinh-anh', 'cong-thuc', 'bang', 'bai-tap', 'chu-thich', 'khung-luu-y'],
          },
          thuTu: { type: Type.INTEGER, description: 'Thứ tự đọc, bắt đầu từ 1.' },
          vanBan: {
            type: Type.STRING,
            description: 'Văn bản NGUYÊN VĂN. Với thơ: mỗi dòng thơ một dòng, khổ cách nhau dòng trống. Rỗng nếu khối là hình/bảng.',
          },
          vanBanDoc: {
            type: Type.STRING,
            description: 'Chỉ điền khi vanBan CÓ CHỨA ký hiệu toán học. Chép lại nguyên câu nhưng mọi ký hiệu viết ở dạng đọc thành lời. Câu không có ký hiệu nào thì để rỗng.',
          },
          moTa: {
            type: Type.STRING,
            description: 'CHỈ dùng cho loai="hinh-anh". Mô tả hình đủ chi tiết để học sinh khiếm thị làm được bài tập liên quan. Rỗng với loại khác.',
          },
          kyHieuGoc: {
            type: Type.STRING,
            description: 'CHỈ dùng cho loai="cong-thuc". Công thức viết như trên sách. Rỗng với loại khác.',
          },
          docThanhLoi: {
            type: Type.STRING,
            description: 'CHỈ dùng cho loai="cong-thuc". Cách giáo viên Việt Nam đọc to công thức đó. Rỗng với loại khác.',
          },
          bang: {
            type: Type.OBJECT,
            description: 'CHỈ dùng cho loai="bang". Null với loại khác.',
            nullable: true,
            properties: {
              tieuDeCot: { type: Type.ARRAY, items: { type: Type.STRING } },
              hang: {
                type: Type.ARRAY,
                description: 'Mỗi phần tử là một hàng, mỗi hàng là mảng ô theo đúng thứ tự cột.',
                items: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              hangDoc: {
                type: Type.ARRAY,
                description: 'Dạng ĐỌC ĐƯỢC của từng ô, cùng số hàng và cột như hang. CHỈ điền khi bảng có công thức hoặc ký hiệu toán học; bảng chữ thường thì để mảng rỗng.',
                items: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              tomTat: { type: Type.STRING, description: 'Một câu nói bảng này về cái gì.' },
            },
            required: ['tieuDeCot', 'hang', 'tomTat'],
          },
          capTieuDe: { type: Type.INTEGER, description: 'Cấp đề mục 1–3. Dùng 0 nếu không phải tiêu đề.' },
          soBaiTap: { type: Type.STRING, description: 'Số hiệu bài tập, ví dụ "3", "3a", "Bài 12". Rỗng nếu không phải bài tập.' },
          thuocVe: { type: Type.STRING, description: 'CHỈ dùng cho loai="chu-thich": từ hoặc cụm từ được giải nghĩa. Rỗng với loại khác.' },
          doTinCay: { type: Type.STRING, enum: ['cao', 'trung-binh', 'thap'] },
          ghiChu: { type: Type.STRING, description: 'Nếu doTinCay không phải "cao", nói rõ chỗ nào chưa chắc và vì sao. Rỗng nếu chắc.' },
        },
        required: ['loai', 'thuTu', 'vanBan', 'moTa', 'kyHieuGoc', 'docThanhLoi', 'bang', 'capTieuDe', 'soBaiTap', 'thuocVe', 'doTinCay', 'ghiChu'],
      },
    },
    anhKhongRo: { type: Type.BOOLEAN, description: 'true nếu ảnh mờ/nghiêng/thiếu sáng khiến không đọc chắc được.' },
    ghiChuDocAnh: { type: Type.STRING, description: 'Nếu anhKhongRo=true, nói rõ nên chụp lại thế nào. Rỗng nếu ảnh tốt.' },
  },
  required: ['soTrang', 'monHocDoan', 'khoi', 'anhKhongRo', 'ghiChuDocAnh'],
};

const RONG: KetQuaDocTrang = {
  soTrang: 0, monHocDoan: '', khoi: [], anhKhongRo: true,
  ghiChuDocAnh: 'Chưa đọc được trang này. Thử chụp lại rõ và thẳng hơn.',
};

/** Đọc một trang sách thành các khối nội dung theo đúng thứ tự đọc. */
export async function docTrangSach(
  anhBase64: string,
  mimeType: string,
  monHoc: MonHoc,
  boiCanh?: string,
): Promise<KetQuaDocTrang> {
  const res = await goiModel({
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: anhBase64 } },
        { text: promptDocTrang(monHoc, boiCanh) },
      ],
    }],
    config: {
      systemInstruction: NGUYEN_TAC,
      responseMimeType: 'application/json',
      responseSchema: SCHEMA_TRANG,
      temperature: 0.15,   // chuyển dạng cần chính xác, không cần sáng tạo
    },
  });

  const kq = tachJSON<KetQuaDocTrang>(res.text ?? '', RONG);
  kq.khoi = (kq.khoi || [])
    .map((k, i) => ({ ...k, thuTu: k.thuTu || i + 1 }))
    .sort((a, b) => a.thuTu - b.thuTu);
  return kq;
}

/** Mô tả lại một hình cụ thể, kỹ hơn — khi giáo viên thấy mô tả tự động chưa đủ. */
export async function taMoTaKyHon(
  anhBase64: string,
  mimeType: string,
  monHoc: MonHoc,
  moTaHienTai: string,
  yeuCau: string,
): Promise<string> {
  const res = await goiModel({
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: anhBase64 } },
        {
          text: `Đây là một hình trong sách giáo khoa môn ${monHoc}.

Mô tả hiện tại: "${moTaHienTai}"

Giáo viên yêu cầu: ${yeuCau}

Hãy viết lại mô tả cho học sinh khiếm thị. Chỉ trả về đoạn mô tả, không thêm lời dẫn.`,
        },
      ],
    }],
    config: { systemInstruction: NGUYEN_TAC, temperature: 0.3 },
  });
  return (res.text ?? '').trim();
}
