import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Noto_Serif } from 'next/font/google';
import './globals.css';

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
