import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boDau, maSo } from '@/lib/chuoi';
import { chiaNnu, boMocNnu } from '@/lib/nnu';

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
