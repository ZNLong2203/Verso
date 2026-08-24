'use client';

import { BaoHong } from '@/components/BaoHong';

export default function Hong({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <BaoHong nhan="Chưa mở được thư viện" loi={error} lam={reset}
      ve={{ href: '/', ten: 'Về trang chuyển đổi' }} />
  );
}
