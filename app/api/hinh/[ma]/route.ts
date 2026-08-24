import { NextResponse } from 'next/server';
import { thungLuu } from '@/lib/luuTru.server';

export const runtime = 'nodejs';

/** Ảnh hình vẽ đã cắt khỏi trang sách.
 *
 *  Mã là băm của chính nội dung ảnh nên nội dung không bao giờ đổi — cho phép
 *  trình duyệt giữ vĩnh viễn. */
export async function GET(_req: Request, { params }: { params: Promise<{ ma: string }> }) {
  const { ma } = await params;
  if (!/^[0-9a-f]{8,64}$/.test(ma)) {
    return NextResponse.json({ loi: 'MA_KHONG_HOP_LE' }, { status: 400 });
  }
  try {
    const tep = thungLuu().file(`hinh/${ma}.jpg`);
    if (!(await tep.exists())[0]) return NextResponse.json({ loi: 'KHONG_TIM_THAY' }, { status: 404 });
    const [d] = await tep.download();
    return new NextResponse(new Uint8Array(d), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(d.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ loi: 'LOI_KHO' }, { status: 502 });
  }
}
