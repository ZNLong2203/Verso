# Chạy & triển khai

| | Phiên bản |
|---|---|
| Node | ≥ 20 (đã kiểm với 22) |
| Next.js | 16 (App Router, Turbopack) |
| Tailwind | 4 |

---

## Chạy tại máy

```bash
cd verso
npm install
cp .env.local.example .env.local
npm run dev
```

```bash
# .env (hoặc .env.local)
GEMINI_API_KEY=khoa_cua_ban              # aistudio.google.com/apikey

# Firebase — CHỈ cần khi chạy ở máy cá nhân.
# Trên Cloud Run không cần: dịch vụ dùng danh tính của chính nó.
FIREBASE_PROJECT_ID=verso-43e8b
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@verso-43e8b.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n"
```

> ⚠️ **Không đặt tiền tố `NEXT_PUBLIC_`** cho bất kỳ biến nào ở trên — làm vậy là đẩy khoá
> vào bundle trình duyệt.

| Lệnh | Việc |
|---|---|
| `npm run dev` | máy chủ phát triển |
| `npm run dev:lan` | mở cho điện thoại trong cùng wifi |
| `npm run build` | build production (`output: 'standalone'`) |
| `npm start` | chạy bản standalone, y như trên Cloud Run |
| `npm run typecheck` | `tsc --noEmit` |

> `next start` **không dùng được** với `output: 'standalone'`. Script `start` trỏ thẳng vào
> `node .next/standalone/server.js`, và `postbuild` tự chép `.next/static` cùng `public/` vào đó.

---

## Kiểm chứng khoá không lọt ra client

```bash
npm run build
grep -r "GoogleGenAI" .next/static     # phải không có kết quả
grep -r "$GEMINI_API_KEY" .next/static # phải không có kết quả
```

---

## Triển khai Cloud Run

### Chuẩn bị một lần

```bash
GC=/opt/homebrew/share/google-cloud-sdk/bin/gcloud   # sửa nếu gcloud nằm chỗ khác

# 1. Liên kết thanh toán (Cloud Run bắt buộc, dù chỉ dùng hạn mức miễn phí)
$GC billing projects link verso-43e8b --billing-account=<ID>

# 2. Bật API
$GC services enable run.googleapis.com cloudbuild.googleapis.com \
   artifactregistry.googleapis.com --project verso-43e8b

# 3. Cấp quyền cho service account mặc định.
#    Google siết mặc định từ 2024 — project mới KHÔNG còn tự có quyền Cloud Build.
SA="<số-project>-compute@developer.gserviceaccount.com"
for R in roles/cloudbuild.builds.builder roles/datastore.user roles/logging.logWriter; do
  $GC projects add-iam-policy-binding verso-43e8b \
    --member="serviceAccount:$SA" --role="$R" --condition=None
done
```

### Deploy

```bash
cd verso
$GC run deploy verso --source . \
  --region asia-southeast1 --allow-unauthenticated --project verso-43e8b \
  --set-env-vars "GEMINI_API_KEY=<khoá>,FIREBASE_PROJECT_ID=verso-43e8b" \
  --memory 1Gi --cpu 1 --max-instances 5 --timeout 300
```

Chỉ cần **một** khoá thật là `GEMINI_API_KEY`. Firestore dùng danh tính của dịch vụ, nên
**không có file khoá nào tồn tại trên máy chủ**.

`FIREBASE_PROJECT_ID` phải truyền vì **Cloud Run không tự đặt `GOOGLE_CLOUD_PROJECT`** —
đây là chỗ tôi đã vấp một lần.

---

## Firestore

### Luật bảo mật

```
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
```

Chặn client hoàn toàn. Admin SDK đi vòng qua luật, nên **mọi thao tác ghi đều qua route của ta**.

Kiểm chứng bằng cách giả làm người lạ, chỉ cầm config web công khai:

```bash
curl "https://firestore.googleapis.com/v1/projects/<id>/databases/(default)/documents/ban-verso?key=<web-api-key>"
# phải trả HTTP 403
```

### Không dùng composite index

Truy vấn thư viện chỉ `orderBy` **một** trường — Firestore tự tạo index đơn trường. Lọc môn
và lớp làm trong bộ nhớ, vì mỗi tổ hợp `where + orderBy` lại đòi thêm một composite index,
và đó là cái bẫy bảo trì.

---

## Xử lý sự cố

| Triệu chứng | Nguyên nhân & cách sửa |
|---|---|
| Thư viện trống, mọi link `/doc/…` trả 404, **không báo lỗi gì** | Thiếu `FIREBASE_PROJECT_ID` trên Cloud Run. Kiểu lỗi tệ nhất: hỏng mà không kêu |
| `PERMISSION_DENIED` lúc build | Service account thiếu `roles/cloudbuild.builds.builder` |
| `Firestore has already been initialized` → 500 ngẫu nhiên | Cache bằng biến module không sống sót qua ranh giới Next.js. Phải cache qua `globalThis` |
| `INVALID_ARGUMENT: array contains an invalid nested entity` | Firestore không cho mảng lồng mảng. Nội dung đã được gói thành JSON ở tầng lưu trữ |
| Gọi Gemini hỏng khoảng 1/3 số lượt | Lỗi tạm thời phía Gemini — đã có cơ chế thử lại lùi dần |
| `npm start` báo thiếu khoá dù đã có `.env` | Máy chủ standalone **không đọc `.env`**. Chạy `GEMINI_API_KEY=… npm start` |
| Icon/CSS 404 trên production | `output: 'standalone'` không chép `.next/static` và `public/`. Kiểm `postbuild` và `Dockerfile` |
| Chunk JS trả 403 ở chế độ dev | Next 16 chặn origin lạ. Dùng `localhost` thay `127.0.0.1`, hoặc thêm `allowedDevOrigins` |
| Tài liệu quá lớn | Firestore giới hạn 1MB/tài liệu, chốt chặn đặt ở 900KB. Tách thành nhiều chương |
