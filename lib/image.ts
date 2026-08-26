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

/** Cắt một hình ra khỏi ảnh trang, theo khung Gemini chỉ.
 *
 *  Vì sao đáng cắt: học sinh khiếm thị hoàn toàn thì mô tả bằng lời là đủ, nhưng
 *  phần lớn "khiếm thị" ở trường là NHÌN KÉM — các em phóng to lên vẫn xem được
 *  hình. Và giáo viên duyệt thì cần nhìn thấy chính hình đó mới đối chiếu được
 *  lời mô tả, thay vì tin suông.
 *
 *  Khung là 0–1000 chuẩn hoá theo [ymin, xmin, ymax, xmax]. */
export function catHinh(
  dataUrl: string,
  khung: [number, number, number, number],
  canh = 900,
): Promise<string | null> {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      const [ymin, xmin, ymax, xmax] = khung;
      // Nới nhẹ ra ngoài cho hình không bị cắt sát mép, rồi kẹp lại trong ảnh.
      const kep = (v: number, t: number) => Math.max(0, Math.min(t, v));
      const x0 = kep(Math.round((xmin / 1000) * img.width) - 8, img.width);
      const y0 = kep(Math.round((ymin / 1000) * img.height) - 8, img.height);
      const x1 = kep(Math.round((xmax / 1000) * img.width) + 8, img.width);
      const y1 = kep(Math.round((ymax / 1000) * img.height) + 8, img.height);
      const w = x1 - x0, h = y1 - y0;
      // Khung vô lý (model đoán trượt) thì thà không có ảnh còn hơn có ảnh sai.
      if (w < 24 || h < 24 || w > img.width || h > img.height) return ok(null);

      const tl = Math.min(1, canh / Math.max(w, h));
      const c = document.createElement('canvas');
      c.width = Math.round(w * tl); c.height = Math.round(h * tl);
      const ctx = c.getContext('2d');
      if (!ctx) return ok(null);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x0, y0, w, h, 0, 0, c.width, c.height);
      ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => ok(null);
    img.src = dataUrl;
  });
}
