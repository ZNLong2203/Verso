import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dungNeo, nhanMuc, thanBaiTap, loiChuThich, soChuThich } from '@/lib/neo';
import type { BanVerso, Khoi } from '@/lib/types';

const k = (o: Partial<Khoi>): Khoi =>
  ({ id: 'x', loai: 'van-ban', thuTu: 1, doTinCay: 'cao', daDuyet: true, daSua: false, ...o } as Khoi);

const ban = (trang: Khoi[][]): BanVerso => ({
  id: 'd', tieuDe: 'T', monHoc: 'toan', lop: 9, nguon: '', nguoiChuyen: '',
  daXuatBan: false, maChiaSe: '', ngayTao: '', ngayCapNhat: '',
  trang: trang.map((khoi, i) => ({
    id: `t${i}`, soTrang: i + 1, thuTu: i + 1, anhGoc: '', khoi,
    trangThai: 'xong', anhKhongRo: false, ghiChuDocAnh: '',
  })),
} as BanVerso);

test('neo bài tập trùng số hiệu phải khác nhau', () => {
  // Sách thật: bài học nào cũng có "Luyện tập 2". Trùng neo thì mục lục nhảy về
  // chỗ trùng tên ĐẦU TIÊN — học sinh bấm ở bài 3 lại rơi về bài 1.
  const b = ban([
    [k({ id: 'a', loai: 'bai-tap', soBaiTap: 'Luyện tập 2' })],
    [k({ id: 'b', loai: 'bai-tap', soBaiTap: 'Luyện tập 2' })],
  ]);
  const n = dungNeo(b);
  assert.notEqual(n.get('a'), n.get('b'));
  assert.equal(n.get('a'), 'bai-luyen-tap-2');
});

test('chú thích đánh số lại mỗi trang nên neo phải kèm số trang', () => {
  const b = ban([
    [k({ id: 'c1', loai: 'chu-thich', soChuThich: '1', vanBan: 'nghĩa A' })],
    [k({ id: 'c2', loai: 'chu-thich', soChuThich: '1', vanBan: 'nghĩa B' })],
  ]);
  const n = dungNeo(b);
  assert.equal(n.get('c1'), 'chu-thich-t1-1');
  assert.equal(n.get('c2'), 'chu-thich-t2-1');
});

test('mọi neo trong một tài liệu đều duy nhất', () => {
  const b = ban([[
    k({ id: '1', loai: 'bai-tap', soBaiTap: '1' }),
    k({ id: '2', loai: 'bai-tap', soBaiTap: '1' }),
    k({ id: '3', loai: 'bai-tap', soBaiTap: '1' }),
  ]]);
  const ds = [...dungNeo(b).values()];
  assert.equal(new Set(ds).size, ds.length);
});

test('soChuThich: ba đường, ưu tiên trường rõ ràng rồi mới đoán', () => {
  assert.equal(soChuThich(k({ loai: 'chu-thich', soChuThich: '3' })), '3');
  assert.equal(soChuThich(k({ loai: 'chu-thich', vanBan: '(2) nghĩa cũ' })), '2');  // bản cũ
  assert.equal(soChuThich(k({ loai: 'chu-thich', vanBan: 'không số' }), 5), '5');   // đường cuối
});

test('nhanMuc: chỉ thêm chữ "Bài" khi số hiệu là số trần', () => {
  assert.equal(nhanMuc(k({ loai: 'bai-tap', soBaiTap: '4.28' })), 'Bài 4.28');
  assert.equal(nhanMuc(k({ loai: 'bai-tap', soBaiTap: 'Ví dụ 2' })), 'Ví dụ 2');       // không "Bài Ví dụ 2"
  assert.equal(nhanMuc(k({ loai: 'bai-tap', soBaiTap: 'Luyện tập 2' })), 'Luyện tập 2');
  assert.equal(nhanMuc(k({ loai: 'bai-tap' })), 'Bài tập');
});

test('thanBaiTap: bỏ số hiệu lặp ở đầu đề bài', () => {
  assert.equal(thanBaiTap(k({ soBaiTap: '1', vanBan: '1. Nghe và đọc.' })), 'Nghe và đọc.');
  assert.equal(thanBaiTap(k({ soBaiTap: 'Bài 4.2', vanBan: '4.2. Cho biết.' })), 'Cho biết.');
  assert.equal(thanBaiTap(k({ soBaiTap: '2', vanBan: '2) Hoàn thành câu.' })), 'Hoàn thành câu.');
});

test('thanBaiTap: KHÔNG cắt khi chỉ trùng phần đầu con số', () => {
  // Bài 1 mà đề mở đầu "12." thì "12" là nội dung, không phải số hiệu lặp.
  assert.equal(thanBaiTap(k({ soBaiTap: '1', vanBan: '12. Đây là bài mười hai.' })),
    '12. Đây là bài mười hai.');
});

test('loiChuThich: không ghép lại từ đã có sẵn, kể cả khi có dấu ngôn ngữ', () => {
  assert.equal(loiChuThich(k({ thuocVe: 'Phù sa', vanBan: 'lớp đất mịn.' })), 'Phù sa: lớp đất mịn.');
  assert.equal(loiChuThich(k({ thuocVe: 'Phù sa', vanBan: 'Phù sa: lớp đất mịn.' })), 'Phù sa: lớp đất mịn.');
  assert.equal(
    loiChuThich(k({ thuocVe: 'neighbourhood', vanBan: '[en]neighbourhood[/en]: cách viết Anh-Anh.' })),
    '[en]neighbourhood[/en]: cách viết Anh-Anh.',
  );
});

test('nhanMuc: câu dẫn không ghép thành "Bài tập Luyện tập 2"', () => {
  // Câu dẫn ẩn của Verso dùng chung nhanMuc với mục lục, nếu không hai chỗ nói khác nhau.
  assert.equal(nhanMuc(k({ loai: 'bai-tap', soBaiTap: 'Luyện tập 2' })), 'Luyện tập 2');
  assert.equal(nhanMuc(k({ loai: 'bai-tap', soBaiTap: '2' })), 'Bài 2');
});
