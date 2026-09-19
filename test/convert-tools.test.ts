// 二期工具的 Node 冒烟测试：Word → PDF、PDF → Word、签名、OCR 文字层。
// 浏览器专属的部分（canvas 渲染、拖放界面）测不到；这里测的是排版 / 解析 / 写文件这些核心逻辑。
import './_node-env';
import { createRequire } from 'node:module';
import JSZip from 'jszip';
import { PDFDocument, PDFName, PDFDict, degrees } from 'pdf-lib';
import wordToPdf from '@/tools/word-to-pdf';
import pdfToWord from '@/tools/pdf-to-word';
import signPdf from '@/tools/sign-pdf';
import { createOcrEngine, addTextLayer, tidyOcrText } from '@/lib/ocr';
import { getPdfjs } from '@/lib/pdfjs';

const require = createRequire(import.meta.url);
const { createCanvas } = require('@napi-rs/canvas');
const ctx = { progress: () => {} };
const assert = (c: boolean, m: string) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); return f; };

async function pageTexts(blob: Blob): Promise<string[]> {
  const pdfjs = await getPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) out.push((await (await doc.getPage(i)).getTextContent()).items.map((it: any) => it.str ?? '').join(' '));
  await doc.loadingTask.destroy();
  return out;
}

function textPng(lines: string[], w = 1240, h = 500): Uint8Array {
  const c = createCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#000'; g.font = '40px Helvetica';
  lines.forEach((l, i) => g.fillText(l, 60, 110 + i * 90));
  return new Uint8Array(c.toBuffer('image/png'));
}

// ---------- 手工拼一个有代表性的 .docx ----------
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const p = (text: string, pPr = '', rPr = '') => `<w:p><w:pPr>${pPr}</w:pPr><w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
const cell = (text: string, tcPr = '') => `<w:tc><w:tcPr>${tcPr}</w:tcPr>${p(text)}</w:tc>`;
const LOREM = 'ShyPDF lays out every paragraph itself, so this sentence is here to be long enough to wrap onto a second line of the page. ';

async function makeDocx(): Promise<File> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/></Types>`);
  zip.file('_rels/.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLink" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://shypdf.com/" TargetMode="External"/><Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/><Relationship Id="rIdHdr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>`);
  zip.file('word/media/image1.png', textPng(['PICTURE'], 400, 160));
  zip.file('word/styles.xml', `<w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
    <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="2E74B5"/><w:sz w:val="32"/></w:rPr></w:style>
    <w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style></w:styles>`);
  zip.file('word/numbering.xml', `<w:numbering ${W}><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`);
  zip.file('word/header1.xml', `<w:hdr ${W}><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t xml:space="preserve">Page </w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>9</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:t xml:space="preserve"> of </w:t></w:r><w:fldSimple w:instr=" NUMPAGES "><w:r><w:t>9</w:t></w:r></w:fldSimple></w:p></w:hdr>`);
  const border = '<w:top w:val="single" w:sz="4" w:color="000000"/><w:left w:val="single" w:sz="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:color="000000"/><w:right w:val="single" w:sz="4" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:color="000000"/>';
  const drawing = `<w:drawing><wp:inline><wp:extent cx="1905000" cy="762000"/><wp:docPr id="1" name="P"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:blipFill><a:blip r:embed="rIdImg"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
  zip.file('word/document.xml', `<w:document ${W}><w:body>
    ${p('Quarterly Report', '<w:pStyle w:val="Heading1"/>')}
    ${p(LOREM + LOREM + LOREM, '<w:jc w:val="both"/>')}
    <w:p><w:r><w:t xml:space="preserve">Visit </w:t></w:r><w:hyperlink r:id="rIdLink"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>our website</w:t></w:r></w:hyperlink><w:r><w:t xml:space="preserve"> for </w:t></w:r><w:r><w:rPr><w:b/><w:i/></w:rPr><w:t>details</w:t></w:r><w:r><w:t>.</w:t></w:r></w:p>
    ${p('First step', '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>')}
    ${p('Second step', '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>')}
    <w:p><w:pPr><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9000"/></w:tabs></w:pPr><w:r><w:t>Chapter one</w:t></w:r><w:r><w:tab/><w:t>12</w:t></w:r></w:p>
    <w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${border}</w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>
      <w:tr>${cell('Item', '<w:shd w:val="clear" w:fill="D9E2F3"/>')}${cell('Quantity', '<w:shd w:val="clear" w:fill="D9E2F3"/>')}${cell('Price', '<w:shd w:val="clear" w:fill="D9E2F3"/>')}</w:tr>
      <w:tr>${cell('Widget')}${cell('4')}${cell('19.90')}</w:tr>
      <w:tr>${cell('Merged across two columns', '<w:gridSpan w:val="2"/>')}${cell('80.10')}</w:tr></w:tbl>
    <w:p><w:r>${drawing}</w:r></w:p>
    ${p('日本語の段落です。フォントは自動で切り替わります。')}
    <w:p><w:r><w:br w:type="page"/></w:r></w:p>
    ${p('Second page heading', '<w:pStyle w:val="Heading1"/>')}
    ${p('The end.')}
    <w:sectPr><w:headerReference w:type="default" r:id="rIdHdr"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708"/></w:sectPr>
  </w:body></w:document>`);
  return new File([await zip.generateAsync({ type: 'uint8array' })], 'report.docx');
}

// ---------- Word → PDF ----------
const docx = await makeDocx();
let out = await wordToPdf.run([docx], fd({}), ctx);
assert(out[0].name === 'report.pdf' && out[0].blob.type === 'application/pdf', 'word→pdf: report.pdf');
const pdfBlob = out[0].blob;
{
  const d = await PDFDocument.load(await pdfBlob.arrayBuffer());
  assert(d.getPageCount() === 2, 'word→pdf: page break gives 2 pages');
  const { width, height } = d.getPage(0).getSize();
  assert(Math.abs(width - 595.3) < 0.1 && Math.abs(height - 841.9) < 0.1, 'word→pdf: A4 page size from sectPr');
  const annots = d.getPage(0).node.Annots();
  const uri = annots && ((annots.lookup(0, PDFDict).lookup(PDFName.of('A'), PDFDict).get(PDFName.of('URI')) as any)?.decodeText?.() ?? '');
  assert(uri === 'https://shypdf.com/', 'word→pdf: hyperlink annotation');
  const xobjects = d.getPage(0).node.Resources()?.lookup(PDFName.of('XObject'), PDFDict);
  assert(!!xobjects && xobjects.keys().length === 1, 'word→pdf: picture embedded');
}
{
  const [p1, p2] = await pageTexts(pdfBlob);
  assert(p1.includes('Quarterly Report') && p1.includes('our website') && p1.includes('details'), 'word→pdf: text is real text');
  assert(p1.includes('1.') && p1.includes('First step') && p1.includes('2.') && p1.includes('Second step'), 'word→pdf: list numbering');
  assert(/Chapter one\s*\.{10,}\s*12/.test(p1), 'word→pdf: right tab with dot leader');
  assert(p1.includes('Merged across two columns') && p1.includes('80.10'), 'word→pdf: table cells');
  assert(p1.replace(/\s/g, '').includes('日本語の段落です'), 'word→pdf: Japanese via fallback font');
  assert(p1.includes('Page 1 of 2') && p2.includes('Page 2 of 2'), 'word→pdf: header with PAGE / NUMPAGES fields');
  assert(p2.includes('Second page heading'), 'word→pdf: content after the page break');
}
let threw = '';
try { await wordToPdf.run([new File([new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0])], 'old.doc')], fd({}), ctx); } catch (e) { threw = (e as Error).message; }
assert(threw.includes('.docx'), 'word→pdf: legacy .doc rejected with a useful message');

// ---------- PDF → Word ----------
out = await pdfToWord.run([new File([pdfBlob], 'report.pdf', { type: 'application/pdf' })], fd({ images: 'on' }), ctx);
assert(out[0].name === 'report.docx', 'pdf→word: report.docx');
{
  const zip = await JSZip.loadAsync(await out[0].blob.arrayBuffer());
  const xml = await zip.file('word/document.xml')!.async('string');
  const text = xml.replace(/<[^>]+>/g, '');
  assert(text.includes('Quarterly Report') && text.includes('The end.'), 'pdf→word: text carried over');
  assert(/<w:pStyle w:val="Heading1"\/>/.test(xml), 'pdf→word: large text becomes a heading');
  assert((xml.match(/<w:jc w:val="both"\/>/g) ?? []).length >= 1, 'pdf→word: justified paragraph detected');
  assert(text.includes('wrap onto a second line of the page. ShyPDF lays out'), 'pdf→word: wrapped lines rejoined into one paragraph');
  const table = /<w:tbl>.*<\/w:tbl>/s.exec(xml)?.[0] ?? '';
  assert((table.match(/<w:tr>/g) ?? []).length === 3 && (table.match(/<w:gridCol /g) ?? []).length === 3 && table.includes('Widget') && table.includes('80.10'), 'pdf→word: 3 × 3 table rebuilt');
  assert((xml.match(/<w:pageBreakBefore\/>/g) ?? []).length === 1, 'pdf→word: one page break for two pages');
  // 自己写的 docx 自己要能读回来
  const back = await wordToPdf.run([new File([out[0].blob], 'roundtrip.docx')], fd({}), ctx);
  assert((await PDFDocument.load(await back[0].blob.arrayBuffer())).getPageCount() === 2, 'pdf→word→pdf: still 2 pages');
}
{
  const scan = await PDFDocument.create();
  scan.addPage([300, 300]);
  threw = '';
  try { await pdfToWord.run([new File([await scan.save()], 'scan.pdf')], fd({}), ctx); } catch (e) { threw = (e as Error).message; }
  assert(threw.includes('OCR'), 'pdf→word: PDF without text points the user to OCR');
}

// ---------- Sign ----------
{
  const src = await PDFDocument.create();
  src.addPage([400, 600]); src.addPage([400, 600]).setRotation(degrees(90));
  const file = new File([await src.save()], 'contract.pdf');
  const sig = 'data:image/png;base64,' + Buffer.from(textPng(['Jane Doe'], 300, 120)).toString('base64');
  out = await signPdf.run([file], fd({ sigData: sig, place: JSON.stringify({ page: 1, x: 0.5, y: 0.8, w: 0.3 }) }), ctx);
  const d = await PDFDocument.load(await out[0].blob.arrayBuffer());
  const images = (i: number) => d.getPage(i).node.Resources()?.lookup(PDFName.of('XObject'))?.constructor === PDFDict ? (d.getPage(i).node.Resources()!.lookup(PDFName.of('XObject'), PDFDict)).keys().length : 0;
  assert(out[0].name === 'contract_signed.pdf' && images(0) === 0 && images(1) === 1, 'sign: signature only on the chosen page');
  out = await signPdf.run([file], fd({ sigData: sig, place: JSON.stringify({ page: 0, x: 0.1, y: 0.1, w: 0.3 }), allPages: 'on' }), ctx);
  const all = await PDFDocument.load(await out[0].blob.arrayBuffer());
  assert(all.getPages().every((pg) => (pg.node.Resources()!.lookup(PDFName.of('XObject'), PDFDict)).keys().length === 1), 'sign: every page when asked');
  threw = '';
  try { await signPdf.run([file], fd({ sigData: '', place: '' }), ctx); } catch (e) { threw = (e as Error).message; }
  assert(threw.includes('signature'), 'sign: asks for a signature first');
}

// ---------- OCR 文字层 ----------
{
  const png = textPng(['Invoice number 20417', 'Total amount due: 1,250.00 EUR']);
  const scan = await PDFDocument.create();
  const img = await scan.embedPng(png);
  for (const rot of [0, 90]) {
    // 旋转 90° 的页：MediaBox 是竖的，图片横着画进去，看起来才是正的
    const page = rot ? scan.addPage([240, 595]) : scan.addPage([595, 240]);
    if (rot) { page.drawImage(img, { x: 240, y: 0, width: 595, height: 240, rotate: degrees(90) }); page.setRotation(degrees(90)); }
    else page.drawImage(img, { x: 0, y: 0, width: 595, height: 240 });
  }
  const engine = await createOcrEngine(['eng'], 1, { workerOptions: { langPath: new URL('../public/vendor/tesseract/lang', import.meta.url).pathname, gzip: true, cacheMethod: 'none' } });
  try {
    const r = await engine.recognize(png, 150, true);
    assert(/Invoice number 20417/.test(r.text) && !!r.pdf, 'ocr: text recognized, text-only PDF layer produced');
    for (const page of scan.getPages()) await addTextLayer(scan, page, r.pdf!);
  } finally { await engine.terminate(); }
  const texts = await pageTexts(new Blob([await scan.save()]));
  assert(texts.every((tx) => tx.includes('Invoice') && tx.includes('1,250.00')), 'ocr: invisible text layer is searchable on upright and rotated pages');
  assert(tidyOcrText('日 本 語 の OCR test \n') === '日本語の OCR test', 'ocr: spaces between CJK characters removed');
}
console.log('ALL PASSED');
