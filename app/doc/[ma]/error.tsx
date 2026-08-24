'use client';

import { BaoHong } from '@/components/BaoHong';

export default function Hong({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <BaoHong nhan="Chưa mở được bản đọc này" loi={error} lam={reset}
      ve={{ href: '/thu-vien', ten: 'Về thư viện' }} />
  );
}
