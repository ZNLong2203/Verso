import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  /** Giữ đường dẫn cũ sống sau khi đổi tên thư mục.
   *
   *  /thu-vien là địa chỉ CÔNG KHAI, đã nằm trong video demo và trong mọi bản đọc
   *  đã phát hành. Đổi tên thư mục sang tiếng Anh mà không chuyển hướng là mọi
   *  đường dẫn cũ chết, kể cả thứ người ta đã đánh dấu trang. */
  async redirects() {
    return [{ source: '/thu-vien', destination: '/library', permanent: true }];
  },
  allowedDevOrigins: ['192.168.1.5', '192.168.1.*', '192.168.0.*', '*.loca.lt', '*.trycloudflare.com'],
};

export default nextConfig;
