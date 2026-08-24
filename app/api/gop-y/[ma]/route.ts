import { NextResponse } from 'next/server';
import { guiGopY, docGopY } from '@/lib/kho.server';
import { xuLy } from '@/lib/route-helper';

export const runtime = 'nodejs';

/** Người đọc báo một chỗ đọc sai. Công khai — không cần đăng nhập gì cả. */
export async function POST(req: Request, { params }: { params: Promise<{ ma: string }> }) {
  const { ma } = await params;
  let khoiId = '', noiDung = '';
  try { ({ khoiId = '', noiDung = '' } = await req.json()); } catch { /* thân rỗng */ }

  if (!noiDung.trim()) return NextResponse.json({ loi: 'THIEU_NOI_DUNG' }, { status: 400 });
  return xuLy(() => guiGopY(ma, khoiId, noiDung));
}

/** Giáo viên xem góp ý — cần đúng mã sửa. */
export async function GET(req: Request, { params }: { params: Promise<{ ma: string }> }) {
  const { ma } = await params;
  const khoa = new URL(req.url).searchParams.get('khoa') ?? '';
  const ds = await docGopY(ma, khoa);
  if (!ds) return NextResponse.json({ loi: 'KHONG_MO_DUOC' }, { status: 404 });
  return NextResponse.json({ ds });
}
