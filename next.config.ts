import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  // /thu-vien là địa chỉ công khai, có trong video demo và các bản đọc đã phát hành.
  // Đổi tên thư mục sang /library rồi thì phải giữ chuyển hướng này, không thì link cũ chết.
  async redirects() {
    return [{ source: '/thu-vien', destination: '/library', permanent: true }];
  },
  allowedDevOrigins: ['192.168.1.5', '192.168.1.*', '192.168.0.*', '*.loca.lt', '*.trycloudflare.com'],
};

export default nextConfig;
