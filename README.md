# Verso — Sách giáo khoa nghe được

**Biến trang sách giáo khoa Việt Nam thành bản mà học sinh khiếm thị nghe được.**

Dự thi **AI Riser Vietnam 2026 · #BuildwithGoogleAI** — hạng mục *Inclusive Access · Education*

🔗 **Dùng thử:** https://verso-zkare.ai.studio

🛠 **Bản dự phòng (Cloud Run):** https://verso-262579043496.asia-southeast1.run.app

> Mở lên bấm **"Thử trang mẫu Toán 9"** là thấy kết quả ngay, không cần có sẵn ảnh nào.

---

## Vấn đề: "nạn đói sách"

Việt Nam có khoảng **2 triệu người khiếm thị và suy giảm thị lực**, trong đó
**16.000–23.000 trẻ em**. Nhưng **chưa tới 1% sách ở Việt Nam** từng được chuyển sang định
dạng tiếp cận được.[^1]

Không phải vì không ai làm. **In chữ nổi tốn gấp 5–6 lần sách thường**[^2] — một bộ sách
giáo khoa chữ nổi lớp 1 khoảng **14 triệu đồng**, lớp 6 khoảng **18 triệu đồng**.[^3] Chương
trình giáo dục phổ thông mới triển khai từ năm 2020, nhưng việc chuyển sang chữ nổi chạy sau
từng lớp một: trường PTCS Nguyễn Đình Chiểu Hà Nội đã in được lớp 1, 2, 3, 6, 7 — **nhiều
lớp khác đến nay vẫn chưa có sách**.[^3]

Hành lang pháp lý thì đã mở: Việt Nam gia nhập **Hiệp ước Marrakesh** ngày 6/12/2022, hiệu
lực từ 6/3/2023, nội luật hoá bằng **Điều 25a Luật Sở hữu trí tuệ** và **Nghị định
17/2023/NĐ-CP**.

**Nút thắt không nằm ở luật, mà ở công sức chuyển đổi thủ công.** Đó chính là thứ AI thay
thế được.

[^1]: Nguyễn Diệu Nương, Giám đốc quốc gia Room to Read Việt Nam — [Thanh Niên, 14/11/2025](https://thanhnien.vn/gan-2-trieu-nguoi-viet-khiem-thi-suy-giam-thi-luc-chua-den-1-sach-chu-noi-185251114131539441.htm)
[^2]: Nguyễn Văn Xứng, Trưởng phòng kỹ thuật in ấn, Trung tâm khiếm thị Nhật Hồng — [SGGP, 05/03/2026](https://www.sggp.org.vn/khat-sach-chu-noi-cho-tre-khiem-thi-post841164.html)
[^3]: [Giáo dục & Thời đại](https://giaoducthoidai.vn/hoc-sinh-khuyet-tat-cho-sach-giao-khoa-moi-den-bao-gio-post630433.html) · [VOV2](https://vov2.vov.vn/giao-duc-dao-tao/bao-gio-hoc-sinh-khiem-thi-co-sach-giao-khoa-49798.vov2)

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
npm install
cp .env.local.example .env.local     # điền khoá Gemini
npm run dev
```

## Tài liệu

| | |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Ranh giới client/máy chủ, mô hình Khối, ba cái bẫy đã vấp |
| [LUONG-CHAY.md](docs/DATA-FLOW.md) | Từ ảnh trang sách tới tai học sinh — bốn bước và cổng duyệt |
| [ACCESSIBILITY.md](docs/ACCESSIBILITY.md) | Mười kỹ thuật tiếp cận và lý do đằng sau |
| [AI-INTEGRATION.md](docs/AI-INTEGRATION.md) | Prompt 9 môn, schema, ba trường sinh ra từ sách thật |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Chạy, triển khai Cloud Run, bảng xử lý sự cố |

## Cấu trúc

```
docs/                 tài liệu kiến trúc
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
  TrinhNghe.tsx       trình nghe — đọc đúng thứ trình đọc màn hình đọc
```

## Miễn trừ

Verso là công cụ hỗ trợ chuyển đổi, không thay thế bản gốc. Giáo viên cần duyệt lại trước khi
phát hành. Bản chuyển đổi chỉ dành cho người khuyết tật chữ in.
