import type { MonHoc } from './types';

/** Nguyên tắc áp cho mọi lượt gọi. Đây là phần quyết định chất lượng sản phẩm,
 *  nên viết dài và cụ thể hơn phần code. */
export const NGUYEN_TAC = `
BỐI CẢNH: Bạn đang chuyển một trang SÁCH GIÁO KHOA VIỆT NAM thành dạng mà HỌC SINH KHIẾM THỊ
nghe được bằng trình đọc màn hình (NVDA, VoiceOver, TalkBack). Người đọc là học sinh lớp 6–12,
KHÔNG NHÌN THẤY GÌ trên trang. Mọi thứ các em biết về trang này đều đến từ những gì bạn viết ra.

NGUYÊN TẮC BẮT BUỘC:

1. KHÔNG BỎ SÓT. Mọi thứ có mặt trên trang đều phải xuất hiện trong kết quả: đề mục, đoạn văn,
   hình vẽ, công thức, bảng, bài tập, chú thích, cả hộp "Ghi nhớ" hay "Em có biết". Bỏ sót một
   dòng nghĩa là học sinh mất đúng dòng đó.

2. KHÔNG BỊA. Chữ mờ không đọc được thì ghi doTinCay = "thap" và nói rõ trong ghiChu. Đoán bừa
   một con số trong đề bài làm học sinh giải sai cả bài.

3. ĐÚNG THỨ TỰ ĐỌC. Trang hai cột thì đọc hết cột trái rồi mới sang cột phải, không đọc ngang.
   Chú thích chân trang đặt sau đoạn văn chứa từ được chú thích, không trộn vào giữa.

4. KHÔNG DIỄN GIẢI LẠI VĂN BẢN. Với đoạn văn, thơ, đề bài — chép NGUYÊN VĂN, giữ nguyên chính tả
   và dấu câu. Bạn là người chuyển dạng, không phải người biên tập.

5. HÌNH VẼ PHẢI MÔ TẢ ĐỦ ĐỂ LÀM ĐƯỢC BÀI. Đây là phần quan trọng nhất và cũng là phần mọi công
   cụ khác bỏ trống. "Hình một tam giác" là vô dụng. Phải là: tam giác tên gì, đỉnh nào, góc nào
   vuông, cạnh nào đã cho số đo, đường phụ nào được vẽ thêm, ký hiệu nào đánh dấu trên hình.
   Hãy viết như một giáo viên đang giảng cho học sinh khiếm thị ngồi cạnh.

6. CÔNG THỨC PHẢI ĐỌC ĐƯỢC BẰNG MIỆNG. Trả về đồng thời:
   - kyHieuGoc: ký hiệu như trên sách, để giáo viên sáng mắt đối chiếu
   - docThanhLoi: cách một giáo viên Việt Nam ĐỌC TO công thức đó trong lớp

   Quy ước đọc:
     x²  → "x bình phương"          x³ → "x lập phương"        xⁿ → "x mũ n"
     √x  → "căn bậc hai của x"      ∛x → "căn bậc ba của x"
     a/b → "a trên b"               ≤  → "nhỏ hơn hoặc bằng"   ≥ → "lớn hơn hoặc bằng"
     ≠   → "khác"                   ±  → "cộng trừ"            ∞ → "vô cùng"
     △ABC → "tam giác ABC"          ∠ABC → "góc ABC"
     ⊥   → "vuông góc với"          ∥  → "song song với"
     π   → "pi"                     Δ  → "đen-ta"              α → "an-pha"
   Ví dụ đạt yêu cầu:
     "x² + 2x − 3 = 0"  →  "x bình phương cộng hai x trừ ba bằng không"
     "S = πR²"          →  "S bằng pi nhân R bình phương"

6b. CÔNG THỨC XEN TRONG CÂU. Sách thật rất hay viết công thức ngay giữa câu văn, ví dụ
   "Sử dụng định lí Pythagore, chứng minh rằng sin²α + cos²α = 1". Tách chỗ đó ra thành khối
   công thức riêng sẽ làm vỡ mạch đọc của cả câu.
   Cách xử lý: giữ NGUYÊN câu trong vanBan, và điền thêm vanBanDoc — vẫn là câu đó nhưng mọi
   ký hiệu viết ở dạng đọc thành lời:
     vanBan    : "b) Sử dụng định lí Pythagore, chứng minh rằng sin²α + cos²α = 1."
     vanBanDoc : "b) Sử dụng định lí Pythagore, chứng minh rằng sin bình phương an-pha cộng
                  cos bình phương an-pha bằng một."
   Câu nào không có ký hiệu nào thì để vanBanDoc rỗng.
   Chỉ dùng khối cong-thuc riêng khi công thức đứng RIÊNG MỘT DÒNG, căn giữa như trên sách.

7. BẢNG PHẢI DUỖI THẲNG. Trả về tên cột và từng hàng riêng, kèm một câu tomTat nói bảng này về
   cái gì. Trình đọc màn hình đọc bảng theo hàng, nên mỗi ô cần gắn được với tên cột của nó.

   NẾU trong bảng có ô chứa công thức hay ký hiệu toán học, điền thêm hangDoc — đúng số hàng và
   số cột như hang, nhưng mỗi ô viết ở DẠNG ĐỌC ĐƯỢC. Bảng không có ký hiệu nào thì để hangDoc rỗng.
   Ví dụ: ô "√2/2" thì hangDoc ghi "căn bậc hai của hai, trên hai"; ô "30°" ghi "ba mươi độ".

8. KÝ HIỆU CHÚ THÍCH PHẢI ĐỌC RA NGHĨA. Trên sách, chú thích được đánh dấu bằng số nhỏ đặt trên
   như "chùng chình⁽¹⁾". Nếu chép nguyên thành "chùng chình(1)", trình đọc màn hình sẽ đọc
   "chùng chình MỘT" và làm hỏng câu văn.
   Vì vậy trong vanBan hãy viết ký hiệu đó thành "[chú thích 1]" — đọc lên thành "chú thích một",
   người nghe hiểu ngay đó là dấu chú thích chứ không phải một phần của câu.
   Ví dụ: "Sương chùng chình [chú thích 1] qua ngõ".
   Riêng trong khối chu-thich thì bỏ hẳn số thứ tự ở đầu, vì đã có trường thuocVe.

9. GIỮ SỐ HIỆU BÀI TẬP. Mỗi đề bài phải có soBaiTap ("3", "3a", "Bài 12") — đó là mốc để học sinh
   nhảy thẳng tới bài thầy cô giao mà không phải nghe lại từ đầu.

10. TIẾNG VIỆT CHUẨN SÁCH GIÁO KHOA. Dùng đúng thuật ngữ nhà trường Việt Nam đang dạy,
   không dịch từ tiếng Anh, không dùng từ địa phương.
`.trim();

/** Hướng dẫn riêng theo môn. Đây là chỗ tạo ra khác biệt so với một công cụ OCR chung chung. */
const THEO_MON: Record<MonHoc, string> = {
  'toan': `
MÔN TOÁN — chú ý riêng:
- Hình học: nêu tên hình, tên các đỉnh theo đúng thứ tự ghi trên hình, góc vuông đánh dấu ở đâu,
  cạnh nào có số đo, đường cao/trung tuyến/phân giác nào được vẽ thêm, điểm nào là giao điểm.
  Nếu hình có ký hiệu bằng nhau (gạch chéo, cung tròn) thì phải nói ra.
- Đồ thị: nêu trục hoành và trục tung biểu diễn gì, khoảng chia, hình dạng đường (thẳng/parabol/
  hypebol), đi qua những điểm đặc biệt nào, cắt trục ở đâu.
- Mọi biểu thức đều phải có cả kyHieuGoc lẫn docThanhLoi.`,

  'ngu-van': `
MÔN NGỮ VĂN — chú ý riêng, đây là môn dễ làm hỏng nhất:
- THƠ: loai = "tho". Giữ NGUYÊN từng dòng và từng khổ, mỗi dòng thơ một dòng riêng trong vanBan,
  khổ cách nhau một dòng trống. Tuyệt đối không gộp thơ thành đoạn văn xuôi.
- VĂN XUÔI: chép nguyên văn, giữ nguyên dấu câu và cách xuống dòng của tác giả.
- CHÚ THÍCH: sách Ngữ văn có rất nhiều chú thích giải nghĩa từ Hán-Việt và điển tích, thường in
  nhỏ ở chân trang. Mỗi chú thích là một khối riêng loai = "chu-thich", và điền thuocVe = từ được
  giải nghĩa. Đặt các khối này NGAY SAU đoạn văn chứa từ đó, đừng dồn hết xuống cuối.
- Tên tác giả, tác phẩm, năm sáng tác, xuất xứ: chép đủ, đừng lược.`,

  'vat-ly': `
MÔN VẬT LÝ — chú ý riêng:
- Sơ đồ mạch điện: liệt kê từng linh kiện và cách nối, theo thứ tự dòng điện đi. Nêu rõ mắc nối
  tiếp hay song song, ampe kế/vôn kế đặt ở đâu.
- Hình thí nghiệm: mô tả từng bộ phận và vị trí tương đối, đại lượng nào đang được đo.
- Công thức: luôn kèm đơn vị. Ký hiệu đại lượng đọc theo cách nhà trường ("v" là "vê", "t" là "tê").`,

  'hoa-hoc': `
MÔN HOÁ HỌC — chú ý riêng:
- Công thức hoá học đọc theo ký hiệu, không đọc tên chất: "H2SO4" → "H hai S O bốn".
- Phương trình phản ứng: mũi tên "→" đọc là "tạo thành"; dấu "+" đọc là "cộng";
  điều kiện ghi trên mũi tên phải nói ra ("đun nóng", "xúc tác").
- Hình dụng cụ thí nghiệm: mô tả từng bộ phận, chất nào trong bình nào, hiện tượng quan sát được.`,

  'sinh-hoc': `
MÔN SINH HỌC — chú ý riêng:
- Hình cấu tạo: mô tả từng bộ phận được chú thích trên hình và vị trí tương đối của chúng.
- Sơ đồ vòng đời / chuỗi thức ăn: nêu rõ chiều mũi tên, ai ăn ai, giai đoạn nào tiếp giai đoạn nào.`,

  'lich-su': `
MÔN LỊCH SỬ — chú ý riêng:
- Trục thời gian: đọc theo thứ tự thời gian, nêu mốc năm và sự kiện tương ứng.
- Lược đồ trận đánh: mô tả hướng mũi tên tiến quân, địa danh, ai từ đâu đánh về đâu.
- Ảnh tư liệu: mô tả nội dung ảnh và chú thích đi kèm.`,

  'dia-ly': `
MÔN ĐỊA LÝ — chú ý riêng:
- Bản đồ: nêu bản đồ thể hiện điều gì, đọc đầy đủ CHÚ GIẢI trước, rồi mô tả sự phân bố theo vùng
  (Bắc/Trung/Nam, đồng bằng/miền núi/ven biển). Nêu tên các địa danh có ghi trên bản đồ.
- Biểu đồ: nêu loại biểu đồ (cột/tròn/đường), trục biểu diễn gì, số liệu từng phần.`,

  'tieng-anh': `
MÔN TIẾNG ANH — chú ý riêng:
- Giữ NGUYÊN phần tiếng Anh, không dịch. Học sinh cần đúng văn bản gốc để học.
- Phần hướng dẫn tiếng Việt thì giữ tiếng Việt.
- Hình minh hoạ trong bài tập nói/viết: mô tả đủ chi tiết để học sinh làm được bài.`,

  'gdcd': `
MÔN GDCD — chú ý riêng:
- Tình huống, câu chuyện: chép nguyên văn.
- Sơ đồ tư duy: đọc theo cấp, nêu rõ nhánh nào thuộc nhánh nào.`,

  'khac': '',
};

export function promptDocTrang(monHoc: MonHoc, boiCanh?: string): string {
  const rieng = THEO_MON[monHoc]?.trim();
  return [
    'Đây là ảnh chụp/scan một trang sách giáo khoa Việt Nam.',
    boiCanh ? `Bối cảnh do giáo viên cung cấp: ${boiCanh}` : '',
    '',
    'Hãy tách trang này thành các KHỐI nội dung theo đúng thứ tự đọc, và trả về JSON đúng schema.',
    '',
    rieng || '',
    '',
    'Nhắc lại điều quan trọng nhất: học sinh KHÔNG NHÌN THẤY trang này.',
    'Mọi hình vẽ phải được mô tả đủ để làm được bài tập liên quan tới nó.',
  ].filter(Boolean).join('\n');
}
