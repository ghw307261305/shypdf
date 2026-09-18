import type { ToolModule, OutputFile } from '@/lib/types';
import { openWithPdfjs, renderPage, canvasToBlob } from '@/lib/pdfjs';
import { stripExt, zipOutputs, parseRanges } from '@/lib/files';

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: `
    <fieldset class="opt-group">
      <legend>Format</legend>
      <div class="seg" role="radiogroup">
        <label><input type="radio" name="format" value="jpg" checked><span>JPG</span></label>
        <label><input type="radio" name="format" value="png"><span>PNG</span></label>
      </div>
    </fieldset>
    <fieldset class="opt-group">
      <legend>Resolution</legend>
      <label class="check"><input type="radio" name="dpi" value="96"> Web (96 dpi)</label>
      <label class="check"><input type="radio" name="dpi" value="150" checked> Standard (150 dpi)</label>
      <label class="check"><input type="radio" name="dpi" value="300"> High (300 dpi)</label>
    </fieldset>
    <div class="opt-group">
      <label for="opt-pages">Pages (leave empty for all)</label>
      <input id="opt-pages" name="pages" type="text" placeholder="e.g. 1-3, 5">
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
      ctx.progress(`Rendering page ${i + 1} (${k + 1}/${indices.length})`, k / indices.length);
      const canvas = await renderPage(doc, i, { scale: dpi / 72 });
      const blob = await canvasToBlob(canvas, fmt === 'png' ? 'image/png' : 'image/jpeg', 0.9);
      outputs.push({ name: `${base}_p${i + 1}.${fmt}`, blob });
      canvas.width = 0; canvas.height = 0;
    }
    await doc.loadingTask.destroy();
    if (outputs.length === 1) return outputs;
    ctx.progress('Zipping…', 0.98);
    return [await zipOutputs(outputs, `${base}_images.zip`)];
  },
};
export default mod;
