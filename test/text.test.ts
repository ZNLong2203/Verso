import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boDau, maSo } from '@/lib/text';
import { chiaNnu, boMocNnu } from '@/lib/language';
import { doiKyHieuSot, donDauCau } from '@/lib/speechText';

test('boDau: bỏ dấu để tìm kiếm khớp được', () => {
  assert.equal(boDau('Tam giác'), 'tam giac');
  assert.equal(boDau('Đường tròn'), 'duong tron');   // đ không tách được bằng NFD
  assert.equal(boDau('  Ngữ Văn  '), 'ngu van');
});

test('maSo: neo phải sạch dấu, nếu không "Bài 4.2" thành b-i-4-2', () => {
  assert.equal(maSo('Bài 4.2'), 'bai-4-2');
  assert.equal(maSo('3a'), '3a');
  assert.equal(maSo('Luyện tập 2'), 'luyen-tap-2');
});

test('chiaNnu: tách đúng đoạn tiếng Anh xen trong câu tiếng Việt', () => {
  assert.deepEqual(chiaNnu('Đọc: [en]Hello there[/en] rồi trả lời.', 'vi'), [
    { nnu: 'vi', text: 'Đọc: ' },
    { nnu: 'en', text: 'Hello there' },
    { nnu: 'vi', text: ' rồi trả lời.' },
  ]);
});

test('chiaNnu: gộp hai đoạn cùng tiếng mà KHÔNG nuốt khoảng trắng giữa chúng', () => {
  // Vứt khoảng trắng là dính chữ: "Read.Then." — đã gặp thật.
  assert.deepEqual(chiaNnu('[en]Read.[/en] [en]Then.[/en]', 'vi'),
    [{ nnu: 'en', text: 'Read. Then.' }]);
});

test('chiaNnu: dấu lẻ loi không được lọt ra màn hình', () => {
  assert.deepEqual(chiaNnu('Dấu hỏng [en]ở đây', 'vi'),
    [{ nnu: 'vi', text: 'Dấu hỏng ở đây' }]);
});

test('chiaNnu: tiếng Việt xen trong khối tiếng Anh', () => {
  assert.deepEqual(chiaNnu('Tom said [vi]xin chào[/vi] to her.', 'en'), [
    { nnu: 'en', text: 'Tom said ' },
    { nnu: 'vi', text: 'xin chào' },
    { nnu: 'en', text: ' to her.' },
  ]);
});

test('boMocNnu: bỏ sạch dấu, giữ nguyên chữ', () => {
  assert.equal(boMocNnu('Đọc: [en]Hello[/en] nhé.'), 'Đọc: Hello nhé.');
});

test('doiKyHieuSot: không đọc dấu chú thích thành tiếng', () => {
  // "chú thích một" chen giữa câu là cắt mạch người nghe; lời giải nghĩa nằm ngay
  // phía dưới nên đọc tuần tự là gặp.
  assert.equal(
    doiKyHieuSot('Cho tam giác ABC [chú thích 1] vuông tại A.'),
    'Cho tam giác ABC vuông tại A.',
  );
  assert.equal(doiKyHieuSot('Phù sa [chú thích 12] đỏ.'), 'Phù sa đỏ.');
});

test('donDauCau: bỏ dấu câu chồng nhau do bộ dựng chèn thêm', () => {
  assert.equal(donDauCau('Chú thích 1..'), 'Chú thích 1.');
  assert.equal(donDauCau('Xong rồi . Tiếp theo'), 'Xong rồi. Tiếp theo');
  assert.equal(donDauCau('Một câu. , Câu sau'), 'Một câu. Câu sau');
  assert.equal(donDauCau('Dấu phẩy , rồi chấm .'), 'Dấu phẩy, rồi chấm.');
  assert.equal(donDauCau('Bình thường, không đổi.'), 'Bình thường, không đổi.');
});

test('chiaNnu: mảnh chỉ có dấu câu phải dính vào mảnh khác, không đứng riêng', () => {
  // Đứng riêng là Cloud TTS đọc nó thành lời: mảnh "." ra 1,25 giây tiếng
  // "dấu chấm", dài hơn cả từ "yên bình". Đây là lỗi người dùng nghe thấy thật.
  for (const [vao, goc] of [
    ['Chú ý cách phát âm từ [en]neighbourhood[/en].', 'vi'],
    ['Bảng từ: [en]Word[/en]: [en]peaceful[/en], nghĩa là yên bình.', 'vi'],
    ['[en]Hello[/en]. Rồi trả lời.', 'vi'],
    ['. [en]Bắt đầu bằng dấu chấm[/en]', 'vi'],
  ] as const) {
    for (const d of chiaNnu(vao, goc)) {
      assert.match(d.text, /[0-9A-Za-zÀ-ỹ]/, `mảnh ${JSON.stringify(d.text)} không có chữ nào`);
    }
  }
});

test('chiaNnu: gộp dấu câu vào rồi vẫn không mất chữ nào', () => {
  const vao = 'Bảng từ: [en]Word[/en]: [en]peaceful[/en], nghĩa là yên bình.';
  assert.equal(chiaNnu(vao, 'vi').map((d) => d.text).join(''), boMocNnu(vao));
});
