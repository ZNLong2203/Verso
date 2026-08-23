'use client';

/** Trang sách scan 4000px không đọc rõ hơn 1800px, chỉ chậm và tốn token hơn.
 *  1800 là mức giữ được chữ chân trang mà vẫn gửi đi nhanh. */
export const CANH_TOI_DA = 1800;

export function nenAnh(file: File | Blob, canh = CANH_TOI_DA): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  return new Promise((ok, loi) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const tl = Math.min(1, canh / Math.max(img.width, img.height));
      const w = Math.round(img.width * tl), h = Math.round(img.height * tl);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return loi(new Error('Không dựng được ảnh.'));
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = c.toDataURL('image/jpeg', 0.9);
      ok({ dataUrl, base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
    };
    img.onerror = () => { URL.revokeObjectURL(url); loi(new Error('Không đọc được tệp ảnh.')); };
    img.src = url;
  });
}

/** Ảnh xem lại nhỏ, để giáo viên đối chiếu khối với trang gốc mà không ngốn localStorage. */
export function anhNho(dataUrl: string, canh = 500): Promise<string> {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      const tl = Math.min(1, canh / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * tl); c.height = Math.round(img.height * tl);
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
      ok(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => ok(dataUrl);
    img.src = dataUrl;
  });
}
