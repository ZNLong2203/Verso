import { xuatBan } from '@/lib/kho.server';
import { coFirebase } from '@/lib/firebase.server';
import { demChuaDuyet } from '@/lib/chuanHoa';
import { xuLy } from '@/lib/route-helper';
import { NextResponse } from 'next/server';
import type { BanVerso } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!coFirebase()) {
    return NextResponse.json({ loi: 'THIEU_FIREBASE' }, { status: 503 });
  }
  const ban = (await req.json()) as BanVerso;

  if (!ban?.tieuDe?.trim()) {
    return NextResponse.json({ loi: 'THIEU_TIEU_DE' }, { status: 400 });
  }
  if (!ban.trang?.length) {
    return NextResponse.json({ loi: 'CHUA_CO_TRANG' }, { status: 400 });
  }
  // Chốt chặn: không cho phát hành khi còn khối chưa ai xác nhận.
  // Học sinh khiếm thị không có cách nào tự đối chiếu với sách gốc, nên
  // sai sót lọt ra là các em học sai mà không biết.
  const conLai = demChuaDuyet(ban.trang);
  if (conLai > 0) {
    return NextResponse.json({ loi: 'CON_KHOI_CHUA_DUYET', soKhoi: conLai }, { status: 409 });
  }

  return xuLy(() => xuatBan(ban));
}
