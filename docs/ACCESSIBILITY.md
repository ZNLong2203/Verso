# Kỹ thuật tiếp cận

Với Verso, **CSS và HTML chính là sản phẩm**. Đọc được trang sách chỉ là một nửa; nửa còn lại
là đưa nội dung đó tới tai học sinh cho đúng.

Tài liệu này ghi lại từng kỹ thuật và lý do đằng sau.

---

## 1. Hiện cho mắt, đọc cho tai

Kỹ thuật quan trọng nhất của cả sản phẩm.

Công thức `h² = b′ · c′` cần **hiện ra bằng ký hiệu** cho giáo viên sáng mắt đối chiếu, nhưng
**đọc thành lời** cho học sinh khiếm thị.

```tsx
<span aria-hidden="true">{kyHieu}</span>
<span className="chi-doc-man-hinh">{loi}</span>
```

```css
.chi-doc-man-hinh {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**Không dùng `display: none` hay `visibility: hidden`** — trình đọc màn hình bỏ qua hẳn nội
dung ẩn kiểu đó. Phải giữ phần tử trong luồng nhưng thu về 1px và cắt sạch.

Và `aria-hidden` trên phần ký hiệu là **bắt buộc**. Thiếu nó thì trình đọc màn hình đọc **cả
hai** — người nghe được nghe công thức hai lần, một lần bằng rác.

Kiểm chứng bằng cách bóc thẳng từ DOM đã render:

```
mắt thấy : h² = b′ · c′
tai nghe : h bình phương bằng b phẩy nhân c phẩy

mắt thấy : √2/2
tai nghe : căn bậc hai của hai trên hai
```

Kỹ thuật này dùng ở ba chỗ: công thức đứng riêng, ô bảng có ký hiệu, và câu văn có công thức
xen vào giữa.

---

## 2. Mô tả hình là nội dung, không phải thuộc tính `alt`

Cách thông thường là gắn mô tả vào `alt` của thẻ `<img>`. Verso không làm vậy, vì:

- Bản chuyển đổi **không mang theo ảnh gốc** (bỏ đi để đúng phạm vi Điều 25a)
- Mô tả một hình hình học dài 3–5 câu; `alt` không dành cho đoạn văn dài
- Giáo viên sáng mắt cũng cần đọc được mô tả để kiểm tra

Nên mô tả là **văn bản thật trong luồng đọc**:

```tsx
<figure>
  <figcaption>Mô tả hình vẽ</figcaption>
  <p>{k.moTa}</p>
</figure>
```

`<figure>` là mốc ngữ nghĩa — trình đọc màn hình thông báo "hình, bắt đầu" và "hình, kết thúc",
nên người nghe biết rõ đoạn nào là mô tả chứ không phải nội dung bài.

---

## 3. Ký hiệu chú thích phải đọc ra nghĩa

Sách in đánh dấu chú thích bằng số nhỏ đặt trên: *"Sương chùng chình⁽¹⁾ qua ngõ"*.

Chép nguyên thành `chùng chình(1)` thì trình đọc màn hình đọc:

> *"Sương chùng chình **một** qua ngõ"*

Câu thơ hỏng hẳn nghĩa. Nên Gemini được yêu cầu viết thành `[chú thích 1]`, rồi bộ dựng biến
nó thành liên kết nhảy tới phần giải nghĩa:

```tsx
<a href="#chu-thich-1" aria-label="Chú thích 1, nhảy tới phần giải nghĩa">
  <sup>[1]</sup>
</a>
```

Người nghe được nghe *"chú thích một, liên kết"* — biết ngay đó là dấu chú thích, và nhảy tới
đọc nghĩa được nếu muốn.

---

## 4. Bảng phải duỗi theo hàng

Trình đọc màn hình đọc bảng theo hàng, và mỗi ô cần gắn được với **tên cột của nó**.

```tsx
<table>
  <caption className="chi-doc-man-hinh">{tomTat}</caption>
  <thead><tr>{cot.map(c => <th scope="col">{c}</th>)}</tr></thead>
  <tbody>
    <tr><th scope="row">sin α</th><td>…</td></tr>
  </tbody>
</table>
```

- `scope="col"` và `scope="row"` cho trình đọc biết ô nào là tiêu đề của ô nào
- `<caption>` ẩn mang câu tóm tắt — nghe trước khi vào bảng thì đỡ lạc
- Ô có ký hiệu dùng lại kỹ thuật ở mục 1

---

## 5. Một `<h1>`, phân cấp không gãy

Người dùng trình đọc màn hình điều hướng bằng **cấp tiêu đề** — nhấn `H` để nhảy giữa các đề
mục, `1`–`6` để nhảy theo cấp.

Lần chạy đầu, trang có **ba thẻ `<h1>`**: tiêu đề tài liệu, rồi hai tiêu đề cấp 1 lấy từ sách.
Phân cấp gãy là người nghe mất phương hướng.

Sửa bằng cách đẩy cấp: tiêu đề cấp 1 **trong sách** thành `<h2>` trên trang.

```tsx
const cap = Math.min(Math.max((k.capTieuDe || 2) + lechCap, 1), 6);
```

Kết quả:

```
H1  Toán 9 — Hệ thức lượng trong tam giác vuông     ← tên tài liệu
H2  Mục lục
H2  §3. HỆ THỨC LƯỢNG TRONG TAM GIÁC VUÔNG          ← tiêu đề trong sách
H3  1. Hệ thức về cạnh và đường cao
H3  2. Bảng giá trị đặc biệt
```

---

## 6. Mục lục nhảy nhanh

Với học sinh khiếm thị, đây là tính năng đáng giá nhất của cả trang.

Thầy cô giao *"làm bài 3"*. Không có mục lục, các em phải nghe tuần tự từ đầu trang. Có mục
lục, nhảy một phát tới đúng chỗ.

```tsx
<nav aria-label="Mục lục">
  <ol>
    <li><a href="#bai-3">Bài 3</a></li>
```

Mỗi bài tập mang `soBaiTap` từ lúc đọc trang, thành `id` để nhảy tới. Đây là lý do schema bắt
model giữ số hiệu bài tập thay vì gộp vào văn bản.

---

## 7. Liên kết bỏ qua

Người dùng bàn phím nhấn `Tab` lần đầu phải gặp ngay lối tắt tới nội dung, không phải lê qua
toàn bộ thanh điều hướng.

```css
.bo-qua { position: absolute; left: -9999px; }
.bo-qua:focus { left: 0; }
```

Ẩn cho tới khi được focus. Đã kiểm chứng: `Tab` lần đầu dừng đúng ở *"Bỏ qua, tới thẳng nội dung"*.

---

## 8. Chữ lớn, dòng thưa

Nhiều học sinh khiếm thị **còn thị lực yếu chứ không mù hoàn toàn**. Cỡ chữ vẫn quan trọng.

```css
.ban-doc {
  font-family: var(--font-doc);   /* Noto Serif — chữ có chân dễ đọc hơn khi thị lực yếu */
  font-size: 20px;
  line-height: 1.85;
  max-width: 40rem;               /* dòng ngắn, mắt không phải quét xa */
}
```

Thơ giữ nguyên xuống dòng bằng `white-space: pre-wrap` — không được để CSS gộp các dòng thơ
thành đoạn văn xuôi.

---

## 9. Tôn trọng cài đặt của hệ điều hành

```css
@media (prefers-contrast: more) {
  body { background: #fff; color: #000; }
  .ban-doc figure, .ban-doc aside { border: 2px solid #000; background: #fff; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; }
}
```

Người bật chế độ tương phản cao đã nói rõ họ cần gì. Đừng ghi đè.

---

## 10. Màu không bao giờ là kênh duy nhất

Mọi trạng thái đều đi kèm **chữ và biểu tượng**:

- `⚠ Cần giáo viên kiểm lại — chữ viết tay hơi mờ` (không chỉ nền vàng)
- `Hình vẽ` / `Công thức` / `Bài 3` là nhãn chữ, không phải chấm màu

---

## Cách tự kiểm

```bash
# Số <h1> phải bằng 1
curl -s <url>/doc/<mã> | grep -c "<h1"

# Dạng đọc có tồn tại không
curl -s <url>/doc/<mã> | grep -c "chi-doc-man-hinh"

# Mốc ngữ nghĩa
curl -s <url>/doc/<mã> | grep -oE "<(main|nav|figure|aside|section|article)" | sort | uniq -c
```

Kiểm bằng người thật thì tốt hơn: bật **VoiceOver** (`⌘F5` trên macOS) hoặc cài
**NVDA** (Windows, miễn phí), rồi **nhắm mắt lại và thử làm bài tập số 3**.

Nếu bạn không làm được, học sinh cũng không.
