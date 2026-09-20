#!/usr/bin/env node
// 生成本地验收测试用的素材：图片、PDF、DOCX，以及故意做坏的文件。
// 用法：node scripts/make-fixtures.mjs [输出目录]    默认 test/fixtures/
// 素材说明见输出目录里的 README.md。

import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PDFDocument, StandardFonts, PDFName, PDFString, PDFNumber, PDFDict, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import JSZip from 'jszip';

const require = createRequire(import.meta.url);
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, 'test/fixtures'));
const VENDOR_FONT = (f) => path.join(ROOT, 'public/vendor/fonts', f);

GlobalFonts.registerFromPath(VENDOR_FONT('Arimo-400Regular.ttf'), 'FixArimo');
GlobalFonts.registerFromPath(VENDOR_FONT('Tinos-400Regular.ttf'), 'FixTinos');
GlobalFonts.registerFromPath(VENDOR_FONT('NotoSansSC-400Regular.ttf'), 'FixSC');
GlobalFonts.registerFromPath(VENDOR_FONT('NotoSansJP-400Regular.ttf'), 'FixJP');

const manifest = [];
async function save(rel, data, note) {
  const p = path.join(OUT, rel);
  await mkdir(path.dirname(p), { recursive: true });
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  await writeFile(p, buf);
  manifest.push({ rel, size: buf.length, note });
  return buf;
}
const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';

// ---------------------------------------------------------------- 画图
/** 一张「纸」：白底 + 若干行文字，可选扫描噪点和轻微倾斜 */
function paper({ w = 1240, h = 1754, lines, font = '40px FixTinos', fg = '#111', bg = '#fff', tilt = 0, noise = 0, size = 40 }) {
  const c = createCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.save();
  if (tilt) { g.translate(w / 2, h / 2); g.rotate((tilt * Math.PI) / 180); g.translate(-w / 2, -h / 2); }
  g.fillStyle = fg; g.font = font;
  lines.forEach((l, i) => g.fillText(l, 110, 180 + i * Math.round(size * 1.8)));
  g.restore();
  if (noise) {
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * noise;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    g.putImageData(img, 0, 0);
  }
  return c;
}

/** 彩色「照片」：渐变 + 色块 + 噪点，JPEG 压不小，适合测体积 */
function photo(w, h, seed = 1, grain = true) {
  const c = createCanvas(w, h), g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, `hsl(${(seed * 47) % 360} 70% 62%)`);
  grd.addColorStop(1, `hsl(${(seed * 47 + 130) % 360} 65% 32%)`);
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 18; i++) {
    g.fillStyle = `hsla(${(seed * 31 + i * 23) % 360} 80% ${30 + ((i * 7) % 50)}% / .55)`;
    g.beginPath();
    g.arc(((i * 137 + seed * 53) % w), ((i * 271 + seed * 97) % h), (w / 9) * (0.3 + ((i % 5) / 5)), 0, Math.PI * 2);
    g.fill();
  }
  if (grain) { // 噪点让 JPEG 压不动，文件才够大
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 90;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
  }
  g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(0, h - Math.round(h / 8), w, Math.round(h / 8));
  g.fillStyle = '#fff'; g.font = `${Math.round(h / 16)}px FixArimo`;
  g.fillText(`${w}x${h} #${seed}`, 24, h - Math.round(h / 28));
  return c;
}

/** EXIF Orientation=6（顺时针 90°）：看工具是否按 EXIF 摆正 */
function withExifOrientation(jpeg, orientation = 6) {
  const tiff = Buffer.alloc(26);
  tiff.write('II', 0, 'ascii'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8);              // IFD0 条目数
  tiff.writeUInt16LE(0x0112, 10);        // Orientation
  tiff.writeUInt16LE(3, 12);             // SHORT
  tiff.writeUInt32LE(1, 14);
  tiff.writeUInt16LE(orientation, 18);
  tiff.writeUInt32LE(0, 22);             // 无下一个 IFD
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const head = Buffer.alloc(4);
  head.writeUInt16BE(0xffe1, 0); head.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), head, payload, jpeg.subarray(2)]);
}

/** 给 PNG 插一个 eXIf 块（Chrome 也按它摆正） */
function withPngExif(png, orientation = 6) {
  const tiff = Buffer.alloc(26);
  tiff.write('II', 0, 'ascii'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8); tiff.writeUInt16LE(0x0112, 10); tiff.writeUInt16LE(3, 12);
  tiff.writeUInt32LE(1, 14); tiff.writeUInt16LE(orientation, 18); tiff.writeUInt32LE(0, 22);
  const len = Buffer.alloc(4); len.writeUInt32BE(tiff.length, 0);
  const body = Buffer.concat([Buffer.from('eXIf', 'ascii'), tiff]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  const chunk = Buffer.concat([len, body, crc]);
  const ihdrEnd = 8 + 4 + 4 + 13 + 4; // 签名 + IHDR 整块
  return Buffer.concat([png.subarray(0, ihdrEnd), chunk, png.subarray(ihdrEnd)]);
}
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

// ---------------------------------------------------------------- PDF 小工具
const A4 = [595.28, 841.89], A4L = [841.89, 595.28], LETTER = [612, 792], A3 = [841.89, 1190.55], A0 = [2383.94, 3370.39];

async function latinPdf({ pages = 3, size = A4, title = 'Sample', body = [] }) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle(title); doc.setAuthor('ShyPDF acceptance fixtures'); doc.setSubject('local QA');
  for (let i = 0; i < pages; i++) {
    const p = doc.addPage(size);
    const { width, height } = p.getSize();
    p.drawText(`${title}`, { x: 56, y: height - 80, size: 26, font: bold });
    p.drawText(`Page ${i + 1} of ${pages}`, { x: 56, y: height - 118, size: 13, font });
    body.forEach((line, j) => p.drawText(line, { x: 56, y: height - 160 - j * 20, size: 11, font }));
    p.drawRectangle({ x: 40, y: 40, width: width - 80, height: height - 160, borderColor: rgb(0.8, 0.82, 0.86), borderWidth: 1 });
    p.drawText(`— ${i + 1} —`, { x: width / 2 - 14, y: 56, size: 10, font });
  }
  return doc;
}

const LOREM = [
  'Acceptance fixture. Every page carries its own number so reordering, deleting',
  'and extracting can be checked by eye after the tool runs.',
  'Accented text: café, jamón, Grüße, ação, français, Ærø, Íslenska — check extraction.',
  'Symbols: © ® ™ § ¶ † ‡ • … “quoted” – dash — em-dash.',
];

/** 一级书签（每页一条），用来看别的工具会不会把大纲弄丢 */
function addOutline(doc, titles) {
  const ctx = doc.context, pages = doc.getPages();
  const rootRef = ctx.nextRef(), refs = titles.map(() => ctx.nextRef());
  titles.forEach((title, i) => {
    const item = ctx.obj({ Title: PDFString.of(title), Parent: rootRef, Dest: ctx.obj([pages[i].ref, PDFName.of('Fit')]) });
    if (i > 0) item.set(PDFName.of('Prev'), refs[i - 1]);
    if (i < titles.length - 1) item.set(PDFName.of('Next'), refs[i + 1]);
    ctx.assign(refs[i], item);
  });
  ctx.assign(rootRef, ctx.obj({ Type: PDFName.of('Outlines'), First: refs[0], Last: refs[refs.length - 1], Count: PDFNumber.of(titles.length) }));
  doc.catalog.set(PDFName.of('Outlines'), rootRef);
}

/** 把若干 canvas 当整页图片贴成 PDF（没有文字层 = 扫描件） */
async function scanPdf(canvases, { jpeg = true } = {}) {
  const doc = await PDFDocument.create();
  for (const c of canvases) {
    const bytes = jpeg ? c.toBuffer('image/jpeg', 82) : c.toBuffer('image/png');
    const img = jpeg ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
    const w = 595.28, h = (img.height / img.width) * w;
    const p = doc.addPage([w, h]);
    p.drawImage(img, { x: 0, y: 0, width: w, height: h });
  }
  return doc;
}

// ---------------------------------------------------------------- qpdf（加密）
let qpdfFactory = null;
async function qpdf(input, args) {
  if (!qpdfFactory) {
    const dir = await mkdir(path.join(tmpdir(), 'shypdf-fixtures'), { recursive: true }).then(() => path.join(tmpdir(), 'shypdf-fixtures'));
    const cjs = path.join(dir, 'qpdf.cjs');
    await writeFile(cjs, await readFile(path.join(ROOT, 'public/vendor/qpdf/qpdf.js')));
    await writeFile(path.join(dir, 'qpdf.wasm'), await readFile(path.join(ROOT, 'public/vendor/qpdf/qpdf.wasm'))); // 胶水按同目录找 .wasm
    globalThis.fetch = undefined; // Emscripten 胶水在 Node 里会误走 fetch 分支
    qpdfFactory = require(cjs);
  }
  const wasmBinary = await readFile(path.join(ROOT, 'public/vendor/qpdf/qpdf.wasm'));
  const err = [];
  const mod = await qpdfFactory({ wasmBinary, printErr: (l) => err.push(l), print: () => {} });
  mod.FS.writeFile('in.pdf', input);
  let code = 0;
  try { code = mod.callMain(args); } catch (e) { if (typeof e?.status === 'number') code = e.status; else throw e; }
  if (code !== 0 && code !== 3) throw new Error(`qpdf ${code}: ${err.join('\n')}`);
  return Buffer.from(mod.FS.readFile('out.pdf'));
}

// ================================================================ 开工
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// ---------- 图片 ----------
const land = photo(1600, 1000, 3), port = photo(1000, 1600, 5), square = photo(1200, 1200, 7);
await save('images/photo-landscape.jpg', land.toBuffer('image/jpeg', 88), '横向照片 1600×1000');
await save('images/photo-portrait.jpg', port.toBuffer('image/jpeg', 88), '纵向照片 1000×1600');
await save('images/photo-square.png', square.toBuffer('image/png'), '方形 PNG 1200×1200');
await save('images/photo-webp.webp', photo(1400, 900, 11).toBuffer('image/webp'), 'WebP 输入（accept 里允许）');
await save('images/photo-exif-rotated.jpg', withExifOrientation(photo(1600, 1000, 13).toBuffer('image/jpeg', 88), 6), 'EXIF Orientation=6（手机竖拍的典型值）：看是否按 EXIF 摆正');
await save('images/photo-exif-rotated.png', withPngExif(photo(1500, 900, 29).toBuffer('image/png'), 6), 'PNG 的 eXIf 块也写了 Orientation=6：同上');
await save('images/photo-huge-6000x4000.jpg', photo(6000, 4000, 17).toBuffer('image/jpeg', 90), '超大图 6000×4000：内存 / 缩放');
await save('images/tiny-16px.png', photo(16, 16, 19, false).toBuffer('image/png'), '极小图 16×16');
await save('images/panorama-4000x400.jpg', photo(4000, 400, 23).toBuffer('image/jpeg', 85), '极端宽高比 10:1：页面适配');

{ // 透明 PNG（签名 / 图片转 PDF 的透明底处理）
  const c = createCanvas(900, 320), g = c.getContext('2d');
  g.strokeStyle = '#101010'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(60, 230);
  g.bezierCurveTo(160, 60, 250, 300, 360, 170);
  g.bezierCurveTo(450, 70, 520, 280, 640, 150);
  g.bezierCurveTo(700, 95, 760, 210, 840, 120);
  g.stroke();
  g.beginPath(); g.moveTo(70, 275); g.lineTo(820, 262); g.lineWidth = 3; g.stroke();
  await save('images/signature-transparent.png', c.toBuffer('image/png'), '透明底手写签名 PNG → 签名工具「图片」模式');
}
{ // 拍在纸上的签名：白底带阴影，测 sign-pdf 的「去白底」
  const c = createCanvas(1200, 500), g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 1200, 500);
  grd.addColorStop(0, '#fdfdfb'); grd.addColorStop(1, '#e9e7e0');
  g.fillStyle = grd; g.fillRect(0, 0, 1200, 500);
  g.strokeStyle = '#1d2a55'; g.lineWidth = 11; g.lineCap = 'round';
  g.beginPath(); g.moveTo(120, 330);
  g.bezierCurveTo(240, 120, 350, 400, 470, 240);
  g.bezierCurveTo(580, 110, 660, 360, 800, 220);
  g.bezierCurveTo(880, 150, 960, 300, 1060, 200);
  g.stroke();
  await save('images/signature-on-paper.jpg', c.toBuffer('image/jpeg', 92), '纸上签名照片 → 测「去掉白底」勾选项');
}

// 扫描页（OCR 用），各语种一张
const SCAN = {
  en: { font: '42px FixTinos', lines: ['INVOICE 2026-0917', 'Billed to: Northwind Trading Ltd.', 'Item: Annual subscription, Plan Pro', 'Quantity: 3    Unit price: 49.00 USD', 'Total due: 147.00 USD', 'Payment terms: net 30 days.', 'Thank you for your business.'] },
  es: { font: '42px FixTinos', lines: ['FACTURA N.º 2026-0917', 'Cliente: Comercial Peña e Hijos, S.L.', 'Concepto: suscripción anual, plan Pro', 'Cantidad: 3    Precio: 49,00 €', 'Importe total: 147,00 €', 'Condiciones: pago a 30 días.', 'Gracias por su confianza.'] },
  de: { font: '42px FixTinos', lines: ['RECHNUNG 2026-0917', 'Kunde: Müller & Söhne GmbH', 'Leistung: Jahresabonnement, Tarif Pro', 'Menge: 3    Einzelpreis: 49,00 €', 'Gesamtbetrag: 147,00 €', 'Zahlbar innerhalb von 30 Tagen.', 'Vielen Dank für Ihren Auftrag.'] },
  ja: { font: '40px FixJP', lines: ['請求書 2026-0917', 'お客様名：株式会社ノースウィンド', '品目：年間サブスクリプション（Proプラン）', '数量：3　単価：7,400円', '合計金額：22,200円', 'お支払い期限：30日以内', 'ご利用ありがとうございます。'] },
  zh: { font: '40px FixSC', lines: ['发票 2026-0917', '客户：北风贸易有限公司', '项目：年度订阅（专业版）', '数量：3　单价：349.00 元', '应付合计：1047.00 元', '付款条件：30 天内付清。', '感谢您的惠顾。'] },
};
const scans = {};
for (const [k, v] of Object.entries(SCAN)) {
  scans[k] = paper({ lines: v.lines, font: v.font, size: 42, tilt: 0.45, noise: 13, fg: '#161616', bg: '#fbfaf7' });
  const LANG_NAME = { en: '英文', es: '西班牙文', de: '德文（含变音）', ja: '日文', zh: '中文' };
  await save(`images/scan-${k}.png`, scans[k].toBuffer('image/png'), `${LANG_NAME[k]}扫描页（OCR 素材 / 也可当图片转 PDF 的输入）`);
}

// ---------- 正常 PDF ----------
{
  const doc = await latinPdf({ pages: 5, title: 'Text 5 pages', body: LOREM });
  await save('pdf/text-5p.pdf', await doc.save(), '5 页纯文字 A4：多数工具的基准输入');
}
{
  const doc = await latinPdf({ pages: 1, title: 'Single page', body: LOREM });
  await save('pdf/text-1p.pdf', await doc.save(), '单页：删光页面 / 按页拆分的边界');
}
{
  const doc = await latinPdf({ pages: 60, title: 'Long document', body: LOREM.slice(0, 2) });
  addOutline(doc, doc.getPages().map((_, i) => `Section ${i + 1}`));
  await save('pdf/text-60p-bookmarks.pdf', await doc.save(), '60 页 + 书签：缩略图性能、页码范围、大纲是否保留');
}
{
  const doc = await latinPdf({ pages: 3, title: 'Letter size', size: LETTER, body: LOREM.slice(0, 2) });
  await save('pdf/letter-3p.pdf', await doc.save(), 'Letter 尺寸：和 A4 混合合并时看页面大小');
}
{ // 混合尺寸 + 已有旋转
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const specs = [[A4, 0, 'A4 portrait'], [A4L, 0, 'A4 landscape'], [A3, 0, 'A3'], [A4, 90, 'A4 rotated 90'], [A4, 270, 'A4 rotated 270'], [LETTER, 180, 'Letter rotated 180']];
  specs.forEach(([size, rot, label], i) => {
    const p = doc.addPage(size);
    p.setRotation(degrees(rot));
    p.drawText(`${i + 1}. ${label}`, { x: 50, y: p.getHeight() - 90, size: 24, font });
    p.drawRectangle({ x: 40, y: 40, width: 120, height: 60, color: rgb(0.2, 0.45, 0.9) });
  });
  await save('pdf/mixed-sizes-rotations.pdf', await doc.save(), '6 页混合尺寸 + 自带旋转：组织 / 裁剪 / 页码 / 水印的摆放');
}
{ // A0 大页
  const doc = await latinPdf({ pages: 1, title: 'Poster A0', size: A0, body: LOREM });
  await save('pdf/poster-a0.pdf', await doc.save(), 'A0 巨幅单页：渲染上限 / OCR 缩放 / 压缩内存');
}
{ // CJK 文字层
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const sc = await doc.embedFont(await readFile(VENDOR_FONT('NotoSansSC-400Regular.ttf')), { subset: true });
  const jp = await doc.embedFont(await readFile(VENDOR_FONT('NotoSansJP-400Regular.ttf')), { subset: true });
  const zhLines = ['中文测试文档：这一页用于验证文字提取与转换。', '标点：，。、；：「」《》——…… ％＃＠', '数字与英文混排：ShyPDF 2026 年第 3 季度报告。'];
  const jaLines = ['日本語のテストページ：テキスト抽出の確認用です。', '記号：、。「」・ー〜％＆', '英数字の混在：ShyPDF 2026年 第3四半期レポート。'];
  [['简体中文', sc, zhLines], ['日本語', jp, jaLines]].forEach(([title, font, lines]) => {
    const p = doc.addPage(A4);
    p.drawText(title, { x: 56, y: 760, size: 24, font });
    lines.forEach((l, i) => p.drawText(l, { x: 56, y: 700 - i * 30, size: 14, font }));
  });
  await save('pdf/cjk-text-2p.pdf', await doc.save(), '中 / 日 文字层：提取文字、转 Word、加中文页码格式');
}
{ // 图片很多的大文件（压缩 / 转图片 / 性能）
  const doc = await PDFDocument.create();
  for (let i = 0; i < 12; i++) {
    const img = await doc.embedJpg(photo(1700, 2400, i + 31).toBuffer('image/jpeg', 78));
    const p = doc.addPage(A4);
    p.drawImage(img, { x: 0, y: 0, width: A4[0], height: A4[1] });
  }
  const bytes = await doc.save();
  await save('pdf/photos-12p.pdf', bytes, `12 页整页照片（${mb(bytes.length)}）：压缩 / 转 JPG / 进度条`);
}
{ // 扫描件（无文字层）
  await save('pdf/scanned-en-2p.pdf', await (await scanPdf([scans.en, scans.es])).save(), '扫描件（英 + 西）：OCR、PDF 转文字应为空');
  await save('pdf/scanned-ja.pdf', await (await scanPdf([scans.ja])).save(), '日文扫描件：OCR 选日本語');
  await save('pdf/scanned-zh.pdf', await (await scanPdf([scans.zh])).save(), '中文扫描件：OCR 选简体中文');
  await save('pdf/scanned-de.pdf', await (await scanPdf([scans.de])).save(), '德文扫描件：OCR 选 Deutsch');
}
{ // 文字页 + 扫描页混排：测 OCR 的「跳过已有文字的页」
  const doc = await PDFDocument.create();
  const src = await PDFDocument.load(await (await latinPdf({ pages: 1, title: 'This page already has text', body: LOREM })).save());
  const [p1] = await doc.copyPages(src, [0]);
  doc.addPage(p1);
  const img = await doc.embedJpg(scans.en.toBuffer('image/jpeg', 82));
  const p2 = doc.addPage([595.28, (img.height / img.width) * 595.28]);
  p2.drawImage(img, { x: 0, y: 0, width: p2.getWidth(), height: p2.getHeight() });
  await save('pdf/mixed-text-and-scan-2p.pdf', await doc.save(), '第 1 页有文字、第 2 页是扫描图：OCR「跳过已有文字」');
}
{ // AcroForm 表单
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const form = doc.getForm();
  const page = doc.addPage(A4);
  const label = (text, y) => page.drawText(text, { x: 56, y, size: 11, font });
  page.drawText('Membership application', { x: 56, y: 780, size: 20, font: bold });
  label('Full name', 740); const name = form.createTextField('applicant.name'); name.setText(''); name.addToPage(page, { x: 56, y: 710, width: 300, height: 24, font });
  label('Member code (max 6)', 675); const code = form.createTextField('applicant.code'); code.setMaxLength(6); code.addToPage(page, { x: 56, y: 645, width: 120, height: 24, font });
  label('Notes', 610); const notes = form.createTextField('applicant.notes'); notes.enableMultiline(); notes.addToPage(page, { x: 56, y: 520, width: 420, height: 80, font });
  const terms = form.createCheckBox('terms.accepted'); terms.addToPage(page, { x: 56, y: 480, width: 16, height: 16 });
  page.drawText('I accept the terms', { x: 80, y: 482, size: 11, font });
  label('Plan', 450);
  const plan = form.createRadioGroup('plan');
  plan.addOptionToPage('Monthly', page, { x: 56, y: 420, width: 16, height: 16 });
  plan.addOptionToPage('Yearly', page, { x: 156, y: 420, width: 16, height: 16 });
  page.drawText('Monthly', { x: 80, y: 422, size: 11, font }); page.drawText('Yearly', { x: 180, y: 422, size: 11, font });
  label('Country', 390); const country = form.createDropdown('country'); country.addOptions(['Japan', 'Spain', 'Brazil', 'Germany']); country.select('Spain'); country.addToPage(page, { x: 56, y: 360, width: 180, height: 24, font });
  label('Invoice id (read only)', 325); const ro = form.createTextField('invoice.id'); ro.setText('INV-2026-001'); ro.enableReadOnly(); ro.addToPage(page, { x: 56, y: 295, width: 180, height: 24, font });
  doc.addPage(A4).drawText('Second page: no fields here.', { x: 56, y: 760, size: 14, font });
  await save('pdf/form-acroform.pdf', await doc.save(), '文本 / 多行 / 长度上限 / 复选 / 单选 / 下拉 / 只读域：填表单');
}

// ---------- 加密 PDF ----------
{
  const plain = Buffer.from(await (await latinPdf({ pages: 3, title: 'Confidential', body: LOREM })).save());
  await save('pdf/encrypted-user-pw-open123.pdf', await qpdf(plain, ['--encrypt', 'open123', 'ownerXYZ', '256', '--print=none', '--modify=none', '--extract=n', '--', 'in.pdf', 'out.pdf']), '打开密码 open123（所有者 ownerXYZ）：解锁 / 其它工具应提示需要密码');
  await save('pdf/encrypted-owner-only.pdf', await qpdf(plain, ['--encrypt', '', 'ownerXYZ', '256', '--print=none', '--modify=none', '--extract=n', '--', 'in.pdf', 'out.pdf']), '无打开密码、只有权限限制：解锁工具应直接去限制');
  await save('pdf/encrypted-rc4-128-open123.pdf', await qpdf(plain, ['--allow-weak-crypto', '--encrypt', 'open123', 'ownerXYZ', '128', '--use-aes=n', '--', 'in.pdf', 'out.pdf']), '老式 RC4-128 加密：兼容性');
}

// ---------- 坏文件 / 边界 ----------
{
  const good = Buffer.from(await (await latinPdf({ pages: 4, title: 'Damaged source', body: LOREM })).save());
  // 老式结构（没有对象流 / 交叉引用流），坏 xref 的经典情形
  const classic = Buffer.from(await (await latinPdf({ pages: 4, title: 'Classic damaged', body: LOREM })).save({ useObjectStreams: false }));
  /** 只改 startxref 后面的偏移数字，%%EOF 原样保留（真实世界最常见的坏法） */
  const breakXref = (buf) => {
    const i = buf.lastIndexOf(Buffer.from('startxref'));
    const numStart = i + 'startxref'.length + 1;
    let numEnd = numStart;
    while (buf[numEnd] >= 0x30 && buf[numEnd] <= 0x39) numEnd++;
    const out = Buffer.from(buf);
    const wrong = String(9_000_000 + (numEnd - numStart)).slice(0, numEnd - numStart).padEnd(numEnd - numStart, '9');
    out.write(wrong, numStart, 'latin1');
    return out;
  };
  await save('bad/broken-xref.pdf', breakXref(good), 'xref 偏移写错、%%EOF 完好（对象流结构）：修复工具应能救回 4 页');
  await save('bad/broken-xref-classic.pdf', breakXref(classic), 'xref 偏移写错的老式结构 PDF：最经典的可修复情形');
  await save('bad/truncated.pdf', good.subarray(0, Math.floor(good.length * 0.72)), '被截断的 PDF：能救回部分页、或给出清楚的失败提示');
  const noEof = Buffer.from(good); // 去掉 %%EOF
  await save('bad/no-eof.pdf', noEof.subarray(0, noEof.lastIndexOf(Buffer.from('%%EOF'))), '缺少 %%EOF');
  await save('bad/junk-prefix.pdf', Buffer.concat([Buffer.alloc(600, 0x23), Buffer.from('\n'), good]), '文件头前多了 600 B 垃圾（仍在 PDF 规范的 1 KB 搜索窗内）：应能修');
  await save('bad/junk-prefix-2k.pdf', Buffer.concat([Buffer.alloc(2048, 0x23), Buffer.from('\n'), good]), '文件头前多了 2 KB 垃圾（超出 1 KB 搜索窗）：预期修不了，看提示是否清楚');
  await save('bad/not-a-pdf.pdf', Buffer.from('This is just text pretending to be a PDF.\n'), '假 PDF：应提示文件无法打开，且不发报错邮件');
  await save('bad/empty.pdf', Buffer.alloc(0), '0 字节 PDF');
  await save('bad/not-an-image.jpg', Buffer.from('not really a jpeg\n'), '假 JPG：图片转 PDF 的错误路径');
  await save('bad/legacy.doc', Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]), '老式 .doc：Word 转 PDF 应提示只支持 .docx');
  // 超过 50 MB 上限：正文之后补注释填充，解析前就会被拦下
  const pad = Buffer.alloc(52 * 1024 * 1024, 0x41);
  await save('bad/oversize-53mb.pdf', Buffer.concat([good, Buffer.from('\n%'), pad, Buffer.from('\n')]), '约 53 MB：应提示超过 50 MB 上限');
  await save('bad/名前に空白 and ünïcödé.pdf', good, '文件名带空格 / 非 ASCII：输出文件名和下载');
}

// ---------- DOCX ----------
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const par = (text, pPr = '', rPr = '') => `<w:p><w:pPr>${pPr}</w:pPr><w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
const cell = (text, tcPr = '') => `<w:tc><w:tcPr>${tcPr}</w:tcPr>${par(text)}</w:tc>`;
const LONG = 'ShyPDF lays out every paragraph itself, so this sentence is long enough to wrap onto a second and even a third line of the page. ';

async function richDocx() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/></Types>`);
  zip.file('_rels/.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLink" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://shypdf.com/" TargetMode="External"/><Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/><Relationship Id="rIdHdr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>`);
  zip.file('word/media/image1.png', photo(900, 500, 41, false).toBuffer('image/png'));
  zip.file('word/styles.xml', `<w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
    <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="2E74B5"/><w:sz w:val="32"/></w:rPr></w:style>
    <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="1F4E79"/><w:sz w:val="26"/></w:rPr></w:style>
    <w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style></w:styles>`);
  zip.file('word/numbering.xml', `<w:numbering ${W}><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>`);
  zip.file('word/header1.xml', `<w:hdr ${W}><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t xml:space="preserve">Page </w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>9</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:t xml:space="preserve"> of </w:t></w:r><w:fldSimple w:instr=" NUMPAGES "><w:r><w:t>9</w:t></w:r></w:fldSimple></w:p></w:hdr>`);
  const border = '<w:top w:val="single" w:sz="4" w:color="000000"/><w:left w:val="single" w:sz="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:color="000000"/><w:right w:val="single" w:sz="4" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:color="000000"/>';
  const drawing = `<w:drawing><wp:inline><wp:extent cx="2857500" cy="1587500"/><wp:docPr id="1" name="P"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:blipFill><a:blip r:embed="rIdImg"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
  zip.file('word/document.xml', `<w:document ${W}><w:body>
    ${par('Quarterly Report', '<w:pStyle w:val="Heading1"/>')}
    ${par(LONG + LONG + LONG, '<w:jc w:val="both"/>')}
    ${par('Accents and symbols: café, Grüße, ação, ¿qué?, № 5, © 2026.')}
    <w:p><w:r><w:t xml:space="preserve">Visit </w:t></w:r><w:hyperlink r:id="rIdLink"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>our website</w:t></w:r></w:hyperlink><w:r><w:t xml:space="preserve"> for </w:t></w:r><w:r><w:rPr><w:b/><w:i/></w:rPr><w:t>details</w:t></w:r><w:r><w:t>.</w:t></w:r></w:p>
    ${par('Numbered steps', '<w:pStyle w:val="Heading2"/>')}
    ${par('First step', '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>')}
    ${par('Second step', '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>')}
    ${par('A bullet', '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr>')}
    <w:p><w:pPr><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9000"/></w:tabs></w:pPr><w:r><w:t>Chapter one</w:t></w:r><w:r><w:tab/><w:t>12</w:t></w:r></w:p>
    <w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${border}</w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>
      <w:tr>${cell('Item', '<w:shd w:val="clear" w:fill="D9E2F3"/>')}${cell('Quantity', '<w:shd w:val="clear" w:fill="D9E2F3"/>')}${cell('Price', '<w:shd w:val="clear" w:fill="D9E2F3"/>')}</w:tr>
      <w:tr>${cell('Widget')}${cell('4')}${cell('19.90')}</w:tr>
      <w:tr>${cell('Merged across two columns', '<w:gridSpan w:val="2"/>')}${cell('80.10')}</w:tr></w:tbl>
    <w:p><w:r>${drawing}</w:r></w:p>
    ${par('日本語の段落です。フォントは自動で切り替わります。')}
    ${par('中文段落：字体应自动切换，不能出现方块。')}
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    ${par('Second page heading', '<w:pStyle w:val="Heading1"/>')}
    ${par('The end.')}
    <w:sectPr><w:headerReference w:type="default" r:id="rIdHdr"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708"/></w:sectPr>
  </w:body></w:document>`);
  return zip.generateAsync({ type: 'uint8array' });
}
await save('office/report-rich.docx', await richDocx(), '标题 / 列表 / 表格 / 图片 / 链接 / 页眉 / 中日文段落：Word 转 PDF');
{
  const zip = new JSZip();
  zip.file('mimetype', 'application/zip');
  zip.file('readme.txt', 'A zip that is not a docx.');
  await save('bad/broken.docx', await zip.generateAsync({ type: 'uint8array' }), '是 zip 但没有 word/document.xml：应给出清楚的失败提示');
}

// ---------- 清单 ----------
const byDir = {};
for (const m of manifest) (byDir[path.dirname(m.rel)] ??= []).push(m);
const readme = ['# 验收测试素材（自动生成）', '',
  '由 `node scripts/make-fixtures.mjs` 生成，可随时重跑；不要手工改这个目录。',
  '测试步骤见 `test/ACCEPTANCE.md`。', '',
  ...Object.entries(byDir).flatMap(([dir, items]) => [`## ${dir}/`, '', '| 文件 | 大小 | 用途 |', '| --- | --- | --- |',
    ...items.map((i) => `| \`${path.basename(i.rel)}\` | ${mb(i.size)} | ${i.note} |`), '']),
].join('\n');
await writeFile(path.join(OUT, 'README.md'), readme);

const total = manifest.reduce((s, m) => s + m.size, 0);
console.log(manifest.map((m) => `${m.rel.padEnd(42)} ${mb(m.size).padStart(9)}`).join('\n'));
console.log(`\n${manifest.length} files, ${mb(total)} → ${OUT}`);
