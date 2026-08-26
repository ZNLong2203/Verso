import { NextResponse } from 'next/server';
import { docTrangSach } from '@/lib/gemini.server';
import { xuLy } from '@/lib/route-helper';

export const runtime = 'nodejs';
export const maxDuration = 120;   // trang dày, nhiều khối — có thể mất 30–60 giây

export async function POST(req: Request) {
  let anhBase64 = '', mimeType = '', monHoc = '', boiCanh: string | undefined;
  try {
    ({ anhBase64, mimeType, monHoc, boiCanh } = await req.json());
  } catch { /* thân rỗng hoặc không phải JSON */ }

  // Kiểm ở đây chứ không để model tự ngã: thiếu ảnh là lỗi của bên gọi, mà trả về
  // "lỗi model" thì người dùng đi sửa nhầm chỗ, còn ta thì tốn một lượt gọi vô ích.
  if (!anhBase64?.trim()) {
    return NextResponse.json({ loi: 'THIEU_ANH' }, { status: 400 });
  }
  if (!mimeType?.startsWith('image/')) {
    return NextResponse.json({ loi: 'KHONG_PHAI_ANH' }, { status: 400 });
  }

  return xuLy(() => docTrangSach(anhBase64, mimeType, (monHoc as never) ?? 'khac', boiCanh));
}
