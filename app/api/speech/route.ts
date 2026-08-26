import { NextResponse } from 'next/server';
import { tieng } from '@/lib/tts.server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  let text = '';
  let nnu: unknown;
  try { ({ text, nnu } = await req.json()); } catch { /* thân rỗng */ }
  text = (text ?? '').trim();
  const ngonNgu = nnu === 'en' ? 'en' : 'vi';

  if (!text) return NextResponse.json({ loi: 'THIEU_VAN_BAN' }, { status: 400 });
  // Một khối dài nhất trên trang sách vẫn dưới mức này rất nhiều; chặn để một
  // lượt gọi lỡ tay không nuốt hết hạn mức tháng.
  if (text.length > 12000) return NextResponse.json({ loi: 'QUA_DAI' }, { status: 413 });

  try {
    const { mp3, tuCache } = await tieng(text, ngonNgu);
    console.log(`[verso/tieng] kyTu=${text.length} nnu=${ngonNgu} cache=${tuCache ? 'co' : 'khong'} kb=${Math.round(mp3.length / 1024)}`);
    return new NextResponse(new Uint8Array(mp3), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(mp3.length),
        // Nội dung khoá theo mã của chính văn bản, nên đã sinh ra là không đổi nữa.
        'Cache-Control': 'private, max-age=86400',
        'X-Verso-Cache': tuCache ? 'hit' : 'miss',
      },
    });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    console.error('[verso/tieng]', msg.slice(0, 300));
    if (/PERMISSION|UNAUTHENTICATED|has not been used|disabled/i.test(msg))
      return NextResponse.json({ loi: 'CHUA_BAT_TTS' }, { status: 503 });
    if (/RESOURCE_EXHAUSTED|quota|429/i.test(msg))
      return NextResponse.json({ loi: 'HET_QUOTA' }, { status: 429 });
    return NextResponse.json({ loi: 'LOI_TIENG' }, { status: 502 });
  }
}
