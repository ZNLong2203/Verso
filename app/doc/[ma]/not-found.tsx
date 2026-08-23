import Link from 'next/link';

export default function KhongThay() {
  return (
    <main id="noi-dung" className="min-h-screen bg-giay grid place-items-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-extrabold">Không tìm thấy bản đọc này</h1>
        <p className="text-muc-nhat mt-3 leading-relaxed">
          Mã chia sẻ có thể bị gõ nhầm, hoặc bản đọc đã được gỡ. Bạn kiểm tra lại
          đường dẫn giúp nhé — mã gồm 8 chữ và số.
        </p>
        <Link href="/thu-vien" className="inline-block mt-6 px-5 py-3 rounded-lg bg-verso-700 text-white font-bold">
          Xem thư viện bản đọc
        </Link>
      </div>
    </main>
  );
}
