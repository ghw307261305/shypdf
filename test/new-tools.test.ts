// 新工具的 Node 冒烟测试：extract-pages / delete-pages / crop-pdf / edit-pdf(矩形) / fill-pdf / pdf-to-text。
// repair-pdf 走 <script> 加载 qpdf，只能在浏览器里测；png↔pdf 复用 jpg↔pdf 的实现，依赖 canvas，同样跳过。
import './_node-env';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import extract from '@/tools/extract-pages';
import del from '@/tools/delete-pages';
import crop from '@/tools/crop-pdf';
import edit from '@/tools/edit-pdf';
import fill from '@/tools/fill-pdf';
import toText from '@/tools/pdf-to-text';
import { readExifOrientation } from '@/tools/jpg-to-pdf';

async function makePdf(name: string, pages: number, w = 400, h = 600): Promise<File> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const p = doc.addPage([w, h]);
    p.drawText(`${name} page ${i + 1}`, { x: 40, y: h - 80, size: 24, font });
  }
  const bytes = await doc.save();
  return new File([bytes as any], name, { type: 'application/pdf' });
}
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); return f; };
const ctx = { progress: () => {} };
const load = async (blob: Blob) => PDFDocument.load(await blob.arrayBuffer());
const assert = (c: boolean, m: string) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };

const a = await makePdf('a.pdf', 5);

// extract-pages：选中页合成一个文件，顺序按文档序、重复只算一次
let out = await extract.run([a], fd({ ranges: '4-5, 2, 4' }), ctx);
assert(out.length === 1 && (await load(out[0].blob)).getPageCount() === 3, 'extract: 1 file, pages 2,4,5');

// delete-pages：范围优先；全删要报错
out = await del.run([a], fd({ ranges: '2, 5' }), { ...ctx, pageOrder: [0, 1, 2, 3, 4] });
assert((await load(out[0].blob)).getPageCount() === 3, 'delete: ranges win, 3 pages left');
out = await del.run([a], fd({ ranges: '' }), { ...ctx, pageOrder: [4, 0] });
assert((await load(out[0].blob)).getPageCount() === 2, 'delete: thumbnail order honored');
let threw = false; try { await del.run([a], fd({ ranges: '1-5' }), ctx); } catch { threw = true; }
assert(threw, 'delete: removing every page throws');

// crop-pdf：比例框 → CropBox
out = await crop.run([a], fd({ scope: 'all', rect: JSON.stringify({ page: 0, x: 0.25, y: 1 / 6, w: 0.5, h: 2 / 3 }) }), ctx);
{
  const d = await load(out[0].blob);
  const cb = d.getPage(2).getCropBox();
  const near = (u: number, v: number) => Math.abs(u - v) < 0.5;
  assert(near(cb.x, 100) && near(cb.y, 100) && near(cb.width, 200) && near(cb.height, 400), 'crop: box mapped to user space on all pages');
}
out = await crop.run([a], fd({ scope: 'current', rect: JSON.stringify({ page: 1, x: 0.1, y: 0.1, w: 0.5, h: 0.5 }) }), ctx);
{
  const d = await load(out[0].blob);
  assert(d.getPage(0).getCropBox().width === 400 && Math.abs(d.getPage(1).getCropBox().width - 200) < 0.5, 'crop: current-page scope leaves others alone');
}

// edit-pdf：矩形类元素（文字要浏览器 canvas，在浏览器里另测）
out = await edit.run([a], fd({ color: 'black', edits: JSON.stringify([
  { page: 0, kind: 'blackout', x: 0.1, y: 0.1, w: 0.3, h: 0.05 },
  { page: 1, kind: 'highlight', x: 0.1, y: 0.2, w: 0.4, h: 0.04 },
]) }), ctx);
assert((await load(out[0].blob)).getPageCount() === 5, 'edit: rect edits apply and file stays intact');
threw = false; try { await edit.run([a], fd({ edits: '[]' }), ctx); } catch { threw = true; }
assert(threw, 'edit: empty edit list throws');

// fill-pdf：造一个带表单的 PDF，填入 + 压平
const formPdf = await (async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 600]);
  const form = doc.getForm();
  const name = form.createTextField('name');
  name.addToPage(page, { x: 40, y: 500, width: 200, height: 24 });
  const agree = form.createCheckBox('agree');
  agree.addToPage(page, { x: 40, y: 460, width: 18, height: 18 });
  const color = form.createDropdown('color');
  color.addOptions(['red', 'green']);
  color.addToPage(page, { x: 40, y: 420, width: 120, height: 24 });
  const bytes = await doc.save();
  return new File([bytes as any], 'form.pdf', { type: 'application/pdf' });
})();
out = await fill.run([formPdf], fd({ f_0: 'Alice', f_1: 'on', f_2: 'green', flatten: 'on' }), ctx);
{
  const d = await load(out[0].blob);
  assert(d.getForm().getFields().length === 0, 'fill: flatten removes the fields');
}
out = await fill.run([formPdf], fd({ f_0: 'Bob', f_2: '' }), ctx);
{
  const form = (await load(out[0].blob)).getForm();
  assert((form.getTextField('name').getText() ?? '') === 'Bob', 'fill: text written without flatten');
  assert(!form.getCheckBox('agree').isChecked(), 'fill: unticked checkbox stays unchecked');
}
threw = false; try { await fill.run([a], fd({}), ctx); } catch { threw = true; }
assert(threw, 'fill: PDF without fields throws');

// pdf-to-text：文字提取 + 分页标记
out = await toText.run([a], fd({ pages: '1-2', breaks: 'on' }), ctx);
{
  const text = await out[0].blob.text();
  assert(text.includes('a.pdf page 1') && text.includes('page 2') && !text.includes('page 3'), 'pdf-to-text: right pages extracted');
  assert(text.includes('----- Page 1 -----'), 'pdf-to-text: break marker written');
  assert(out[0].name === 'a.txt', 'pdf-to-text: .txt name');
}

// EXIF 方向：PDF 不认 EXIF，方向不是 1 的图必须改走 canvas 重绘，否则手机竖拍的照片会躺倒
{
  /** TIFF 块：II/MM + 42 + IFD 偏移 + 一条 Orientation */
  const tiff = (orientation: number, le = true) => {
    const b = Buffer.alloc(26);
    if (le) { b.write('II', 0, 'ascii'); b.writeUInt16LE(42, 2); b.writeUInt32LE(8, 4); b.writeUInt16LE(1, 8); b.writeUInt16LE(0x0112, 10); b.writeUInt16LE(3, 12); b.writeUInt32LE(1, 14); b.writeUInt16LE(orientation, 18); }
    else { b.write('MM', 0, 'ascii'); b.writeUInt16BE(42, 2); b.writeUInt32BE(8, 4); b.writeUInt16BE(1, 8); b.writeUInt16BE(0x0112, 10); b.writeUInt16BE(3, 12); b.writeUInt32BE(1, 14); b.writeUInt16BE(orientation, 18); }
    return b;
  };
  const jpeg = (orientation: number | null, le = true) => {
    const parts = [Buffer.from([0xff, 0xd8])];
    const app0 = Buffer.concat([Buffer.from([0xff, 0xe0, 0x00, 0x10]), Buffer.from('JFIF\0'), Buffer.alloc(9)]);
    parts.push(app0);
    if (orientation !== null) {
      const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff(orientation, le)]);
      const head = Buffer.alloc(4); head.writeUInt16BE(0xffe1, 0); head.writeUInt16BE(payload.length + 2, 2);
      parts.push(head, payload);
    }
    parts.push(Buffer.from([0xff, 0xda, 0x00, 0x08, 0, 0, 0, 0, 0, 0]));   // SOS
    return new Uint8Array(Buffer.concat(parts));
  };
  const png = (orientation: number | null) => {
    const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])];
    const chunk = (type: string, data: Buffer) => {
      const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
      return Buffer.concat([len, Buffer.from(type, 'ascii'), data, Buffer.alloc(4)]);
    };
    parts.push(chunk('IHDR', Buffer.alloc(13)));
    if (orientation !== null) parts.push(chunk('eXIf', tiff(orientation)));
    parts.push(chunk('IDAT', Buffer.alloc(4)));
    return new Uint8Array(Buffer.concat(parts));
  };

  assert(readExifOrientation(jpeg(6)) === 6, 'exif: JPEG little-endian Orientation=6');
  assert(readExifOrientation(jpeg(8, false)) === 8, 'exif: JPEG big-endian Orientation=8');
  assert(readExifOrientation(jpeg(1)) === 1, 'exif: JPEG Orientation=1 (不需要旋转)');
  assert(readExifOrientation(jpeg(null)) === 0, 'exif: JPEG 没有 EXIF 段');
  assert(readExifOrientation(png(3)) === 3, 'exif: PNG eXIf Orientation=3');
  assert(readExifOrientation(png(null)) === 0, 'exif: PNG 没有 eXIf 块');
  assert(readExifOrientation(new Uint8Array([1, 2, 3, 4])) === 0, 'exif: 不是图片也不能炸');
  assert(readExifOrientation(jpeg(6).subarray(0, 8)) === 0, 'exif: 截断的文件也不能炸');
}

console.log('ALL PASSED (new-tools)');
