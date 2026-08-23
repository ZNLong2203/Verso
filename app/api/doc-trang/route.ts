import { docTrangSach } from '@/lib/gemini.server';
import { xuLy } from '@/lib/route-helper';

export const runtime = 'nodejs';
export const maxDuration = 120;   // trang dày, nhiều khối — có thể mất 30–60 giây

export async function POST(req: Request) {
  const { anhBase64, mimeType, monHoc, boiCanh } = await req.json();
  return xuLy(() => docTrangSach(anhBase64, mimeType, monHoc ?? 'khac', boiCanh));
}
