// 在 Node 里跑 pdf-lib 系工具的冒烟测试（不依赖浏览器的：merge / split / rotate / organize / page-numbers(拉丁格式)）
import { PDFDocument, StandardFonts, PDFName } from 'pdf-lib';
import merge from '@/tools/merge-pdf';
import split from '@/tools/split-pdf';
import rotate from '@/tools/rotate-pdf';
import organize from '@/tools/organize-pdf';
import pageNumbers from '@/tools/add-page-numbers';
import { parseRanges } from '@/lib/files';

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
const count = async (blob: Blob) => (await PDFDocument.load(await blob.arrayBuffer())).getPageCount();
const assert = (c: boolean, m: string) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };

const a = await makePdf('a.pdf', 3), b = await makePdf('b.pdf', 2), c = await makePdf('c.pdf', 4);

// merge
let out = await merge.run([a, b, c], fd({ bookmarks: 'on', filename: '合并结果' }), ctx);
assert(out.length === 1 && out[0].name === '合并结果.pdf', 'merge: one output, .pdf appended');
assert((await count(out[0].blob)) === 9, 'merge: 3+2+4 = 9 pages');
{
  const d = await PDFDocument.load(await out[0].blob.arrayBuffer());
  assert(d.catalog.has(PDFName.of('Outlines')), 'merge: outlines written');
}

// split
assert(JSON.stringify(parseRanges('1-2, 4', 4)) === '[[0,1],[3]]', 'parseRanges');
out = await split.run([c], fd({ mode: 'ranges', ranges: '1-2, 4' }), ctx);
assert(out.length === 2 && (await count(out[0].blob)) === 2 && (await count(out[1].blob)) === 1, 'split ranges → 2 files (2p, 1p)');
out = await split.run([c], fd({ mode: 'each' }), ctx);
assert(out.length === 4, 'split each → 4 files');
out = await split.run([c], fd({ mode: 'odd' }), ctx);
assert(out.length === 1 && (await count(out[0].blob)) === 2, 'split odd → 2 pages');
let threw = false; try { await split.run([c], fd({ mode: 'ranges', ranges: '1-9' })); } catch { threw = true; } assert(threw, 'split: out-of-range throws');

// rotate
out = await rotate.run([a], fd({ angle: '90', scope: 'ranges', ranges: '2' }), ctx);
{
  const d = await PDFDocument.load(await out[0].blob.arrayBuffer());
  assert(d.getPage(0).getRotation().angle === 0 && d.getPage(1).getRotation().angle === 90, 'rotate: only page 2 rotated');
}

// organize: reverse order, drop page 2, rotate first
out = await organize.run([a], fd({ filename: '' }), { ...ctx, pageOrder: [2, 0], pageRotations: { 2: 180 } });
{
  const d = await PDFDocument.load(await out[0].blob.arrayBuffer());
  assert(d.getPageCount() === 2 && d.getPage(0).getRotation().angle === 180, 'organize: 2 pages kept, first rotated 180');
  assert(out[0].name === 'a_organized.pdf', 'organize: default name');
}

// page numbers (latin format, no canvas)
out = await pageNumbers.run([c], fd({ format: 'slash', pos: 'br', start: '1', from: '2', size: '11', margin: '28' }), ctx);
assert((await count(out[0].blob)) === 4, 'page numbers: page count unchanged');
console.log('ALL PASSED');
