import { NextResponse } from 'next/server';
import { moDeSua, goBan } from '@/lib/documents.server';
import { xuLy } from '@/lib/route-helper';

export const runtime = 'nodejs';

/** Mở lại một bản đã phát hành để sửa tiếp — cần đúng mã sửa.
 *
 *  Có endpoint này vì bản nháp chỉ nằm trong máy đang dùng: thầy cô chuyển xong ở
 *  trường, về nhà phát hiện sai một chữ, mà không mở lại được thì phải làm lại từ đầu. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: ma } = await params;
  const khoa = new URL(req.url).searchParams.get('khoa') ?? '';
  const ban = await moDeSua(ma, khoa);
  if (!ban) return NextResponse.json({ loi: 'KHONG_MO_DUOC' }, { status: 404 });
  return NextResponse.json(ban);
}

/** Gỡ bản đã phát hành — cũng cần đúng mã sửa. */
export async function DELETE(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: ma } = await params;
  const khoa = new URL(req.url).searchParams.get('khoa') ?? '';
  return xuLy(() => goBan(ma, khoa));
}
