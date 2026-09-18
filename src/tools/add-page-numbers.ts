import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { stripExt } from '@/lib/files';
import { renderTextToPng } from '@/lib/textimage';

const FORMATS: Record<string, (n: number, total: number) => string> = {
  plain: (n) => `${n}`,
  slash: (n, t) => `${n} / ${t}`,
  dash: (n) => `- ${n} -`,
  page: (n) => `Page ${n}`,
  zh: (n) => `第 ${n} 页`,
  zhTotal: (n, t) => `第 ${n} 页，共 ${t} 页`,
};

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: `
    <fieldset class="opt-group">
      <legend>Position</legend>
      <div class="pos-grid" role="radiogroup" aria-label="Page number position">
        <label><input type="radio" name="pos" value="tl"><span>Top left</span></label>
        <label><input type="radio" name="pos" value="tc"><span>Top</span></label>
        <label><input type="radio" name="pos" value="tr"><span>Top right</span></label>
        <label><input type="radio" name="pos" value="bl"><span>Bottom left</span></label>
        <label><input type="radio" name="pos" value="bc" checked><span>Bottom</span></label>
        <label><input type="radio" name="pos" value="br"><span>Bottom right</span></label>
      </div>
    </fieldset>
    <div class="opt-group">
      <label for="opt-format">Format</label>
      <select id="opt-format" name="format">
        <option value="plain">1</option>
        <option value="slash">1 / 10</option>
        <option value="dash">- 1 -</option>
        <option value="page">Page 1</option>
        <option value="zh">第 1 页</option>
        <option value="zhTotal">第 1 页，共 10 页</option>
      </select>
    </div>
    <div class="opt-row">
      <div class="opt-group"><label for="opt-start">First number</label><input id="opt-start" name="start" type="number" value="1" min="0"></div>
      <div class="opt-group"><label for="opt-from">Start on page</label><input id="opt-from" name="from" type="number" value="1" min="1"></div>
    </div>
    <div class="opt-row">
      <div class="opt-group"><label for="opt-size">Font size</label><input id="opt-size" name="size" type="number" value="11" min="6" max="48"></div>
      <div class="opt-group"><label for="opt-margin">Margin (pt)</label><input id="opt-margin" name="margin" type="number" value="28" min="6" max="120"></div>
    </div>`,
  async run(files, options, ctx) {
    const file = files[0];
    const doc = await PDFDocument.load(await file.arrayBuffer());
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fmt = FORMATS[String(options.get('format'))] ?? FORMATS.plain;
    const pos = String(options.get('pos') || 'bc');
    const start = Number(options.get('start') ?? 1);
    const from = Math.max(1, Number(options.get('from') ?? 1));
    const size = Number(options.get('size') ?? 11);
    const margin = Number(options.get('margin') ?? 28);
    const pages = doc.getPages();
    const total = pages.length - (from - 1);
    const useCanvas = /^zh/.test(String(options.get('format')));

    for (let i = from - 1; i < pages.length; i++) {
      ctx.progress(`Numbering page ${i + 1} of ${pages.length}`, i / pages.length);
      const page = pages[i];
      const text = fmt(start + (i - (from - 1)), start + total - 1);
      const { width, height } = page.getSize();
      let tw: number, th: number;
      let draw: (x: number, y: number) => void;
      if (useCanvas) {
        const img = await renderTextToPng(text, { fontSizePx: size, color: '#000000' });
        const embedded = await doc.embedPng(img.png);
        tw = img.width; th = img.height;
        draw = (x, y) => page.drawImage(embedded, { x, y, width: tw, height: th });
      } else {
        tw = font.widthOfTextAtSize(text, size); th = size;
        draw = (x, y) => page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
      }
      const x = pos.endsWith('l') ? margin : pos.endsWith('r') ? width - margin - tw : (width - tw) / 2;
      const y = pos.startsWith('t') ? height - margin - th : margin;
      draw(x, y);
    }
    const bytes = await doc.save({ useObjectStreams: true });
    return [{ name: `${stripExt(file.name)}_numbered.pdf`, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
  },
};
export default mod;
