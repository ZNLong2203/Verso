
const BITRATE_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BITRATE_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const TAN_SO = [
  [11025, 12000, 8000],    // MPEG 2.5
  [0, 0, 0],
  [22050, 24000, 16000],   // MPEG 2
  [44100, 48000, 32000],   // MPEG 1
];

/** Bỏ qua thẻ ID3v2 ở đầu tệp nếu có — nó không phải khung âm thanh. */
function boId3(b: Buffer): number {
  if (b.length < 10 || b.toString('latin1', 0, 3) !== 'ID3') return 0;
  // Kích thước ghi kiểu synchsafe: mỗi byte chỉ dùng 7 bit thấp.
  const co = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f);
  return 10 + co;
}

export function giayCuaMp3(b: Buffer): number {
  let i = boId3(b);
  let mau = 0;
  let tanSoCuoi = 0;

  while (i + 4 <= b.length) {
    // Đồng bộ khung: 11 bit 1 liên tiếp
    if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) { i++; continue; }

    const ver = (b[i + 1] >> 3) & 0x03;      // 0=2.5, 2=2, 3=1
    const lop = (b[i + 1] >> 1) & 0x03;      // 1 = Layer III
    const chiSoBr = (b[i + 2] >> 4) & 0x0f;
    const chiSoTs = (b[i + 2] >> 2) & 0x03;
    const dem = (b[i + 2] >> 1) & 0x01;

    if (ver === 1 || lop !== 1 || chiSoBr === 0 || chiSoBr === 15 || chiSoTs === 3) { i++; continue; }

    const mpeg1 = ver === 3;
    const br = (mpeg1 ? BITRATE_V1_L3 : BITRATE_V2_L3)[chiSoBr] * 1000;
    const ts = TAN_SO[ver][chiSoTs];
    if (!br || !ts) { i++; continue; }

    const dai = Math.floor(((mpeg1 ? 144 : 72) * br) / ts) + dem;
    if (dai < 4) { i++; continue; }

    mau += mpeg1 ? 1152 : 576;   // số mẫu mỗi khung Layer III
    tanSoCuoi = ts;
    i += dai;
  }

  return tanSoCuoi ? mau / tanSoCuoi : 0;
}

/** "0:01:23.456" — dạng giờ mà DAISY dùng cho clipBegin, clipEnd và totalTime. */
export function gioDaisy(giay: number): string {
  const g = Math.floor(giay / 3600);
  const p = Math.floor((giay % 3600) / 60);
  const s = giay % 60;
  return `${g}:${String(p).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
}
