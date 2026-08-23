# Verso — Sách giáo khoa nghe được

**Biến trang sách giáo khoa Việt Nam thành bản mà học sinh khiếm thị nghe được.**

Dự thi **AI Riser Vietnam 2026 · #BuildwithGoogleAI** — hạng mục *Inclusive Access · Education*

🔗 **Dùng thử:** https://verso-262579043496.asia-southeast1.run.app

---

## Vấn đề: "nạn đói sách"

Việt Nam có khoảng **2 triệu người khiếm thị**, trong đó **16.000–23.000 trẻ em**. Nhưng
**dưới 1% sách ở Việt Nam** từng được chuyển sang dạng tiếp cận được.

Suốt bốn năm qua **không có sách giáo khoa cho học sinh khiếm thị** — các em vào lớp 9 thiếu
sách ở tất cả các môn, kể cả Toán, Văn, Anh. Giáo viên làm xuyên hè không nghỉ để chuyển sách
sang chữ nổi mà vẫn không đủ. Sách chữ nổi đắt gấp **5–6 lần** sách thường.

**Nút thắt là công sức chuyển đổi thủ công.** Đó chính là thứ AI thay thế được.

## Chỗ các công cụ hiện có bỏ trống

Đã có công cụ chuyển tài liệu sang dạng tiếp cận (SensusAccess, RoboBraille…). Nhưng tất cả
đều là **OCR + đổi định dạng**. Không cái nào làm được ba việc khiến sách giáo khoa khác
sách văn xuôi:

| Trên giấy | Máy đọc màn hình hiện tại | Verso |
|---|---|---|
| Hình tam giác ABC vuông tại A | *im lặng — chỉ là ảnh* | *"Tam giác ABC vuông tại đỉnh A, cạnh huyền BC nằm ngang, từ A hạ đường cao AH nét đứt…"* |
| `x² + 2x − 3 = 0` | *"x mũ hai..."* hoặc rác | *"x bình phương cộng hai x trừ ba bằng không"* |
| `√2/2` trong bảng | không đọc được | *"căn bậc hai của hai trên hai"* |
| Chú thích `chùng chình⁽¹⁾` | *"chùng chình MỘT"* — hỏng câu thơ | *"chùng chình, chú thích một"* — có liên kết nhảy tới nghĩa |
| Trang 2 cột | đọc ngang, lẫn thứ tự | đúng thứ tự đọc của người biên soạn |

Và đây là phần học sinh **đói nhất**: sách Toán, Lý, Hoá, Địa.

## Cách dùng

**Giáo viên** (máy tính): điền thông tin → tải ảnh trang sách lên → Verso đọc →
**duyệt lại phần được gắn cờ** → xuất bản → nhận một đường link.

**Học sinh** (máy nào cũng được): mở link. Trình đọc màn hình sẵn có trên máy
(NVDA, VoiceOver, TalkBack) đọc được ngay. **Không cài gì cả.**

Có **mục lục nhảy nhanh** — thầy cô giao "làm bài 3" thì các em nhảy thẳng tới bài 3.

## Thiết kế an toàn

Học sinh khiếm thị **không có cách nào tự đối chiếu với sách gốc**. Sai sót lọt ra là các em
học sai mà không biết. Nên:

- Mỗi khối nội dung mang **cờ độ tin cậy**; chỗ model không chắc được đánh dấu vàng kèm lý do
- **Hình vẽ và công thức LUÔN phải qua mắt giáo viên**, bất kể model tự tin đến đâu — đó là hai
  chỗ mà sai sót vô hình với người không nhìn thấy
- Máy chủ **từ chối phát hành** khi còn khối chưa ai xác nhận (HTTP 409), không chỉ ẩn nút

## Cơ sở pháp lý

Việt Nam gia nhập **Hiệp ước Marrakesh** tháng 12/2022, hiệu lực từ 6/3/2023, nội luật hoá bằng
**Điều 25a Luật Sở hữu trí tuệ sửa đổi 2022** và **Nghị định 17/2023/NĐ-CP** — ngoại lệ bản quyền
cho người khuyết tật chữ in.

Verso chỉ lưu **bản đã chuyển dạng**, tự động bỏ ảnh scan gốc trước khi đưa lên máy chủ.

## Công nghệ

Next.js 16 · React 19 · TypeScript · Tailwind 4 · Gemini · Firestore · Cloud Run

| Việc | Công nghệ Google |
|---|---|
| Đọc trang sách, mô tả hình, đọc công thức | Gemini multimodal + `responseSchema` |
| Prompt riêng cho 9 môn học | Toán, Ngữ văn, Lý, Hoá, Sinh, Sử, Địa, Anh, GDCD |
| Lưu bản đọc, thư viện dùng chung | Cloud Firestore |
| Triển khai công khai | Cloud Run (`asia-southeast1`) |

**Khoá API không bao giờ vào trình duyệt.** Mọi lệnh gọi Gemini đi qua route handler phía máy chủ;
`lib/gemini.server.ts` mở đầu bằng `import 'server-only'`. Trên Cloud Run, Firestore dùng danh
tính sẵn có của dịch vụ — **không có file khoá nào tồn tại trên máy chủ**.

## Chạy tại máy

```bash
cd verso
npm install
cp .env.local.example .env.local     # điền khoá Gemini
npm run dev
```

## Cấu trúc

```
verso/
  app/
    page.tsx            xưởng làm việc của giáo viên (4 bước)
    doc/[ma]/page.tsx   trang học sinh đọc — server-rendered, HTML thuần
    thu-vien/           thư viện dùng chung
    api/                doc-trang · xuat-ban
  lib/
    prompt.ts           9 nguyên tắc + hướng dẫn riêng từng môn  ← linh hồn sản phẩm
    gemini.server.ts    schema, thử lại có lùi dần
    kho.server.ts       Firestore, mã chia sẻ, thư viện
    types.ts            mô hình Khối — đơn vị trung tâm
  components/
    KhoiDoc.tsx         bộ dựng khối tiếp cận được  ← quyết định screen reader nghe gì
```

## Miễn trừ

Verso là công cụ hỗ trợ chuyển đổi, không thay thế bản gốc. Giáo viên cần duyệt lại trước khi
phát hành. Bản chuyển đổi chỉ dành cho người khuyết tật chữ in.
