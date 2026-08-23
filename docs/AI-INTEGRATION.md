# Tích hợp Gemini

Toàn bộ lệnh gọi model nằm trong `lib/gemini.server.ts`, và **prompt nằm riêng ở
`lib/prompt.ts`** — file đó dài hơn phần code gọi model, vì nó mới là sản phẩm.

| Model | Vai trò |
|---|---|
| `gemini-3.7-flash` | mặc định |
| `gemini-2.5-flash` | tự lùi về khi tài khoản chưa mở model mới |

---

## Component không bao giờ gọi thẳng Gemini

```
components/*.tsx  →  /api/doc-trang  →  lib/gemini.server.ts  →  Gemini
   (trình duyệt)      (máy chủ Node)       (giữ khoá)
```

`lib/gemini.server.ts` mở đầu bằng `import 'server-only'`. Lỡ import vào component client là
**build hỏng ngay**, thay vì âm thầm đẩy khoá API ra bundle trình duyệt.

Khoá đọc trễ, chỉ khi thật sự cần gọi model — nhờ vậy `npm run build` chạy được mà không cần khoá.

---

## Chín nguyên tắc áp cho mọi lượt gọi

Rút gọn từ `NGUYEN_TAC` trong `prompt.ts`:

1. **Không bỏ sót** — mọi thứ trên trang phải xuất hiện: đề mục, đoạn văn, hình, công thức,
   bảng, bài tập, chú thích, cả hộp "Ghi nhớ"
2. **Không bịa** — chữ mờ thì ghi `doTinCay = "thap"` và nói rõ trong `ghiChu`
3. **Đúng thứ tự đọc** — trang hai cột đọc hết cột trái rồi mới sang phải
4. **Không diễn giải lại văn bản** — *"Bạn là người chuyển dạng, không phải người biên tập"*
5. **Hình vẽ phải mô tả đủ để làm được bài** ← phần mọi công cụ khác bỏ trống
6. **Công thức phải đọc được bằng miệng** — trả cả `kyHieuGoc` lẫn `docThanhLoi`
7. **Bảng phải duỗi thẳng** — kèm `hangDoc` nếu ô có ký hiệu
8. **Ký hiệu chú thích phải đọc ra nghĩa** — `(1)` thành `[chú thích 1]`
9. **Giữ số hiệu bài tập** — mốc để nhảy nhanh

### Quy ước đọc ký hiệu

```
x²  → "x bình phương"        √x → "căn bậc hai của x"     a/b → "a trên b"
△ABC → "tam giác ABC"        ∠ABC → "góc ABC"             ⊥ → "vuông góc với"
≤   → "nhỏ hơn hoặc bằng"    π → "pi"                     Δ → "đen-ta"
```

Ví dụ đạt yêu cầu: `S = πR²` → *"S bằng pi nhân R bình phương"*

---

## Hướng dẫn riêng cho từng môn

Đây là chỗ tạo ra khác biệt so với một công cụ OCR chung chung. Chọn sai môn thì chất lượng
tụt rõ rệt.

| Môn | Điểm nhấn riêng |
|---|---|
| **Toán** | Hình học: tên đỉnh theo đúng thứ tự ghi trên hình, góc vuông đánh dấu ở đâu, đường phụ nào được vẽ thêm, ký hiệu bằng nhau (gạch chéo, cung tròn). Đồ thị: trục biểu diễn gì, khoảng chia, hình dạng đường, cắt trục ở đâu |
| **Ngữ văn** | Thơ giữ **nguyên từng dòng và từng khổ**, tuyệt đối không gộp thành văn xuôi. Chú thích gắn `thuocVe` và đặt **ngay sau đoạn chứa từ đó**, không dồn xuống cuối |
| **Vật lý** | Sơ đồ mạch điện mô tả **theo chiều dòng điện đi**, nối tiếp hay song song, ampe kế đặt ở đâu |
| **Hoá học** | `H2SO4` → *"H hai S O bốn"*. Mũi tên `→` đọc là *"tạo thành"*, điều kiện trên mũi tên phải nói ra |
| **Sinh học** | Hình cấu tạo: từng bộ phận và vị trí tương đối. Chuỗi thức ăn: chiều mũi tên, ai ăn ai |
| **Lịch sử** | Trục thời gian đọc theo thứ tự. Lược đồ trận đánh: hướng mũi tên tiến quân, địa danh |
| **Địa lý** | Bản đồ: đọc **chú giải trước**, rồi mô tả phân bố theo vùng |
| **Tiếng Anh** | Giữ **nguyên** phần tiếng Anh, không dịch |
| **GDCD** | Sơ đồ tư duy đọc theo cấp, nêu rõ nhánh nào thuộc nhánh nào |

---

## Vì sao dùng `responseSchema`

Model **bị ép** trả đúng cấu trúc — không có ```` ```json ```` bọc ngoài, không thiếu trường,
không đổi tên trường giữa các lần gọi. Enum ràng buộc ngay ở tầng API:

```ts
loai: {
  type: Type.STRING,
  enum: ['tieu-de', 'van-ban', 'tho', 'hinh-anh', 'cong-thuc',
         'bang', 'bai-tap', 'chu-thich', 'khung-luu-y'],
}
```

Model **không thể** trả về `"đoạn thơ"` hay `"poem"`. Việc chuẩn hoá xảy ra ở tầng API thay vì
bằng một đống `if` trong code.

Vẫn giữ `tachJSON()` làm lưới an toàn, phòng khi model dự phòng trả khác chuẩn.

---

## Ba trường sinh ra từ việc thử với sách thật

Bản tôi tự dựng để test đều **sạch hơn thực tế**: chữ vector sắc nét, bố cục gọn, công thức
đứng riêng một dòng. Sách thật không như vậy.

### `hangDoc` — công thức trong ô bảng

Ô `√2/2` là rác với trình đọc màn hình. Thêm mảng song song cùng kích thước với `hang`, mỗi ô
ở dạng đọc được. Chỉ điền khi bảng thật sự có ký hiệu.

Lúc chuẩn hoá, `hangDoc` **chỉ được giữ khi khớp đúng số hàng và số cột** — lệch một ô là
trình đọc màn hình đọc sai ô, còn tệ hơn không có.

### `vanBanDoc` — công thức xen trong câu

Phát hiện khi thử trang 82 SGK Toán 9 thật. Đề bài viết:

> *"b) Sử dụng định lí Pythagore, chứng minh rằng sin²α + cos²α = 1."*

Công thức nằm **giữa câu văn**. Tách ra thành khối riêng thì vỡ mạch đọc; để nguyên thì trình
đọc màn hình đọc thành rác.

Giải pháp: giữ nguyên câu trong `vanBan`, kèm `vanBanDoc` là cả câu ở dạng đọc được. Kết quả
thực tế còn đi xa hơn yêu cầu:

```
mắt thấy : Cho tam giác ABC vuông tại A, có B̂ = α (H.4.37)
tai nghe : Cho tam giác A B C vuông tại A, có góc B bằng an-pha (Hình bốn chấm ba mươi bảy)

mắt thấy : …tạo với mặt đất góc 20° và chắn ngang lối đi một đoạn 5 m
tai nghe : …tạo với mặt đất góc hai mươi độ và chắn ngang lối đi một đoạn năm mét
```

### `doTinCay` + `ghiChu` — model tự đánh giá

Prompt nói thẳng: *"Đoán bừa một con số trong đề bài làm học sinh giải sai cả bài."*

Thử với ảnh cố ý làm xấu (nghiêng 3°, mờ, tối, JPEG nén mạnh): model vẫn đọc đủ 13 khối, và
**gắn cờ đúng khối khó nhất** — *"dòng chú thích chân trang hơi mờ nhưng nội dung cơ bản rõ nghĩa"*.

Cơ chế an toàn chạy đúng tầng: không hoảng cả trang, chỉ chỉ mặt chỗ cần kiểm.

---

## Thử lại lỗi tạm thời

Đo trên Cloud Run: khoảng **1/3 số lượt** trả `503 Deadline expired` rồi lượt sau lại bình
thường. Giáo viên tải 20 trang mà mất 7 trang là không dùng được.

```ts
const LOI_TAM_THOI = /UNAVAILABLE|Deadline expired|INTERNAL|503|500|ECONNRESET|fetch failed/i;
const LOI_THAT     = /API_KEY|PERMISSION|SAFETY|PROHIBITED|INVALID_ARGUMENT/i;
```

Lỗi tạm thời thì lùi dần **800ms → 1,6s → 3,2s** kèm nhiễu ngẫu nhiên (để nhiều trang không
cùng thử lại một lúc). Lỗi thật thì ném ra ngay — thử lại bao nhiêu lần cũng vậy.

Sau khi thêm: **6/6 lượt thành công**.

---

## Nhiệt độ

`temperature: 0.15` cho việc đọc trang. Chuyển dạng cần chính xác, không cần sáng tạo.

---

## Nếu tinh chỉnh lại prompt, kiểm theo thứ tự này

1. **Thứ tự đọc** — trang hai cột có bị đọc ngang không
2. **Mô tả hình** — có đủ để làm được bài tập liên quan không
3. **`docThanhLoi` / `vanBanDoc`** — đọc lên có nghe được như giáo viên nói không
4. **`doTinCay`** — thử một trang mờ, model phải gắn cờ chứ không đoán bừa

Bước 4 quan trọng nhất. Model đọc đúng 95% trang là tốt; model **biết mình đang không chắc**
mới là an toàn.
