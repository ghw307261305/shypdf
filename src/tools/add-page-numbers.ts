import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { stripExt } from '@/lib/files';
import { renderTextToPng } from '@/lib/textimage';
import { t, th } from '@/lib/i18n-client';

const FORMATS: Record<string, (n: number, total: number) => string> = {
  plain: (n) => `${n}`,
  slash: (n, total) => `${n} / ${total}`,
  dash: (n) => `- ${n} -`,
  page: (n) => t('add-page-numbers.fmtPage', { n }),
  pageTotal: (n, total) => t('add-page-numbers.fmtPageTotal', { n, total }),
};

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `
    <fieldset class="opt-group">
      <legend>${th('add-page-numbers.position')}</legend>
      <div class="pos-grid" role="radiogroup" aria-label="${th('add-page-numbers.positionLabel')}">
        <label><input type="radio" name="pos" value="tl"><span>${th('add-page-numbers.tl')}</span></label>
        <label><input type="radio" name="pos" value="tc"><span>${th('add-page-numbers.tc')}</span></label>
        <label><input type="radio" name="pos" value="tr"><span>${th('add-page-numbers.tr')}</span></label>
        <label><input type="radio" name="pos" value="bl"><span>${th('add-page-numbers.bl')}</span></label>
        <label><input type="radio" name="pos" value="bc" checked><span>${th('add-page-numbers.bc')}</span></label>
        <label><input type="radio" name="pos" value="br"><span>${th('add-page-numbers.br')}</span></label>
      </div>
    </fieldset>
    <div class="opt-group">
      <label for="opt-format">${th('add-page-numbers.format')}</label>
      <select id="opt-format" name="format">
        <option value="plain">1</option>
        <option value="slash">1 / 10</option>
        <option value="dash">- 1 -</option>
        <option value="page">${th('add-page-numbers.fmtPage', { n: 1 })}</option>
        <option value="pageTotal">${th('add-page-numbers.fmtPageTotal', { n: 1, total: 10 })}</option>
      </select>
    </div>
    <div class="opt-row">
      <div class="opt-group"><label for="opt-start">${th('add-page-numbers.firstNumber')}</label><input id="opt-start" name="start" type="number" value="1" min="0"></div>
      <div class="opt-group"><label for="opt-from">${th('add-page-numbers.startOn')}</label><input id="opt-from" name="from" type="number" value="1" min="1"></div>
    </div>
    <div class="opt-row">
      <div class="opt-group"><label for="opt-size">${th('opt.fontSize')}</label><input id="opt-size" name="size" type="number" value="11" min="6" max="48"></div>
      <div class="opt-group"><label for="opt-margin">${th('opt.margin')}</label><input id="opt-margin" name="margin" type="number" value="28" min="6" max="120"></div>
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

    for (let i = from - 1; i < pages.length; i++) {
      ctx.progress(t('add-page-numbers.numbering', { i: i + 1, n: pages.length }), i / pages.length);
      const page = pages[i];
      const text = fmt(start + (i - (from - 1)), start + total - 1);
      const { width, height } = page.getSize();
      let textW: number, textH: number;
      let draw: (x: number, y: number) => void;
      // 内置 Helvetica 只有 Latin-1 字符（够用于 Página / Seite）；其余文字（中文、日文…）经 canvas 转成图片
      if (/[^\x20-\x7e\xa0-\xff]/.test(text)) {
        const img = await renderTextToPng(text, { fontSizePx: size, color: '#000000' });
        const embedded = await doc.embedPng(img.png);
        textW = img.width; textH = img.height;
        draw = (x, y) => page.drawImage(embedded, { x, y, width: textW, height: textH });
      } else {
        textW = font.widthOfTextAtSize(text, size); textH = size;
        draw = (x, y) => page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
      }
      const x = pos.endsWith('l') ? margin : pos.endsWith('r') ? width - margin - textW : (width - textW) / 2;
      const y = pos.startsWith('t') ? height - margin - textH : margin;
      draw(x, y);
    }
    const bytes = await doc.save({ useObjectStreams: true });
    return [{ name: `${stripExt(file.name)}_numbered.pdf`, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
  },
};
export default mod;
