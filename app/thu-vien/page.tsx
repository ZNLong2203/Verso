import type { Metadata } from 'next';
import { danhSachThuVien } from '@/lib/kho.server';
import { coFirebase } from '@/lib/firebase.server';
import { MON_HOC_INFO } from '@/lib/constants';
import type { MonHoc } from '@/lib/types';
import { GoBanDoc } from '@/components/GoBanDoc';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Thư viện bản đọc',
  description: 'Các bản sách giáo khoa đã được chuyển sang dạng học sinh khiếm thị đọc được.',
};

type Props = { searchParams: Promise<{ mon?: string; lop?: string; tim?: string }> };

export default async function ThuVien({ searchParams }: Props) {
  const sp = await searchParams;
  const mon = sp.mon as MonHoc | undefined;
  const lop = sp.lop ? Number(sp.lop) : undefined;

  // Trang này phải sống sót cả khi kho trục trặc — thư viện hỏng thì hiện lời nhắn,
  // không được ném 500 vào mặt giáo viên đang tìm tài liệu.
  let ds: Awaited<ReturnType<typeof danhSachThuVien>> = [];
  let loiKho = '';
  if (coFirebase()) {
    try {
      ds = await danhSachThuVien({ monHoc: mon, lop, tuKhoa: sp.tim });
    } catch (e) {
      loiKho = String((e as Error)?.message ?? e).slice(0, 200);
      console.error('[verso/thu-vien]', loiKho);
    }
  }

  const tongHinh = ds.reduce((s, b) => s + b.soHinh, 0);

  return (
    <div className="min-h-screen bg-giay">
      <header className="border-b border-vien bg-white">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5 no-underline text-muc min-h-[44px] py-1">
            <span className="w-9 h-9 rounded-lg bg-verso-700 text-white grid place-items-center font-doc font-bold text-lg">V</span>
            <span className="font-extrabold">Verso</span>
          </a>
          <a href="/" className="text-sm font-bold text-verso-700 inline-flex items-center
            min-h-[44px] px-2 -mx-2 rounded hover:bg-verso-50">Chuyển tài liệu mới</a>
        </div>
      </header>

      <main id="noi-dung" className="max-w-5xl mx-auto px-5 py-8">
        <h1 className="text-2xl font-extrabold m-0">Thư viện bản đọc</h1>
        <p className="text-muc-nhat mt-2 max-w-2xl leading-relaxed">
          Chuyển một lần, mọi trường cùng dùng. Một cô giáo ở Hà Nội chuyển xong chương này thì
          học sinh ở Cần Thơ mở ra đọc được ngay — <b>không ai phải làm lại</b>.
        </p>

        {ds.length > 0 && (
          <p className="text-sm text-muc-mo mt-3">
            {ds.length} bản đọc · <b className="text-muc-nhat">{tongHinh} hình đã được mô tả</b>
          </p>
        )}

        <form method="get" className="mt-6 flex flex-wrap gap-2 items-end" role="search">
          <div>
            <label htmlFor="tim" className="block text-xs font-bold text-muc-mo mb-1">Tìm theo tên</label>
            <input id="tim" name="tim" defaultValue={sp.tim ?? ''} placeholder="Toán 9, Sang thu…"
              className="px-3 py-2 rounded-lg border-2 border-vien bg-white focus:border-verso-600 outline-none text-sm" />
          </div>
          <div>
            <label htmlFor="mon" className="block text-xs font-bold text-muc-mo mb-1">Môn</label>
            <select id="mon" name="mon" defaultValue={sp.mon ?? ''}
              className="px-3 py-2 rounded-lg border-2 border-vien bg-white focus:border-verso-600 outline-none text-sm">
              <option value="">Tất cả</option>
              {(Object.keys(MON_HOC_INFO) as MonHoc[]).map((m) => (
                <option key={m} value={m}>{MON_HOC_INFO[m].ten}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lop" className="block text-xs font-bold text-muc-mo mb-1">Lớp</label>
            <select id="lop" name="lop" defaultValue={sp.lop ?? ''}
              className="px-3 py-2 rounded-lg border-2 border-vien bg-white focus:border-verso-600 outline-none text-sm">
              <option value="">Tất cả</option>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map((l) => <option key={l} value={l}>Lớp {l}</option>)}
            </select>
          </div>
          <button type="submit" className="px-4 min-h-[44px] rounded-lg bg-verso-700 text-white text-sm font-bold">Lọc</button>
        </form>

        {loiKho ? (
          <p role="alert" className="mt-8 p-4 rounded-lg bg-loi-50 border border-loi-200 text-loi-700">
            Chưa tải được thư viện lúc này. Bạn thử lại sau một chút nhé.
          </p>
        ) : !coFirebase() ? (
          <p className="mt-8 p-4 rounded-lg bg-can-kiem-50 border border-can-kiem-200 text-can-kiem-700">
            Máy chủ chưa cấu hình nơi lưu trữ nên thư viện chưa hoạt động.
          </p>
        ) : ds.length === 0 ? (
          <div className="mt-10 text-center py-12">
            <p className="font-extrabold text-lg m-0">Thư viện còn trống</p>
            <p className="text-muc-mo mt-2 mb-5">Bản đọc đầu tiên sẽ do bạn tạo ra.</p>
            <a href="/" className="inline-block px-5 py-3 rounded-lg bg-verso-700 text-white font-bold">
              Chuyển tài liệu đầu tiên
            </a>
          </div>
        ) : (
          /* flex-col + mt-auto: tiêu đề dài ngắn khác nhau vẫn cho dòng số liệu nằm
             cùng một độ cao, nếu không cả hàng thẻ trông xô lệch.

             Thẻ không còn là một <a> bọc tất cả, vì bên trong đã có nút Gỡ — nút nằm
             trong liên kết là HTML sai và bàn phím không đi vào nổi. Thay bằng liên kết
             phủ kín: chỉ tiêu đề là liên kết thật, lớp after phủ hết mặt thẻ cho ai quen
             bấm vào chỗ nào cũng được. */
          <ul className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 m-0 p-0 list-none">
            {ds.map((b) => (
              <li key={b.maChiaSe}
                className="relative flex flex-col h-full p-4 rounded-xl bg-white border border-vien
                           transition-colors hover:border-verso-600 focus-within:border-verso-600">
                <p className="text-xs font-bold uppercase tracking-wider text-verso-700 m-0">
                  {MON_HOC_INFO[b.monHoc]?.ten ?? 'Khác'}{b.lop ? ` · Lớp ${b.lop}` : ''}
                </p>
                <p className="font-doc font-bold text-lg leading-snug mt-1.5 mb-2">
                  <a href={`/doc/${b.maChiaSe}`}
                    className="no-underline text-muc after:absolute after:inset-0 after:rounded-xl
                               focus-visible:outline-2 focus-visible:outline-offset-2">
                    {b.tieuDe}
                  </a>
                </p>
                <div className="mt-auto pt-2">
                  <p className="text-sm text-muc-mo m-0">
                    {b.soTrang} trang · {b.soKhoi} phần
                    {b.soHinh > 0 && <> · <b className="text-muc-nhat">{b.soHinh} hình mô tả</b></>}
                  </p>
                  {b.nguoiChuyen && (
                    <p className="text-xs text-muc-mo mt-1.5 mb-0">Người chuyển: {b.nguoiChuyen}</p>
                  )}
                  <GoBanDoc ma={b.maChiaSe} ten={b.tieuDe} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
