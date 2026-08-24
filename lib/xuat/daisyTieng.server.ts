import 'server-only';
import type { BanVerso } from '@/lib/types';
import { tieng } from '@/lib/tieng.server';
import { giayCuaMp3 } from './mp3';
import { doanCanTieng, taoDaisy } from './daisy';

/** Dựng DAISY 3 ĐẦY ĐỦ CÓ TIẾNG (audioFullText).
 *
 *  Đây là dạng sách mà học sinh khiếm thị Việt Nam thật sự đang dùng, và cũng là
 *  thứ các trung tâm như Sao Mai đang làm THỦ CÔNG: đọc từng trang vào micro rồi
 *  cắt ghép khớp với chữ. Bản chỉ có chữ bắt máy đọc tự phát âm; bản có tiếng thì
 *  đọc được ngay trên máy đọc sách chuyên dụng, kể cả máy không có bộ đọc tiếng Việt. */

/** Mỗi đoạn là một lượt gọi tổng hợp. Quá số này thì một yêu cầu chạy quá lâu và
 *  tệp trả về cũng vượt giới hạn phản hồi của Cloud Run. */
export const TOI_DA_DOAN = 400;

/** Bốn luồng song song. Nhiều hơn thì chạm giới hạn gọi của Cloud TTS, ít hơn thì
 *  một tài liệu vài chục khối mất hàng phút. */
const SONG_SONG = 4;

export async function taoDaisyCoTieng(ban: BanVerso): Promise<Buffer> {
  const ds = doanCanTieng(ban);
  if (!ds.length) throw new Error('KHONG_CO_NOI_DUNG');
  if (ds.length > TOI_DA_DOAN) throw new Error(`QUA_NHIEU_DOAN:${ds.length}`);

  const ra = new Array<{ khoiId: string; par: string; tep: string; mp3: Buffer; giay: number }>(ds.length);
  let ke = 0;

  const thoLam = async () => {
    for (;;) {
      const i = ke++;
      if (i >= ds.length) return;
      const { mp3 } = await tieng(ds[i].text);
      ra[i] = {
        khoiId: ds[i].khoiId,
        par: `par-${i + 1}`,
        tep: `audio/${String(i + 1).padStart(4, '0')}.mp3`,
        mp3,
        giay: giayCuaMp3(mp3),
      };
    }
  };

  await Promise.all(Array.from({ length: Math.min(SONG_SONG, ds.length) }, thoLam));
  return taoDaisy(ban, ra);
}
