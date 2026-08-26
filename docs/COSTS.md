# Chi phí thật để chạy Verso

Câu hỏi quyết định công cụ này có triển khai được cho cả một trường hay không là
*"một trang tốn bao nhiêu?"* — mà đoán thì không trả lời được. Dưới đây là **số đo thật**,
kèm cách đo để ai cũng kiểm lại được.

---

## Cách đo

`lib/gemini.server.ts` ghi lượng token của mỗi lượt gọi vào log Cloud Run:

```
[verso/token] doc-trang model=gemini-3.7-flash vao=3137 ra=2498 suyNghi=1795 tong=7430
```

Đọc lại bằng:

```bash
gcloud logging read \
  'resource.type=cloud_run_revision AND resource.labels.service_name=verso
   AND textPayload:"verso/token"' \
  --project verso-43e8b --format='value(textPayload)' --freshness=1h
```

Số dưới đây lấy từ **7 lượt chuyển thật** trên bản đang chạy: 4 lượt với hai trang mẫu
(Toán và Ngữ văn) và 3 lượt với **trang quét thật từ SGK Toán 9 bản PDF của Bộ**.

---

## Số đo

| Trang | Token vào | Token ra (gồm suy nghĩ) | Tiền |
|---|---:|---:|---:|
| Mẫu Toán 9 | 3.119 | 3.434 | $0,0152 |
| Mẫu Toán 9 | 3.119 | 3.555 | $0,0157 |
| Mẫu Ngữ văn 9 | 3.146 | 2.702 | $0,0125 |
| Mẫu Ngữ văn 9 | 3.146 | 2.446 | $0,0115 |
| **SGK thật (quét)** | 3.137 | 4.293 | $0,0185 |
| **SGK thật (quét)** | 3.137 | 4.134 | $0,0179 |
| **SGK thật (quét)** | 3.137 | 3.360 | $0,0150 |

**Trung bình $0,0152 một trang.** Thấp nhất $0,0115, cao nhất $0,0185.

Giá dùng để tính: `gemini-3.7-flash` bảng giá công bố tới 31/12/2026 — vào **$0,75**/triệu
token, ra **$3,75**/triệu token, **token suy nghĩ tính theo giá ra**. Quy đổi ≈ 26.000 đ/USD.

---

## Quy ra việc thật

| | Tiền |
|---|---|
| Một trang sách | ≈ **400 đ** |
| Một chương (~30 trang) | ≈ **12.000 đ** |
| **Cả cuốn SGK Toán 9 — 123 trang** | ≈ **48.500 đ** ($1,87) |

Chuyển trọn một cuốn sách giáo khoa sang dạng nghe được tốn **chưa tới một bát phở**.

Đối chiếu: sách chữ nổi và sách nói hiện làm **thủ công**, mỗi cuốn mất hàng tuần công
người. Đó mới là chi phí thật mà Verso cắt đi — tiền gọi model gần như không đáng kể.

---

## Giọng đọc

Giọng do **Cloud Text-to-Speech** sinh ở máy chủ, giọng `vi-VN-Chirp3-HD-Achernar`
(bậc cao nhất, **$30**/triệu ký tự, **1 triệu ký tự miễn phí mỗi tháng**).

Đo trên tài liệu mẫu 2 trang: **28 khối, 3.125 ký tự** lời đọc → **1.563 ký tự một trang**.

| | Tiền |
|---|---|
| Một trang sách | $0,047 ≈ **1.219 đ** |
| Cả cuốn SGK 123 trang | $5,77 ≈ **150.000 đ** |
| Hạn mức miễn phí hằng tháng | ≈ **640 trang** |

Con số này là **một lần cho cả tài liệu**, không phải mỗi lượt nghe: mỗi đoạn được
lưu theo mã băm của chính nội dung (`lib/tts.server.ts`), nên bao nhiêu học sinh
nghe cũng chỉ tổng hợp đúng một lần. Đo trên bản chạy thật: lần đầu **3,0 giây**,
lần sau **0,3 giây** và không tốn thêm gì.

Không có cache thì đây là khoản đắt nhất của cả dự án — một lượt nghe trọn tài liệu
tốn gấp ba lần tiền chuyển đổi chính tài liệu đó.

Tốc độ đọc đổi bằng `playbackRate` ở trình duyệt, **không** tổng hợp lại — một tệp
đã lưu phục vụ được cả bốn mức tốc độ.

**Cộng cả hai khoản:** một trang ≈ **1.620 đ**, cả cuốn SGK 123 trang ≈ **199.000 đ**.

---

## Những khoản khác

**Cloud Run** — dự án đặt `min-instances = 0`, không ai dùng thì không tính tiền. Ở mức
vài trường dùng, phần này nằm gọn trong hạn mức miễn phí hằng tháng.

**Firestore** — mỗi bản đọc là **một** tài liệu, chỉ vài chục KB chữ. Ảnh trang sách gốc
bị bóc ra trước khi lưu (`bocAnhGoc`), vừa đúng phạm vi Marrakesh vừa giữ dung lượng nhỏ.
Hạn mức miễn phí thừa sức cho quy mô này.

**Tách PDF** chạy ngay trên máy giáo viên bằng pdf.js — **không tốn gì**, và tệp sách
không rời khỏi máy họ.

**Kho giọng đã tổng hợp** nằm ở Cloud Storage, mỗi trang khoảng 300 KB. Cả cuốn SGK
chưa tới 40 MB — nằm gọn trong hạn mức miễn phí.

---

## Cách giảm nữa nếu cần

`MODEL_DU_PHONG` là `gemini-2.5-flash` (vào $0,30 / ra $2,50), rẻ hơn khoảng **30%**.
Verso đã tự lùi về model này khi tài khoản chưa mở model mới, nên chuyển hẳn sang nó
chỉ là đổi một hằng số trong `lib/constants.ts`.

Chỗ tốn nhất là **token ra**, mà phần lớn token ra là mô tả hình vẽ — tức là đúng thứ
đáng tiền nhất trong cả sản phẩm.
