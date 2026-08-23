import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { docBanDaXuatBan } from '@/lib/kho.server';
import { KhoiDoc, maSo } from '@/components/KhoiDoc';
import { TrinhNghe } from '@/components/TrinhNghe';
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
          <p className="text-muc-mo mt-3 text-sm leading-relaxed">
            {ban.trang.length} trang · {moiKhoi.length} phần
            {soHinh > 0 && <> · <b className="text-muc-nhat">{soHinh} hình đã được mô tả</b></>}
            {soCongThuc > 0 && <> · {soCongThuc} công thức đọc được</>}
            {ban.nguon && <> · Nguồn: {ban.nguon}</>}
          </p>
        </header>

        {/* Nút nghe cho ai chưa cài trình đọc màn hình. Nó đọc ĐÚNG thứ trình đọc
            màn hình đọc, nên cũng là công cụ tự kiểm chất lượng bản chuyển đổi. */}
        <div className="my-5 p-4 rounded-lg bg-verso-50 border border-verso-200">
          <TrinhNghe />
        </div>

        {/* Mục lục là tính năng quan trọng nhất với học sinh khiếm thị:
            thầy cô giao "làm bài 3" thì các em nhảy thẳng tới bài 3, không nghe lại từ đầu. */}
        {mucLuc.length > 0 && (
          <nav aria-label="Mục lục" className="my-6 p-5 bg-giay-sau rounded-lg">
            <h2 className="text-base font-extrabold m-0 mb-3">Mục lục — nhảy nhanh tới phần cần đọc</h2>
            <ol className="m-0 pl-5 space-y-1.5">
              {mucLuc.map((k) => {
                const dich = k.loai === 'bai-tap' && k.soBaiTap
                  ? `#bai-${maSo(k.soBaiTap)}` : `#khoi-${k.id}`;
                // Số hiệu đôi khi đã chứa sẵn chữ "Bài" ("Bài 1") — đừng ghép thành "Bài tập Bài 1"
                const nhan = k.loai === 'bai-tap'
                  ? (k.soBaiTap
                      ? (/^bài/i.test(k.soBaiTap) ? k.soBaiTap : `Bài ${k.soBaiTap}`)
                      : 'Bài tập')
                  : (k.vanBan ?? '');
                return (
                  <li key={k.id} className={k.capTieuDe === 1 ? 'font-bold' : ''}>
                    <a href={dich} className="text-verso-700 underline underline-offset-2">{nhan}</a>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <main id="noi-dung" className="ban-doc">
          {ban.trang.map((t) => (
            <article key={t.id} aria-label={t.soTrang ? `Trang ${t.soTrang}` : `Trang ${t.thuTu}`}>
              <p className="chi-doc-man-hinh">
                Bắt đầu {t.soTrang ? `trang ${t.soTrang}` : `trang thứ ${t.thuTu}`} của sách.
              </p>
              {t.khoi.map((k) => <KhoiDoc key={k.id} khoi={k} lechCap={1} />)}
            </article>
          ))}
        </main>

        <footer className="mt-12 pt-6 border-t border-vien text-sm text-muc-mo leading-relaxed">
          {ban.nguoiChuyen && <p className="m-0 mb-2">Người chuyển đổi: {ban.nguoiChuyen}</p>}
          <p className="m-0">{MIEN_TRU}</p>
        </footer>

      </div>
    </div>
  );
}
