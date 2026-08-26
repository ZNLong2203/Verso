# Đưa Verso lên Google AI Studio

**Đã làm xong:** https://verso-zkare.ai.studio

Ba bước, mất khoảng một phút. **Phải tự làm** — import cần đăng nhập tài khoản Google
của bạn rồi cấp quyền cho GitHub, không ai làm hộ được.

1. Vào [aistudio.google.com](https://aistudio.google.com) → **Build**
2. Bấm dấu **+** trong ô nhập → **Import from GitHub** → cấp quyền → chọn `ZNLong2203/Verso`
3. Bấm **Publish** (góc trên bên phải) → điền **Custom URL** là `verso` → **Publish App**

Được `https://verso.ai.studio`. Tên miền phụ là **duy nhất toàn cầu, ai đăng ký trước
được trước** — nên lấy sớm.

---

## Đọc kỹ chỗ này trước khi bấm Publish

**Bản deploy sẽ hỏng một nửa nếu thiếu biến môi trường.** AI Studio dựng ra một dịch vụ
Cloud Run mới, và dịch vụ đó **không tự có** khoá Gemini hay quyền vào Firestore của bạn.
Thiếu chúng thì:

| Thiếu | Hậu quả |
|---|---|
| `GEMINI_API_KEY` | Không đọc được trang sách nào — hỏng phần lõi |
| Ba biến `FIREBASE_*` | Chuyển được nhưng **không xuất bản, không có thư viện** |
| Quyền Cloud TTS | Không có giọng đọc |
| `VERSO_BUCKET_TIENG` + quyền Storage | Vẫn đọc được, nhưng **mỗi lượt nghe lại tính tiền lại** — kho giọng ngừng hoạt động trong im lặng |

Ba cái đầu hỏng thì thấy ngay. **Cái thứ tư mới nguy**: nó không báo lỗi gì cả, chỉ âm
thầm đốt tiền. Danh sách biến đầy đủ nằm trong [`.env.local.example`](../.env.local.example).

### Đặt biến trong Secrets panel của AI Studio

AI Studio **không** deploy vào project của bạn mà vào hạ tầng riêng của nó, nên không
đặt biến bằng `gcloud` được. Vào **Build → Secrets** rồi thêm bốn mục sau.
`GEMINI_API_KEY` thì AI Studio tự đặt sẵn, khỏi thêm.

| Tên | Giá trị |
|---|---|
| `FIREBASE_PROJECT_ID` | `verso-43e8b` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-…@verso-43e8b.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | cả khối `-----BEGIN PRIVATE KEY-----…` trong file JSON |
| `VERSO_BUCKET_TIENG` | `verso-43e8b-tieng` |
| `APP_URL` | `https://verso-zkare.ai.studio` |

Chạy ngoài Google Cloud thì service account phải tự mang đủ quyền. Đã cấp:

```bash
gcloud storage buckets add-iam-policy-binding gs://verso-43e8b-tieng \
  --member="serviceAccount:firebase-adminsdk-…@verso-43e8b.iam.gserviceaccount.com" \
  --role=roles/storage.objectAdmin --project verso-43e8b

gcloud projects add-iam-policy-binding verso-43e8b \
  --member="serviceAccount:firebase-adminsdk-…@verso-43e8b.iam.gserviceaccount.com" \
  --role=roles/serviceusage.serviceUsageConsumer
```

Kiểm bằng chính khoá đó: gọi được Cloud TTS ✅ và ghi/đọc được thùng giọng ✅.

---

## Một lưu ý về gói miễn phí

Gói starter của AI Studio (2 ứng dụng full-stack, không cần project hay thẻ) **không áp
dụng** cho tài khoản đã từng có lịch sử thanh toán Google Cloud. Bạn đã liên kết tài khoản
thanh toán để chạy Cloud Run, nên nhiều khả năng sẽ deploy vào chính project của mình —
điều đó hoàn toàn ổn, thậm chí tiện hơn vì dùng lại được Firestore và kho giọng sẵn có.

---

## AI Studio TIẾP QUẢN dịch vụ Cloud Run, không dựng cái mới

Chỗ này dễ hiểu nhầm tai hại.

`https://verso-zkare.ai.studio` và `https://verso-262579043496.asia-southeast1.run.app`
là **cùng một máy chủ**. Kiểm bằng cách băm nội dung hai đường dẫn — ra giống hệt nhau:

```bash
for u in https://verso-zkare.ai.studio \
         https://verso-262579043496.asia-southeast1.run.app; do
  curl -sL "$u" | md5
done
```

Dịch vụ Cloud Run `verso` trong project `verso-43e8b` giờ mang dấu quản lý của AI Studio
(`generativelanguage.googleapis.com/nonce`, và nguồn build trỏ vào
`gs://ai-studio-bucket-…/services/verso/version-N/`). Tên miền `.ai.studio` chỉ là cửa
trước của chính dịch vụ đó.

**Hệ quả phải nhớ:**

- **Xoá dịch vụ Cloud Run là xoá luôn link AI Studio.** Không có bản nào "thừa" để dọn.
- **Đừng chạy `gcloud run deploy --source` lên dịch vụ này nữa.** Nó sẽ đá nhau với
  đường build của AI Studio; lệnh đó hiện đã báo lỗi
  *"Source annotation has sources that are not referenced by a container"*.
- Đường đưa thay đổi lên từ nay là: **sửa mã → đẩy lên GitHub → AI Studio kéo về → Publish.**

## Vì sao địa chỉ công khai bị ghi cứng trong mã

Trang chủ là trang **dựng sẵn lúc build**, nên `metadataBase` lúc đó bị nướng thẳng vào
thẻ `og:image`. Một lần build xem thử của AI Studio đặt `APP_URL` thành host tạm dạng
`ais-dev-….run.app`, và trang chủ đi quảng cáo ảnh chia sẻ nằm trên một máy chủ sẽ biến
mất. Vì vậy `app/layout.tsx` ghi cứng địa chỉ chính thức thay vì đọc biến môi trường —
đổi tên miền thì sửa đúng một dòng.
