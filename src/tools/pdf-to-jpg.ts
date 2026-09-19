import type { ToolModule, OutputFile } from '@/lib/types';
import { openWithPdfjs, renderPage, canvasToBlob } from '@/lib/pdfjs';
import { stripExt, zipOutputs, parseRanges } from '@/lib/files';
import { t, th } from '@/lib/i18n-client';

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `
    <fieldset class="opt-group">
      <legend>${th('pdf-to-jpg.format')}</legend>
      <div class="seg" role="radiogroup">
        <label><input type="radio" name="format" value="jpg" checked><span>JPG</span></label>
        <label><input type="radio" name="format" value="png"><span>PNG</span></label>
      </div>
    </fieldset>
    <fieldset class="opt-group">
      <legend>${th('pdf-to-jpg.resolution')}</legend>
      <label class="check"><input type="radio" name="dpi" value="96"> ${th('pdf-to-jpg.web')}</label>
      <label class="check"><input type="radio" name="dpi" value="150" checked> ${th('pdf-to-jpg.standard')}</label>
      <label class="check"><input type="radio" name="dpi" value="300"> ${th('pdf-to-jpg.high')}</label>
    </fieldset>
    <div class="opt-group">
      <label for="opt-pages">${th('pdf-to-jpg.pages')}</label>
      <input id="opt-pages" name="pages" type="text" placeholder="${th('pdf-to-jpg.pagesPlaceholder')}">
    </div>`,
  async run(files, options, ctx) {
    const file = files[0];
    const fmt = options.get('format') === 'png' ? 'png' : 'jpg';
    const dpi = Number(options.get('dpi') ?? 150);
    const doc = await openWithPdfjs(file);
    const n = doc.numPages;
    let indices = Array.from({ length: n }, (_, i) => i);
    const rangeText = String(options.get('pages') || '').trim();
    if (rangeText) {
      indices = parseRanges(rangeText, n).flat();
    }
    const base = stripExt(file.name);
    const outputs: OutputFile[] = [];
    for (let k = 0; k < indices.length; k++) {
      const i = indices[k];
      ctx.progress(t('pdf-to-jpg.rendering', { page: i + 1, i: k + 1, n: indices.length }), k / indices.length);
      const canvas = await renderPage(doc, i, { scale: dpi / 72 });
      const blob = await canvasToBlob(canvas, fmt === 'png' ? 'image/png' : 'image/jpeg', 0.9);
      outputs.push({ name: `${base}_p${i + 1}.${fmt}`, blob });
      canvas.width = 0; canvas.height = 0;
    }
    await doc.loadingTask.destroy();
    if (outputs.length === 1) return outputs;
    ctx.progress(t('pdf-to-jpg.zipping'), 0.98);
    return [await zipOutputs(outputs, `${base}_images.zip`)];
  },
};
export default mod;
