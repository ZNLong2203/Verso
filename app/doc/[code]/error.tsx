'use client';

import { BaoHong } from '@/components/ErrorNotice';

export default function Hong({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <BaoHong nhan="Chưa mở được bản đọc này" loi={error} lam={reset}
      ve={{ href: '/library', ten: 'Về thư viện' }} />
  );
}
