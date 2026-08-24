# Giọng đọc

## Vì sao không dùng giọng của trình duyệt

Bản đầu dùng **Web Speech API** — miễn phí, chạy ngay trên máy, không cần máy chủ.
Nghe thử thì phát hiện nó **đọc văn bản tiếng Việt bằng giọng tiếng Anh**.

Nguyên nhân không phải lỗi lập trình mà là bản chất của API đó:

```js
u.lang = 'vi-VN';        // chỉ là một GỢI Ý
u.voice = giongViet();   // null nếu máy không cài giọng tiếng Việt
```

Khi máy **không có giọng vi-VN**, `lang` bị bỏ qua và trình duyệt lấy **giọng mặc
định của hệ thống** — thường là tiếng Anh. Chrome trên Windows không cài gói ngôn
ngữ tiếng Việt rơi đúng vào trường hợp này, mà đó lại là cấu hình phổ biến nhất
trong phòng máy nhà trường.

Điều khiến lỗi này nghiêm trọng hơn bình thường: **người sáng mắt nghe là biết sai
ngay, còn học sinh khiếm thị thì không có cách nào biết.** Các em không đối chiếu
được với sách gốc — đó chính là lý do các em cần Verso.

Giao diện lúc đó còn khẳng định sai: nó chỉ kiểm `'speechSynthesis' in window` rồi
báo "đọc được", trong khi thứ đọc ra là giọng sai ngôn ngữ.

---

## Cách làm hiện tại

Giọng sinh ở **máy chủ** bằng Cloud Text-to-Speech, giọng `vi-VN-Chirp3-HD-Achernar`.
Tiếng Việt có **40 giọng riêng**, trong đó 30 giọng Chirp 3 HD — không phải giọng đa
ngữ đọc kèm tiếng Việt. Đổi giọng chỉ cần sửa `GIONG_DOC` trong `lib/constants.ts`.

```mermaid
flowchart LR
  K["Khối trên trang đọc"] --> L["layLoiDoc<br/>đi DOM đúng cách<br/>trình đọc màn hình đi"]
  L --> M{"đã có trong<br/>kho giọng?"}
  M -- có --> C["Cloud Storage<br/>0,3 giây"]
  M -- chưa --> T["Cloud TTS<br/>Chirp 3 HD<br/>3,0 giây"]
  T --> C
  C --> A["thẻ audio<br/>playbackRate = tốc độ"]
```

### Cache là bắt buộc, không phải tối ưu thêm

Mỗi đoạn lưu theo **mã băm của chính nội dung** (`sha256(giọng + văn bản)`), nên mỗi
khối chỉ tổng hợp **một lần**, bao nhiêu học sinh nghe cũng vậy. Không có bước này,
một lượt nghe trọn tài liệu tốn gấp ba lần tiền chuyển đổi chính tài liệu đó.

### Vài chi tiết phải làm đúng

- **Trần 5.000 BYTE, không phải ký tự.** Tiếng Việt có dấu tốn gần 2 byte mỗi chữ,
  nên 3.000 ký tự đã có thể vượt. `catTheoByte` cắt theo byte ở ranh giới câu — cắt
  giữa câu làm giọng ngắt sai chỗ, nghe như đọc nhầm dấu chấm.
- **Chirp 3 HD không nhận `pitch`** (API trả lỗi thẳng), nhưng nhận `speakingRate`.
- **Tốc độ đổi ở trình duyệt** bằng `playbackRate`, không tổng hợp lại — một tệp đã
  lưu phục vụ cả bốn mức tốc độ.
- **Số hiệu lượt đọc thay cho cờ boolean.** Bấm "Phần sau" là dừng lượt cũ rồi mở
  lượt mới ngay; cờ bị đặt lại `false` trước khi vòng cũ kịp thấy, thành hai vòng
  chạy song song và phát chồng hai giọng.

---

## Nút nghe là công cụ tự kiểm

Trình nghe đọc **đúng thứ trình đọc màn hình đọc**, không phải thứ hiện trên màn
hình: bỏ qua mọi phần `aria-hidden` (ký hiệu dành cho mắt), lấy phần
`.chi-doc-man-hinh` (dạng đọc thành lời), và **tôn trọng `aria-label`** ở những phần
tử lấy tên từ nội dung.

Chỗ `aria-label` này từng sai: trình nghe đọc dấu chú thích thành một chữ **"một"**
trơ trọi giữa câu, trong khi NVDA đọc "Chú thích 1" — hai bên lệch nhau thì việc
"nghe thử để kiểm" mất hết ý nghĩa.

Nhưng chỉ áp cho liên kết, nút, `role="math"`, `role="img"`. Áp cho vùng chứa là
hỏng: `<div role="group" aria-label="Đoạn thơ">` chỉ **đặt tên** cho khổ thơ — áp
nhầm là nuốt trọn cả bài thơ, chỉ còn đọc hai chữ "Đoạn thơ".

## Không xướng đè lên chính giọng đang đọc

Bộ đếm "phần 4/28" **không** có `aria-live`. Nó đổi liên tục, để live thì trình đọc
màn hình xướng đè lên chính giọng đang phát. Chỉ những chuyển biến người nghe cần
biết mới vào vùng thông báo: *đang tạo giọng đọc, bắt đầu đọc, đã tạm dừng, đã đọc
hết trang* — và lỗi thì vào `role="alert"`.

## Khi không tạo được giọng

Nói thẳng là chưa tạo được và chỉ sang trình đọc màn hình sẵn có của máy. **Không
bao giờ** lặng lẽ lùi về giọng sai ngôn ngữ — đó chính là lỗi ban đầu.

---

Xem thêm: [Chi phí thật](CHI-PHI.md) · [Khả năng tiếp cận](ACCESSIBILITY.md)
