import './_node-env';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { getPdfjs } from '@/lib/pdfjs';
import JSZip from 'jszip';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { loadImage } = require('@napi-rs/canvas');

const F = (p: string) => readFile(`test/fixtures/${p}`);
const ok = (c: boolean, m: string) => console.log((c ? 'ok   ' : 'FAIL ') + m);

async function info(p: string) {
  const pdfjs = await getPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await F(p)) }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) text += (await (await doc.getPage(i)).getTextContent()).items.map((it: any) => it.str ?? '').join('');
  await doc.loadingTask.destroy();
  return { pages: doc.numPages, text };
}

let r = await info('pdf/text-5p.pdf'); ok(r.pages === 5 && r.text.includes('café'), `text-5p: 5 页、含重音字 (${r.pages})`);
r = await info('pdf/text-60p-bookmarks.pdf'); ok(r.pages === 60, `60p: ${r.pages} 页`);
{ const d = await PDFDocument.load(await F('pdf/text-60p-bookmarks.pdf')); ok(d.catalog.has((await import('pdf-lib')).PDFName.of('Outlines')), '60p: 有书签'); }
r = await info('pdf/mixed-sizes-rotations.pdf'); ok(r.pages === 6, `mixed-sizes: ${r.pages} 页`);
{ const d = await PDFDocument.load(await F('pdf/mixed-sizes-rotations.pdf'));
  ok(d.getPage(3).getRotation().angle === 90 && d.getPage(5).getRotation().angle === 180, 'mixed-sizes: 自带旋转 90/180'); }
r = await info('pdf/cjk-text-2p.pdf'); ok(r.text.includes('中文测试文档') && r.text.includes('日本語'), 'cjk: 中日文字可提取');
r = await info('pdf/scanned-en-2p.pdf'); ok(r.pages === 2 && r.text.replace(/\s/g, '').length === 0, `scanned-en: 2 页且无文字层 (文字 ${r.text.length} 字符)`);
r = await info('pdf/mixed-text-and-scan-2p.pdf'); ok(r.pages === 2 && r.text.length > 50, 'mixed-text-and-scan: 第 1 页有文字');
r = await info('pdf/poster-a0.pdf'); ok(r.pages === 1, 'poster-a0: 1 页');
{ const d = await PDFDocument.load(await F('pdf/poster-a0.pdf')); const s = d.getPage(0).getSize(); ok(s.width > 2300 && s.height > 3300, `poster-a0: ${Math.round(s.width)}×${Math.round(s.height)} pt`); }
r = await info('pdf/photos-12p.pdf'); ok(r.pages === 12, `photos-12p: ${r.pages} 页整图`);

{ const d = await PDFDocument.load(await F('pdf/form-acroform.pdf'));
  const fields = d.getForm().getFields();
  ok(fields.length === 7, `form: ${fields.length} 个域 — ${fields.map((f) => f.getName()).join(', ')}`);
  ok(fields.some((f) => f.isReadOnly()), 'form: 含只读域'); }

for (const [p, why] of [['pdf/encrypted-user-pw-open123.pdf', '有打开密码'], ['pdf/encrypted-rc4-128-open123.pdf', 'RC4 有打开密码']] as const) {
  let threw = false; try { await PDFDocument.load(await F(p)); } catch { threw = true; }
  ok(threw, `${p}: pdf-lib 拒绝加载（${why}）`);
}
{ let threw = false; try { await PDFDocument.load(await F('pdf/encrypted-owner-only.pdf')); } catch { threw = true; }
  ok(threw, 'encrypted-owner-only: pdf-lib 同样拒绝（需解锁工具去限制）'); }

for (const p of ['bad/broken-xref.pdf', 'bad/truncated.pdf', 'bad/no-eof.pdf', 'bad/not-a-pdf.pdf', 'bad/empty.pdf']) {
  let state = 'opens';
  try { const d = await PDFDocument.load(await F(p)); state = `opens (${d.getPageCount()}p)`; } catch (e: any) { state = 'rejected: ' + String(e.message).split('\n')[0].slice(0, 60); }
  console.log(`     ${p} → pdf-lib ${state}`);
}
{ const zip = await JSZip.loadAsync(await F('office/report-rich.docx'));
  ok(!!zip.file('word/document.xml') && !!zip.file('word/media/image1.png'), 'docx: 有 document.xml 和图片');
  const zip2 = await JSZip.loadAsync(await F('bad/broken.docx'));
  ok(!zip2.file('word/document.xml'), 'broken.docx: 确实缺 document.xml'); }

for (const p of ['images/photo-landscape.jpg', 'images/photo-exif-rotated.jpg', 'images/photo-webp.webp', 'images/signature-transparent.png', 'images/scan-zh.png', 'images/panorama-4000x400.jpg', 'images/tiny-16px.png']) {
  const img = await loadImage(await F(p));
  console.log(`     ${p} → ${img.width}×${img.height}`);
}
{ const b = await F('images/photo-exif-rotated.jpg');
  ok(b.indexOf(Buffer.from('Exif')) === 6, 'exif jpg: APP1 EXIF 段就在 SOI 之后'); }
