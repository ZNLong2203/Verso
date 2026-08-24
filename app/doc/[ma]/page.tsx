import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { docBanDaXuatBan } from '@/lib/kho.server';
import { KhoiDoc } from '@/components/KhoiDoc';
import { dungNeo, nhanMuc } from '@/lib/neo';
import { TrinhNghe } from '@/components/TrinhNghe';
import { TaiVe } from '@/components/TaiVe';
import { MON_HOC_INFO, MIEN_TRU } from '@/lib/constants';

/* Trang này KHÔNG có 'use client'.
   Học sinh khiếm thị thường dùng máy cũ, mạng yếu. HTML dựng sẵn ở máy chủ nghĩa là
   trình đọc màn hình có nội dung ngay khi trang về, không phải chờ JavaScript. */

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ ma: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ma } = await params;
  const ban = await docBanDaXuatBan(ma);
  if (!ban) return { title: 'Không tìm thấy bản đọc' };
  return {
    title: ban.tieuDe,
    description: `Bản đọc được của "${ban.tieuDe}" — ${ban.trang.length} trang, dành cho học sinh khiếm thị.`,
  };
}

export default async function TrangDoc({ params }: Props) {
  const { ma } = await params;
  const ban = await docBanDaXuatBan(ma);
  if (!ban) notFound();

  const neo = dungNeo(ban);
  const moiKhoi = ban.trang.flatMap((t) => t.khoi);
  const mucLuc = moiKhoi.filter((k) => k.loai === 'tieu-de' || k.loai === 'bai-tap');
  const soHinh = moiKhoi.filter((k) => k.loai === 'hinh-anh').length;
  const soCongThuc = moiKhoi.filter((k) => k.loai === 'cong-thuc').length;
  const mon = MON_HOC_INFO[ban.monHoc] ?? MON_HOC_INFO.khac;

  return (
    <div className="min-h-screen bg-giay">
      <div className="max-w-3xl mx-auto px-5 py-8">

        <header className="pb-6 mb-2 border-b-2 border-vien">
          <p className="text-sm font-bold uppercase tracking-wider text-verso-700">
            {mon.ten}{ban.lop ? ` · Lớp ${ban.lop}` : ''}
          </p>
          <h1 className="font-doc text-3xl leading-tight mt-2 mb-0">{ban.tieuDe}</h1>
          <p className="text-muc-mo mt-3 text-base leading-relaxed">
            {ban.trang.length} trang · {moiKhoi.length} phần
            {soHinh > 0 && <> · <b className="text-muc-nhat">{soHinh} hình đã được mô tả</b></>}
            {soCongThuc > 0 && <> · {soCongThuc} công thức đọc được</>}
            {ban.nguon && <> · Nguồn: {ban.nguon}</>}
          </p>
        </header>

        {/* Nút nghe cho ai chưa cài trình đọc màn hình. Nó đọc ĐÚNG thứ trình đọc
            màn hình đọc, nên cũng là công cụ tự kiểm chất lượng bản chuyển đổi. */}
        <section aria-label="Nghe bản đọc"
          className="my-5 p-4 rounded-lg bg-verso-50 border border-verso-200">
          <TrinhNghe />
        </section>

        <TaiVe ma={ma} />

        {/* Mục lục là tính năng quan trọng nhất với học sinh khiếm thị:
            thầy cô giao "làm bài 3" thì các em nhảy thẳng tới bài 3, không nghe lại từ đầu. */}
        {mucLuc.length > 0 && (
          <nav aria-label="Mục lục" className="my-6 p-5 bg-giay-sau rounded-lg">
            <h2 className="text-base font-extrabold m-0 mb-3">Mục lục — nhảy nhanh tới phần cần đọc</h2>
            {/* Liên kết mục lục để cỡ chữ thường thì chỉ cao ~20px — quá nhỏ với người
                thị lực yếu hoặc tay run. Cho thành khối, có đệm, cao tối thiểu 44px. */}
            <ol className="m-0 pl-5 space-y-0.5">
              {mucLuc.map((k) => (
                <li key={k.id} className={k.capTieuDe === 1 ? 'font-bold' : ''}>
                  <a href={`#${neo.get(k.id)}`}
                    className="block py-2.5 min-h-[44px] text-verso-700 underline underline-offset-2 hover:bg-verso-100 rounded px-2 -mx-2">
                    {nhanMuc(k)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <main id="noi-dung" className="ban-doc">
          {ban.trang.map((t, i) => (
            <article key={t.id} aria-label={t.soTrang ? `Trang ${t.soTrang}` : `Trang ${t.thuTu}`}>
              <p className="chi-doc-man-hinh">
                Bắt đầu {t.soTrang ? `trang ${t.soTrang}` : `trang thứ ${t.thuTu}`} của sách.
              </p>
              {t.khoi.map((k) => (
                <KhoiDoc key={k.id} khoi={k} neo={neo.get(k.id) ?? `khoi-${k.id}`} trang={i + 1} lechCap={1} />
              ))}
            </article>
          ))}
        </main>

        <footer className="mt-12 pt-6 border-t border-vien text-base text-muc-mo leading-relaxed">
          {ban.nguoiChuyen && <p className="m-0 mb-2">Người chuyển đổi: {ban.nguoiChuyen}</p>}
          <p className="m-0">{MIEN_TRU}</p>
        </footer>

      </div>
    </div>
  );
}
