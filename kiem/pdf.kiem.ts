import test from 'node:test';
import assert from 'node:assert/strict';
import { docKhoangTrang, gopKhoang } from '@/lib/pdf';

test('docKhoangTrang: khoảng, danh sách, và chỗ gõ lộn xộn', () => {
  assert.deepEqual(docKhoangTrang('71-73', 123), [71, 72, 73]);
  assert.deepEqual(docKhoangTrang('71, 73, 80', 123), [71, 73, 80]);
  assert.deepEqual(docKhoangTrang(' 71 - 73 , 80 ', 123), [71, 72, 73, 80]);
  // Gõ ngược đầu đuôi vẫn ra đúng khoảng, không trả về rỗng.
  assert.deepEqual(docKhoangTrang('73-71', 123), [71, 72, 73]);
  assert.deepEqual(docKhoangTrang('71, 71, 72', 123), [71, 72]);
});

test('docKhoangTrang: cắt trang nằm ngoài tệp', () => {
  assert.deepEqual(docKhoangTrang('120-130', 123), [120, 121, 122, 123]);
  assert.deepEqual(docKhoangTrang('0, 200', 123), []);
  assert.deepEqual(docKhoangTrang('', 123), []);
  assert.deepEqual(docKhoangTrang('abc', 123), []);
});

test('gopKhoang: gộp trang liền nhau lại thành khoảng', () => {
  assert.equal(gopKhoang([71, 72, 73, 80]), '71-73, 80');
  assert.equal(gopKhoang([]), '');
  assert.equal(gopKhoang([5]), '5');
  // Hai số liền nhau thì viết rời dễ đọc hơn "5-6", mà cũng chẳng dài hơn.
  assert.equal(gopKhoang([5, 6]), '5, 6');
  assert.equal(gopKhoang([5, 6, 7]), '5-7');
});

test('gopKhoang: sắp lại thứ tự, bỏ trùng, bỏ số vô lý', () => {
  assert.equal(gopKhoang([80, 71, 73, 72]), '71-73, 80');
  assert.equal(gopKhoang([9, 9, 9]), '9');
  assert.equal(gopKhoang([0, -3, 2.5, 4]), '4');
});

test('gopKhoang rồi docKhoangTrang trả lại đúng danh sách cũ', () => {
  // Bấm chọn trang trên ô xem trước ghi ngược vào ô nhập, rồi ô nhập lại được
  // đọc ra để dựng ảnh. Hai chiều mà lệch nhau một trang là đọc nhầm trang sách.
  for (const ds of [[71, 72, 73, 80], [1], [1, 2], [5, 6, 7, 9, 11, 12, 13]]) {
    assert.deepEqual(docKhoangTrang(gopKhoang(ds), 200), ds, `hỏng ở ${ds}`);
  }
});
