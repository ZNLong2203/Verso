import 'server-only';
import { NextResponse } from 'next/server';

export async function xuLy<T>(fn: () => Promise<T>) {
  try {
    return NextResponse.json(await fn());
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? e);
    if (msg.includes('SAI_MA_SUA'))
      return NextResponse.json({ loi: 'SAI_MA_SUA' }, { status: 403 });
    if (msg.includes('THIEU_KHOA_API') || /API_KEY_INVALID|API key not valid/i.test(msg))
      return NextResponse.json({ loi: 'THIEU_KHOA_API' }, { status: 503 });
    if (/RESOURCE_EXHAUSTED|quota|rate limit|429/i.test(msg))
      return NextResponse.json({ loi: 'HET_QUOTA' }, { status: 429 });
    const qualon = msg.match(/QUA_LON:(\d+)/);
    if (qualon)
      return NextResponse.json({ loi: 'QUA_LON', kb: Number(qualon[1]) }, { status: 413 });
    if (/SAFETY|blocked|PROHIBITED/i.test(msg))
      return NextResponse.json({ loi: 'BI_CHAN' }, { status: 422 });
    console.error('[verso/api]', msg);
    return NextResponse.json({ loi: 'LOI_MODEL' }, { status: 502 });
  }
}
