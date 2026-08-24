import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Noto_Serif } from 'next/font/google';
import './globals.css';

/** Địa chỉ công khai chính thức của Verso.
 *
 *  Ghi cứng, KHÔNG đọc từ biến môi trường. Trang chủ là trang dựng sẵn lúc build,
 *  nên địa chỉ nào có mặt lúc đó sẽ bị nướng thẳng vào thẻ og:image. Một lần build
 *  xem thử của AI Studio đặt APP_URL thành host tạm dạng ais-dev-….run.app, và
 *  trang chủ đi quảng cáo ảnh chia sẻ nằm trên một máy chủ sẽ biến mất.
 *
 *  Cũng không lấy được từ req.url: trên Cloud Run đó là 0.0.0.0:8080 của chính
 *  container — đã dính một lần với mã QR trỏ vào hư không. */
const MIEN_CHINH = 'https://verso-zkare.ai.studio';

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam', display: 'swap',
});
// Chữ có chân cho phần nội dung sách — dễ đọc với học sinh còn thị lực yếu
const notoSerif = Noto_Serif({
  subsets: ['latin', 'vietnamese'], weight: ['400', '600', '700'],
  variable: '--font-noto-serif', display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Verso — Sách giáo khoa nghe được', template: '%s · Verso' },
  description:
    'Biến trang sách giáo khoa Việt Nam thành bản mà học sinh khiếm thị nghe được: ' +
    'mô tả hình vẽ, đọc công thức thành tiếng Việt, duỗi bảng biểu.',
  applicationName: 'Verso',
  metadataBase: new URL(MIEN_CHINH),
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  // Link Verso được dán vào Zalo, Facebook, nhóm lớp — không có ảnh thì hiện trống trơn
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Verso',
    title: 'Verso — Sách giáo khoa nghe được',
    description:
      'Mô tả hình vẽ, đọc công thức thành tiếng Việt, duỗi bảng biểu — cho học sinh khiếm thị Việt Nam.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Verso — Sách giáo khoa nghe được' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verso — Sách giáo khoa nghe được',
    description: 'Mô tả hình vẽ, đọc công thức thành tiếng Việt — cho học sinh khiếm thị Việt Nam.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#3730A3', width: 'device-width', initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnam.variable} ${notoSerif.variable}`}>
      <body className="font-sans">
        <a href="#noi-dung" className="bo-qua">Bỏ qua, tới thẳng nội dung</a>
        {children}
      </body>
    </html>
  );
}
