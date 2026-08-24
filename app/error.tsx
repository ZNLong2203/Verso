'use client';

import { BaoHong } from '@/components/BaoHong';

export default function Hong({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <BaoHong nhan="Trang này gặp trục trặc" loi={error} lam={reset}
      ve={{ href: '/', ten: 'Về trang đầu' }} />
  );
}
