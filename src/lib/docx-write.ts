// 最小的 .docx 写入器：把 lib/pdf-layout.ts 分析出的页面模型写成 WordprocessingML，用 JSZip 打包。
// 只写用得到的部分（段落、run、无边框表格、内嵌图片、标题样式、页面尺寸），不引入整套 docx 库。
// 单位：Word 的长度是 twip（1/20 pt），字号是半磅，图片是 EMU（1 pt = 12700）。
import type { PageModel, Block, ParaBlock, TableBlock, ImageBlock, Run, Align } from './pdf-layout';

export interface DocxImage { bytes: Uint8Array; type: 'png' | 'jpeg'; }

const tw = (pt: number) => Math.round(pt * 20);
const emu = (pt: number) => Math.round(pt * 12700);
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
// XML 1.0 不允许的控制字符直接丢掉（PDF 里偶尔会有）
const esc = (s: string) => s.replace(/[^\t\n\r\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

function runXml(r: Run): string {
  const f = esc(r.style.family), half = Math.round(r.style.size * 2);
  const rPr = `<w:rPr><w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:cs="${f}"/>${r.style.bold ? '<w:b/><w:bCs/>' : ''}${r.style.italic ? '<w:i/><w:iCs/>' : ''}<w:sz w:val="${half}"/><w:szCs w:val="${half}"/></w:rPr>`;
  const body = r.text.split('\t').map((part, i) => (i ? '<w:tab/>' : '') + (part ? `<w:t xml:space="preserve">${esc(part)}</w:t>` : '')).join('');
  return `<w:r>${rPr}${body}</w:r>`;
}

interface ParaExtras { pageBreak?: boolean; sectPr?: string; extraBefore?: number; }

function paraXml(p: ParaBlock, x: ParaExtras = {}): string {
  const before = tw(p.spaceBefore + (x.extraBefore ?? 0));
  // auto 行距的 240 = 字体自身的单倍行高（约 1.2 × 字号）；略往紧里取，免得一页的内容在 Word 里溢出到下一页
  const line = p.leading ? clamp(Math.round((240 * p.leading) / 1.2), 216, 720) : 240;
  const ind = p.indent > 1 || Math.abs(p.firstLine) > 1
    ? `<w:ind w:left="${tw(Math.max(0, p.indent))}"${p.firstLine > 1 ? ` w:firstLine="${tw(p.firstLine)}"` : p.firstLine < -1 ? ` w:hanging="${tw(Math.min(-p.firstLine, p.indent))}"` : ''}/>` : '';
  const pPr = `<w:pPr>${p.heading ? `<w:pStyle w:val="Heading${p.heading}"/>` : ''}${x.pageBreak ? '<w:pageBreakBefore/>' : ''}<w:spacing w:before="${before}" w:after="0" w:line="${line}" w:lineRule="auto"/>${ind}${p.align !== 'left' ? `<w:jc w:val="${p.align}"/>` : ''}${x.sectPr ?? ''}</w:pPr>`;
  return `<w:p>${pPr}${p.runs.map(runXml).join('')}</w:p>`;
}

const emptyPara = (x: ParaExtras = {}, before = 0) =>
  `<w:p><w:pPr>${x.pageBreak ? '<w:pageBreakBefore/>' : ''}<w:spacing w:before="${tw(before)}" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr>${x.sectPr ?? ''}</w:pPr></w:p>`; // pPr 的子元素顺序是 schema 规定的，Word 会校验

function cellPara(runs: Run[], align: Align) {
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/>${align !== 'left' ? `<w:jc w:val="${align}"/>` : ''}</w:pPr>${runs.map(runXml).join('')}</w:p>`;
}

function tableXml(t: TableBlock): string {
  const grid = t.widths.map((w) => `<w:gridCol w:w="${tw(w)}"/>`).join('');
  const rows = t.rows.map((row) => `<w:tr>${row.map((c, i) => `<w:tc><w:tcPr><w:tcW w:w="${tw(t.widths[i])}" w:type="dxa"/></w:tcPr>${cellPara(c.runs, c.align)}</w:tc>`).join('')}</w:tr>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${tw(t.widths.reduce((a, b) => a + b, 0))}" w:type="dxa"/><w:tblInd w:w="${tw(Math.max(0, t.x0))}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="40" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows}</w:tbl>`;
}

function imageXml(im: ImageBlock, relId: string, n: number, maxWidth: number, x: ParaExtras): string {
  const k = Math.min(1, maxWidth / im.width);
  const cx = emu(im.width * k), cy = emu(im.height * k);
  const drawing = `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Picture ${n}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="Picture ${n}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
  return `<w:p><w:pPr>${x.pageBreak ? '<w:pageBreakBefore/>' : ''}<w:spacing w:before="${tw(im.spaceBefore + (x.extraBefore ?? 0))}" w:after="0"/>${im.align !== 'left' ? `<w:jc w:val="${im.align}"/>` : ''}${x.sectPr ?? ''}</w:pPr><w:r>${drawing}</w:r></w:p>`;
}

interface Margins { left: number; right: number; top: number; bottom: number; }

/** 页边距从内容的包围盒反推；右边和下边留一点余量，Word 的排版和原 PDF 差一两个点时不至于多折一行、多出一页 */
function marginsOf(pages: PageModel[]): Margins {
  const withContent = pages.filter((p) => p.bounds);
  if (!withContent.length) return { left: 72, right: 72, top: 72, bottom: 72 };
  const min = (f: (p: PageModel) => number) => Math.min(...withContent.map(f));
  const W = (p: PageModel) => p.width, H = (p: PageModel) => p.height;
  return {
    left: clamp(min((p) => p.bounds!.x0), 18, min(W) * 0.3),
    right: clamp(min((p) => p.width - p.bounds!.x1) - 6, 18, min(W) * 0.3),
    top: clamp(min((p) => p.bounds!.y0) - 2, 18, min(H) * 0.3),
    bottom: clamp(min((p) => p.height - p.bounds!.y1) * 0.5, 14, 72),
  };
}

const sectXml = (p: { width: number; height: number }, m: Margins) =>
  `<w:sectPr><w:pgSz w:w="${tw(p.width)}" w:h="${tw(p.height)}"${p.width > p.height ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="${tw(m.top)}" w:right="${tw(m.right)}" w:bottom="${tw(m.bottom)}" w:left="${tw(m.left)}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;

export function documentXml(pages: PageModel[], imageRelIds: (string | null)[]): string {
  const uniform = pages.every((p) => Math.abs(p.width - pages[0].width) < 1 && Math.abs(p.height - pages[0].height) < 1);
  const shared = marginsOf(pages);
  let body = '', pic = 0;
  pages.forEach((page, pi) => {
    // 页面尺寸不一致时每页一节：节属性挂在该节最后一个段落上（最后一节的挂在 body 末尾）
    const m = uniform ? shared : marginsOf([page]);
    const last = pi === pages.length - 1;
    const sectPr = !uniform && !last ? sectXml(page, m) : undefined;
    const pageBreak = uniform && pi > 0;
    const offset = page.bounds ? Math.max(0, page.bounds.y0 - 2 - m.top) : 0;
    const maxWidth = page.width - m.left - m.right;
    const blocks: Block[] = page.blocks.filter((b) => b.type !== 'image' || imageRelIds[b.index]);
    if (!blocks.length) { body += emptyPara({ pageBreak, sectPr }); return; }
    blocks.forEach((b, bi) => {
      const first = bi === 0, final = bi === blocks.length - 1;
      const x: ParaExtras = { pageBreak: pageBreak && first, extraBefore: first ? offset : 0, sectPr: final ? sectPr : undefined };
      if (b.type === 'table') {
        // 表格不能带分页 / 分节属性，也不能紧挨着另一个表格：用一个几乎不占高度的空段落来承载
        if (x.pageBreak || b.spaceBefore + (x.extraBefore ?? 0) > 1 || blocks[bi - 1]?.type === 'table') body += emptyPara({ pageBreak: x.pageBreak }, b.spaceBefore + (x.extraBefore ?? 0));
        body += tableXml(b);
        if (final) body += emptyPara({ sectPr });
      } else if (b.type === 'image') body += imageXml(b, imageRelIds[b.index]!, ++pic, maxWidth, x);
      else body += paraXml(b, x);
    });
  });
  const lastPage = pages[pages.length - 1];
  body += sectXml(lastPage, uniform ? shared : marginsOf([lastPage]));
  return `${XML}<w:document ${NS}><w:body>${body}</w:body></w:document>`;
}

const STYLES = `${XML}<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`
  + `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>`
  + [1, 2, 3].map((n) => `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="${n - 1}"/></w:pPr></w:style>`).join('')
  + `</w:styles>`;

export async function writeDocx(pages: PageModel[], images: (DocxImage | null)[]): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const relIds = images.map((im, i) => (im ? `rId${i + 10}` : null));
  const rels = images.map((im, i) => (im ? `<Relationship Id="${relIds[i]}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${i + 1}.${im.type}"/>` : '')).join('');
  zip.file('[Content_Types].xml', `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
  zip.file('_rels/.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${rels}</Relationships>`);
  zip.file('word/styles.xml', STYLES);
  zip.file('word/document.xml', documentXml(pages, relIds));
  images.forEach((im, i) => { if (im) zip.file(`word/media/image${i + 1}.${im.type}`, im.bytes); });
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
}
