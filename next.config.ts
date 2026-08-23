import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.1.5', '192.168.1.*', '192.168.0.*', '*.loca.lt', '*.trycloudflare.com'],
};

export default nextConfig;
