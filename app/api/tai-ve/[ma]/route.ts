import { NextResponse } from 'next/server';
import { docBanDaXuatBan } from '@/lib/kho.server';
import { taoEpub } from '@/lib/xuat/epub';
import { taoDaisy } from '@/lib/xuat/daisy';
import { boDau } from '@/lib/kho.server';

export const runtime = 'nodejs';

/** Tải bản đọc về máy.
 *
 *  Lý do có endpoint này: web chỉ chạy khi có mạng, mà nhiều em học ở nhà không
 *  có Internet ổn định. Quan trọng hơn, học sinh khiếm thị Việt Nam đã quen máy
 *  đọc DAISY và NVDA — đưa file vào đúng công cụ các em ĐANG dùng thì không phải
 *  học lại gì cả. */

const DINH_DANG = {
  epub: { tao: taoEpub, duoi: 'epub', kieu: 'application/epub+zip' },
  daisy: { tao: taoDaisy, duoi: 'zip', kieu: 'application/zip' },
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
    const tep = dd.tao(ban);
    const ten = `${tenFile(ban.tieuDe)}${dang === 'daisy' ? '-daisy' : ''}.${dd.duoi}`;
    return new NextResponse(new Uint8Array(tep), {
      headers: {
        'Content-Type': dd.kieu,
        'Content-Length': String(tep.length),
        'Content-Disposition': `attachment; filename="${ten}"; filename*=UTF-8''${encodeURIComponent(ten)}`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    console.error('[verso/tai-ve]', String((e as Error)?.message ?? e));
    return NextResponse.json({ loi: 'LOI_XUAT' }, { status: 500 });
  }
}
