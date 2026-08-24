import { NextResponse } from 'next/server';
import { docBanDaXuatBan } from '@/lib/kho.server';
import { taoEpub } from '@/lib/xuat/epub';
import { taoDaisy } from '@/lib/xuat/daisy';
import { taoDaisyCoTieng } from '@/lib/xuat/daisyTieng.server';
import { boDau } from '@/lib/kho.server';
import type { BanVerso } from '@/lib/types';

export const runtime = 'nodejs';
// Bản DAISY có tiếng phải tổng hợp giọng cho từng đoạn.
export const maxDuration = 300;

/** Tải bản đọc về máy.
 *
 *  Lý do có endpoint này: web chỉ chạy khi có mạng, mà nhiều em học ở nhà không
 *  có Internet ổn định. Quan trọng hơn, học sinh khiếm thị Việt Nam đã quen máy
 *  đọc DAISY và NVDA — đưa file vào đúng công cụ các em ĐANG dùng thì không phải
 *  học lại gì cả. */

const DINH_DANG = {
  epub: { tao: async (b: BanVerso) => taoEpub(b), duoi: 'epub', kieu: 'application/epub+zip', hau: '' },
  daisy: { tao: async (b: BanVerso) => taoDaisy(b), duoi: 'zip', kieu: 'application/zip', hau: '-daisy' },
  // Bản có tiếng phải tổng hợp giọng cho từng đoạn nên chậm hơn nhiều lần.
  'daisy-tieng': { tao: taoDaisyCoTieng, duoi: 'zip', kieu: 'application/zip', hau: '-daisy-co-tieng' },
} as const;

/** Tên file an toàn cho mọi hệ điều hành, bỏ dấu để không vỡ trên máy Windows cũ. */
const tenFile = (s: string) =>
  (boDau(s).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'ban-doc');

export async function GET(req: Request, { params }: { params: Promise<{ ma: string }> }) {
  const { ma } = await params;
  const dang = new URL(req.url).searchParams.get('dang') ?? 'epub';
  const dd = DINH_DANG[dang as keyof typeof DINH_DANG];
  if (!dd) return NextResponse.json({ loi: 'DINH_DANG_LA' }, { status: 400 });

  const ban = await docBanDaXuatBan(ma);
  if (!ban) return NextResponse.json({ loi: 'KHONG_TIM_THAY' }, { status: 404 });

  try {
    const tep = await dd.tao(ban);
    const ten = `${tenFile(ban.tieuDe)}${dd.hau}.${dd.duoi}`;
    return new NextResponse(new Uint8Array(tep), {
      headers: {
        'Content-Type': dd.kieu,
        'Content-Length': String(tep.length),
        'Content-Disposition': `attachment; filename="${ten}"; filename*=UTF-8''${encodeURIComponent(ten)}`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    console.error('[verso/tai-ve]', msg.slice(0, 300));
    const nhieu = msg.match(/QUA_NHIEU_DOAN:(\d+)/);
    if (nhieu) return NextResponse.json({ loi: 'QUA_NHIEU_DOAN', soDoan: Number(nhieu[1]) }, { status: 413 });
    if (/PERMISSION|UNAUTHENTICATED|has not been used|disabled/i.test(msg))
      return NextResponse.json({ loi: 'CHUA_BAT_TTS' }, { status: 503 });
    return NextResponse.json({ loi: 'LOI_XUAT' }, { status: 500 });
  }
}
