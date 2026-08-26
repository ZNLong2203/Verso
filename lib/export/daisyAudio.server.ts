import 'server-only';
import type { BanVerso } from '@/lib/types';
import { tieng } from '@/lib/tts.server';
import { giayCuaMp3 } from './mp3';
import { doanCanTieng, taoDaisy } from './daisy';
import { layAnhHinh } from './figures.server';

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
      const { mp3 } = await tieng(ds[i].text, ds[i].nnu);
      ra[i] = {
        khoiId: ds[i].khoiId,
        par: `par-${i + 1}`,
        tep: `audio/${String(i + 1).padStart(4, '0')}.mp3`,
        mp3,
        giay: giayCuaMp3(mp3),
      };
    }
  };

  const [, anh] = await Promise.all([
    Promise.all(Array.from({ length: Math.min(SONG_SONG, ds.length) }, thoLam)),
    layAnhHinh(ban),
  ]);
  return taoDaisy(ban, ra, anh);
}
