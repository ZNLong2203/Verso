/** Bộ nạp cho `node --test`.
 *
 *  Mã nguồn dùng alias `@/…` và import không kèm đuôi — đó là quy ước của Next.js,
 *  còn Node thì không biết. Thay vì sửa mã nguồn cho hợp với bộ chạy test (làm thế
 *  là để đuôi test quyết định hình dạng sản phẩm), dạy bộ chạy hiểu quy ước sẵn có. */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const GOC = new URL('../', import.meta.url);

export async function resolve(ten, boiCanh, tiep) {
  let t = ten;
  if (t.startsWith('@/')) t = new URL(t.slice(2), GOC).href;

  const coDuoi = /\.[cm]?[jt]sx?$/.test(t);
  if (!coDuoi && (t.startsWith('.') || t.startsWith('file:'))) {
    const goc = new URL(t, boiCanh.parentURL ?? GOC);
    for (const them of ['.ts', '.tsx', '/index.ts']) {
      const thu = new URL(goc.href + them);
      if (existsSync(fileURLToPath(thu))) return tiep(thu.href, boiCanh);
    }
  }
  return tiep(t, boiCanh);
}
