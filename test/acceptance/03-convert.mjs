import { suite, ok } from './runner.mjs';
import { fix, pdfInfo, pdfText, zipNames, PROJ } from './lib.mjs';
import { renderPage, inkRatio } from './render.mjs';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.join(PROJ, 'index.js'));
const { loadImage } = require('@napi-rs/canvas');
const P = (n) => fix('pdf/' + n);
const IMG = (n) => fix('images/' + n);
const BAD = (n) => fix('bad/' + n);
const OFF = (n) => fix('office/' + n);
const one = (r) => r.files?.[0];
const unzip = async (file) => { const { default: JSZip } = await import(path.join(PROJ, 'node_modules/jszip/dist/jszip.min.js')); return JSZip.loadAsync(await readFile(file)); };
const docxText = async (file) => { const z = await unzip(file); return (await z.file('word/document.xml').async('string')).replace(/<[^>]+>/g, ''); };
const size = async (f) => (await stat(f)).size;
let baseline = 0;

const cases = [
  // ---------------- 图片 → PDF ----------------
  { id: 'jpg2pdf/multi-fit', spec: { slug: 'jpg-to-pdf', files: [IMG('photo-landscape.jpg'), IMG('photo-portrait.jpg'), IMG('photo-square.png')],
      options: { pagesize: 'fit', orient: 'auto', margin: '0', filename: 'images' } },
    check: async (r) => { const i = await pdfInfo(one(r));
      const ar = i.sizes.map((s) => +(s[0] / s[1]).toFixed(2));
      return [ok(path.basename(one(r)) === 'images.pdf', '文件名，实际 ' + path.basename(one(r))),
        ok(i.pages === 3, '3 页，实际 ' + i.pages),
        ok(Math.abs(ar[0] - 1.6) < 0.05, '第 1 页贴合横图比例 1.6，实际 ' + ar[0]),
        ok(Math.abs(ar[1] - 0.63) < 0.05, '第 2 页贴合竖图比例 0.63，实际 ' + ar[1]),
        ok(Math.abs(ar[2] - 1) < 0.05, '第 3 页贴合方图，实际 ' + ar[2])]; } },

  { id: 'jpg2pdf/a4-landscape-margin', spec: { slug: 'jpg-to-pdf', files: [IMG('photo-landscape.jpg')],
      options: { pagesize: 'a4', orient: 'landscape', margin: '40', filename: 'a4' } },
    check: async (r) => { const i = await pdfInfo(one(r));
      return [ok(Math.abs(i.sizes[0][0] - 842) < 2 && Math.abs(i.sizes[0][1] - 595) < 2, 'A4 横向 842×595，实际 ' + i.sizes[0].slice(0, 2).join('×')),
        ok((await inkRatio(one(r), 0)) < 0.92, '有留白（边距生效）')]; } },

  { id: 'jpg2pdf/exif-orientation', spec: { slug: 'jpg-to-pdf', files: [IMG('photo-exif-rotated.jpg')], options: { pagesize: 'fit', orient: 'auto', margin: '0' } },
    check: async (r) => { const i = await pdfInfo(one(r));
      const portrait = i.sizes[0][1] > i.sizes[0][0];
      return [ok(portrait, `EXIF Orientation=6 的图应按 EXIF 竖过来（浏览器预览就是竖的），实际页面 ${i.sizes[0][0]}×${i.sizes[0][1]} —— 原始字节直传，EXIF 被忽略`)]; } },

  { id: 'jpg2pdf/exif-orientation-png', spec: { slug: 'png-to-pdf', files: [IMG('photo-exif-rotated.png')], options: { pagesize: 'fit', orient: 'auto', margin: '0' } },
    check: async (r) => { const i = await pdfInfo(one(r));
      return [ok(i.sizes[0][1] > i.sizes[0][0], `PNG 的 eXIf 方向同样要生效（Chrome 预览是 900×1500 竖版），实际页面 ${i.sizes[0][0]}×${i.sizes[0][1]}`)]; } },

  { id: 'jpg2pdf/passthrough-not-reencoded', spec: { slug: 'jpg-to-pdf', files: [IMG('photo-landscape.jpg')], options: { pagesize: 'fit', orient: 'auto', margin: '0', compress: false } },
    check: async (r) => { const src = await readFile(IMG('photo-landscape.jpg')); const out = await readFile(one(r));
      const probe = src.subarray(Math.floor(src.length / 2), Math.floor(src.length / 2) + 64);
      return [ok(out.includes(probe), '没有 EXIF 旋转的图仍原样直传（原始 JPEG 字节出现在输出里），没有被重新编码'),
        ok(out.length >= src.length * 0.95, `体积没缩水：源 ${Math.round(src.length / 1024)} KB → 输出 ${Math.round(out.length / 1024)} KB`)]; } },

  { id: 'jpg2pdf/exif-with-compress', spec: { slug: 'jpg-to-pdf', files: [IMG('photo-exif-rotated.jpg')], options: { pagesize: 'fit', orient: 'auto', margin: '0', compress: true } },
    check: async (r) => { const i = await pdfInfo(one(r));
      return [ok(i.sizes[0][1] > i.sizes[0][0], `勾选压缩时走 canvas，EXIF 生效，实际 ${i.sizes[0][0]}×${i.sizes[0][1]}`)]; } },

  { id: 'jpg2pdf/no-compress-baseline', spec: { slug: 'jpg-to-pdf', files: [IMG('scan-en.png'), IMG('scan-zh.png')], options: { pagesize: 'fit', margin: '0', compress: false } },
    check: async (r) => { baseline = await size(one(r));
      return [ok(baseline > 0, '不压缩基准体积 ' + Math.round(baseline / 1024) + ' KB')]; } },

  { id: 'jpg2pdf/transparent-png', spec: { slug: 'jpg-to-pdf', files: [IMG('signature-transparent.png')], options: { pagesize: 'fit', margin: '0' } },
    check: async (r) => { const px = await renderPage(one(r), 0, 1);
      const corner = [0, 1, 2].map((k) => px.data[k]);
      return [ok(corner.every((v) => v > 240), '透明底渲染成白底而不是黑底，左上角 rgb ' + corner.join(','))]; } },

  { id: 'jpg2pdf/extremes', spec: { slug: 'jpg-to-pdf', files: [IMG('panorama-4000x400.jpg'), IMG('tiny-16px.png'), IMG('photo-webp.webp')], options: { pagesize: 'a4', orient: 'auto', margin: '10' } },
    check: async (r) => { const i = await pdfInfo(one(r));
      return [ok(i.pages === 3, '极端比例 / 极小图 / WebP 都能进，实际 ' + i.pages + ' 页'),
        ok(i.sizes.every((s) => s[0] > 100 && s[1] > 100), '页面尺寸正常：' + JSON.stringify(i.sizes.map((s) => s.slice(0, 2))))]; } },

  { id: 'jpg2pdf/huge-image', spec: { slug: 'jpg-to-pdf', files: [IMG('photo-huge-6000x4000.jpg')], options: { pagesize: 'fit', margin: '0' }, timeout: 120000 },
    check: async (r) => [ok(r.state === 'result', '6000×4000 大图能跑完，实际 ' + r.state), ok((await pdfInfo(one(r))).pages === 1, '输出 1 页')] },

  { id: 'jpg2pdf/compress-option', spec: { slug: 'jpg-to-pdf', files: [IMG('scan-en.png'), IMG('scan-zh.png')], options: { pagesize: 'fit', margin: '0', compress: true } },
    check: async (r) => { const s2 = await size(one(r));
      return [ok(s2 < baseline * 0.8, `压缩后明显变小：${Math.round(baseline / 1024)} KB → ${Math.round(s2 / 1024)} KB`)]; } },

  { id: 'jpg2pdf/bad-image', spec: { slug: 'jpg-to-pdf', files: [BAD('not-an-image.jpg')] },
    check: async (r) => [ok(r.state === 'alert' || r.uploadStage === 'upload', '假图片应被拦下，实际 ' + (r.state ?? r.uploadStage)),
      ok(!!(r.alert || r.uploadAlert), '提示：' + (r.alert || r.uploadAlert))] },

  { id: 'png2pdf/basic', spec: { slug: 'png-to-pdf', files: [IMG('photo-square.png'), IMG('scan-en.png')], options: {} },
    check: async (r) => [ok((await pdfInfo(one(r))).pages === 2, '2 页')] },

  // ---------------- PDF → 图片 ----------------
  { id: 'pdf2jpg/dpi-96-vs-300', spec: { slug: 'pdf-to-jpg', files: [P('text-1p.pdf')], options: { dpi: '96', format: 'jpg', pages: '' } },
    check: async (r) => { const img = await loadImage(await readFile(one(r)));
      return [ok(one(r).endsWith('.jpg'), '扩展名 .jpg，实际 ' + path.basename(one(r))),
        ok(Math.abs(img.width - 595 * 96 / 72) < 12, `96 dpi 宽度约 793，实际 ${img.width}`)]; } },

  { id: 'pdf2jpg/dpi-300-png', spec: { slug: 'pdf-to-jpg', files: [P('text-1p.pdf')], options: { dpi: '300', format: 'png', pages: '' } },
    check: async (r) => { const img = await loadImage(await readFile(one(r)));
      return [ok(one(r).endsWith('.png'), '扩展名 .png'), ok(Math.abs(img.width - 595 * 300 / 72) < 30, `300 dpi 宽度约 2479，实际 ${img.width}`)]; } },

  { id: 'pdf2jpg/pages-range', spec: { slug: 'pdf-to-jpg', files: [P('text-60p-bookmarks.pdf')], options: { dpi: '96', format: 'jpg', pages: '1-3, 10' }, addTimeout: 60000 },
    check: async (r) => { const names = (await zipNames(one(r))).sort();
      return [ok(names.length === 4, '导出 4 张，实际 ' + names.length),
        ok(names.every((n) => /_p\d+\.jpg$/.test(n)), '文件名带页码：' + names.join(', ')),
        ok(names.some((n) => n.includes('_p10.')), '包含第 10 页')]; } },

  { id: 'pdf2png/basic', spec: { slug: 'pdf-to-png', files: [P('cjk-text-2p.pdf')], options: {} },
    check: async (r) => { const names = await zipNames(one(r));
      return [ok(names.length === 2, '2 张 PNG，实际 ' + names.length), ok(names.every((n) => n.endsWith('.png')), '都是 png')]; } },

  { id: 'pdf2jpg/photo-heavy', spec: { slug: 'pdf-to-jpg', files: [P('photos-12p.pdf')], options: { dpi: '96', format: 'jpg', pages: '' }, timeout: 180000, addTimeout: 60000 },
    check: async (r) => [ok(r.state === 'result', '17 MB 照片 PDF 能跑完'), ok((await zipNames(one(r))).length === 12, '12 张')] },

  // ---------------- PDF → 文字 / Word ----------------
  { id: 'pdf2text/basic+accents', spec: { slug: 'pdf-to-text', files: [P('text-5p.pdf')], options: { pages: '', breaks: true } },
    check: async (r) => { const txt = await readFile(one(r), 'utf8');
      return [ok(one(r).endsWith('.txt'), '输出 .txt'), ok(txt.includes('café') && txt.includes('Grüße'), '重音字正确'),
        ok(/1|Page/.test(txt), '有内容'), ok((txt.match(/\f|---|===|Page \d/g) || []).length > 0, '勾选后有分页标记')]; } },

  { id: 'pdf2text/range+nobreaks', spec: { slug: 'pdf-to-text', files: [P('text-60p-bookmarks.pdf')], options: { pages: '5-6', breaks: false }, addTimeout: 60000 },
    check: async (r) => { const txt = await readFile(one(r), 'utf8');
      return [ok(txt.includes('Page 5 of 60') && txt.includes('Page 6 of 60'), '只取第 5、6 页'),
        ok(!txt.includes('Page 7 of 60') && !txt.includes('Page 4 of 60'), '没有多余页')]; } },

  { id: 'pdf2text/cjk', spec: { slug: 'pdf-to-text', files: [P('cjk-text-2p.pdf')], options: { pages: '', breaks: true } },
    check: async (r) => { const txt = await readFile(one(r), 'utf8');
      return [ok(txt.includes('中文测试文档'), '中文提取正确'), ok(txt.includes('日本語のテストページ'), '日文提取正确')]; } },

  { id: 'pdf2text/scanned-empty', spec: { slug: 'pdf-to-text', files: [P('scanned-en-2p.pdf')], options: { pages: '', breaks: true } },
    check: async (r) => { if (r.state !== 'result') return [ok(true, '扫描件给出提示：' + r.alert)];
      const txt = (await readFile(one(r), 'utf8')).trim();
      return [ok(true, `扫描件（无文字层）行为：${txt.length < 40 ? '输出几乎为空（' + txt.length + ' 字符）' : '有内容'}；结果页文案「${r.meta}」`)]; } },

  { id: 'pdf2word/basic', spec: { slug: 'pdf-to-word', files: [P('text-5p.pdf')], options: { images: true } },
    check: async (r) => { const t = await docxText(one(r)); const z = await unzip(one(r));
      return [ok(one(r).endsWith('.docx'), '输出 .docx'), ok(!!z.file('[Content_Types].xml') && !!z.file('word/document.xml'), 'docx 结构完整'),
        ok(t.includes('Text 5 pages'), '正文文字在'), ok(t.includes('café'), '重音字在')]; } },

  { id: 'pdf2word/cjk', spec: { slug: 'pdf-to-word', files: [P('cjk-text-2p.pdf')], options: { images: true } },
    check: async (r) => { const t = await docxText(one(r));
      return [ok(t.includes('中文测试文档'), '中文进了 docx'), ok(t.includes('日本語'), '日文进了 docx')]; } },

  { id: 'pdf2word/images-off', spec: { slug: 'pdf-to-word', files: [P('mixed-text-and-scan-2p.pdf')], options: { images: false }, timeout: 180000 },
    check: async (r) => { const z = await unzip(one(r));
      const media = Object.keys(z.files).filter((n) => n.startsWith('word/media/'));
      return [ok(r.state === 'result', '能跑完'), ok(media.length === 0, '取消勾选后不含图片，实际 ' + media.length + ' 张')]; } },

  { id: 'pdf2word/scan-guidance', spec: { slug: 'pdf-to-word', files: [P('photos-12p.pdf')], options: { images: true }, timeout: 180000, addTimeout: 60000 },
    check: async (r) => [ok(r.state === 'alert', '纯图片 PDF 应提示先 OCR，实际 ' + r.state),
      ok(/OCR/i.test(r.alert || ''), '提示引导去 OCR：' + r.alert)] },

  { id: 'pdf2word/images-on', spec: { slug: 'pdf-to-word', files: [P('mixed-text-and-scan-2p.pdf')], options: { images: true }, timeout: 180000 },
    check: async (r) => { const z = await unzip(one(r));
      const media = Object.keys(z.files).filter((n) => n.startsWith('word/media/'));
      return [ok(media.length > 0, '勾选后带图片，实际 ' + media.length + ' 张')]; } },

  // ---------------- Word → PDF ----------------
  { id: 'word2pdf/rich', spec: { slug: 'word-to-pdf', files: [OFF('report-rich.docx')], timeout: 120000 },
    check: async (r) => { const i = await pdfInfo(one(r)); const t = await pdfText(one(r)); const all = t.join(' ');
      const { PDFDocument, PDFName, PDFDict } = await import(path.join(PROJ, 'node_modules/pdf-lib/cjs/index.js'));
      const doc = await PDFDocument.load(await readFile(one(r)));
      const annots = doc.getPage(0).node.Annots();
      const uri = annots && (annots.lookup(0, PDFDict)?.lookup(PDFName.of('A'), PDFDict)?.get(PDFName.of('URI'))?.decodeText?.() ?? '');
      const xo = doc.getPage(0).node.Resources()?.lookup(PDFName.of('XObject'), PDFDict);
      return [ok(path.basename(one(r)) === 'report-rich.pdf', '输出名，实际 ' + path.basename(one(r))),
        ok(i.pages === 2, '分页符 → 2 页，实际 ' + i.pages),
        ok(Math.abs(i.sizes[0][0] - 595) < 2, 'A4 页面宽度，实际 ' + i.sizes[0][0]),
        ok(all.includes('Quarterly Report') && all.includes('our website') && all.includes('details'), '标题与行内样式文字'),
        ok(/1\.\s*First step/.test(all.replace(/\s+/g, ' ')) && /2\.\s*Second step/.test(all.replace(/\s+/g, ' ')), '有序列表编号'),
        ok(/Chapter one\s*\.{6,}\s*12/.test(all.replace(/\s+/g, ' ')), '点导航右对齐制表位'),
        ok(all.includes('Merged across two columns') && all.includes('80.10'), '表格（含合并单元格）'),
        ok(uri === 'https://shypdf.com/', '超链接注释，实际 ' + uri),
        ok(!!xo && xo.keys().length >= 1, '图片已嵌入'),
        ok(t[0].includes('Page 1 of 2') && t[1].includes('Page 2 of 2'), '页眉 PAGE / NUMPAGES'),
        ok(all.replace(/\s/g, '').includes('日本語の段落です'), '日文不丢'),
        ok(all.replace(/\s/g, '').includes('中文段落'), '中文不丢')]; } },

  { id: 'word2pdf/legacy-doc', spec: { slug: 'word-to-pdf', files: [BAD('legacy.doc')] },
    check: async (r) => [ok(r.uploadStage === 'upload', '旧 .doc 在上传阶段就被拦下，实际 ' + r.uploadStage),
      ok(!!r.uploadAlert && /legacy\.doc/.test(r.uploadAlert), '提示带文件名：' + r.uploadAlert),
      ok(true, '（观察）拦在 accept 白名单层，工具里那句「只支持 .docx」的文案走不到')] },

  { id: 'word2pdf/broken-docx', spec: { slug: 'word-to-pdf', files: [BAD('broken.docx')] },
    check: async (r) => [ok(r.state === 'alert', '坏包应报错，实际 ' + r.state),
      ok(!!r.alert && !/undefined|\[object|TypeError/.test(r.alert), '提示可读：' + r.alert)] },
];

await suite('03-convert', cases);
