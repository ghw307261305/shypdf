import { PDFDocument } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { openWithPdfjs, renderPage, canvasToBlob } from '@/lib/pdfjs';
import { stripExt, formatBytes } from '@/lib/files';

// summary() 拿不到选项，用它记住上一次 run 的模式
let lastMode: 'light' | 'strong' = 'light';
/** 压缩结果不比原文件小就原样返回 —— 不能把更大的文件当「压缩结果」交给用户 */
const keepSmaller = async (file: File, bytes: Uint8Array, name: string) =>
  [{ name, blob: bytes.length < file.size ? new Blob([bytes as BlobPart], { type: 'application/pdf' }) : new Blob([await file.arrayBuffer()], { type: 'application/pdf' }) }];

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: `
    <fieldset class="opt-group">
      <legend>Compression mode</legend>
      <label class="check"><input type="radio" name="mode" value="light" checked> Light — keeps text selectable and searchable, about 5–30% smaller</label>
      <label class="check"><input type="radio" name="mode" value="strong"> Strong — turns pages into images; smallest file, text no longer selectable</label>
    </fieldset>
    <fieldset class="opt-group" data-show-when="mode=strong">
      <legend>Image quality (Strong mode)</legend>
      <label class="check"><input type="radio" name="dpi" value="72"> Smallest (72 dpi, screen only)</label>
      <label class="check"><input type="radio" name="dpi" value="110" checked> Balanced (110 dpi)</label>
      <label class="check"><input type="radio" name="dpi" value="150"> Sharper (150 dpi)</label>
    </fieldset>`,
  async run(files, options, ctx) {
    const file = files[0];
    const base = stripExt(file.name);
    lastMode = options.get('mode') === 'strong' ? 'strong' : 'light';
    if (lastMode !== 'strong') {
      ctx.progress('Rebuilding file structure…', 0.3);
      const doc = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
      const bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
      return keepSmaller(file, bytes, `${base}_compressed.pdf`);
    }
    const dpi = Number(options.get('dpi') ?? 110);
    const src = await openWithPdfjs(file);
    const out = await PDFDocument.create();
    for (let i = 0; i < src.numPages; i++) {
      ctx.progress(`Compressing page ${i + 1} of ${src.numPages}`, i / src.numPages);
      const page = await src.getPage(i + 1);
      const vp = page.getViewport({ scale: 1 });
      page.cleanup();
      const canvas = await renderPage(src, i, { scale: dpi / 72 });
      const jpg = await canvasToBlob(canvas, 'image/jpeg', 0.72);
      canvas.width = 0; canvas.height = 0;
      const img = await out.embedJpg(await jpg.arrayBuffer());
      const p = out.addPage([vp.width, vp.height]);
      p.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
    }
    await src.loadingTask.destroy();
    const bytes = await out.save({ useObjectStreams: true });
    return keepSmaller(file, bytes, `${base}_compressed.pdf`);
  },
  summary(inputs, outputs) {
    const before = inputs.reduce((s, f) => s + f.size, 0);
    const after = outputs.reduce((s, o) => s + o.blob.size, 0);
    if (after >= before) return lastMode === 'strong'
      ? 'This file is already smaller than an image-based copy would be, so it was left unchanged.'
      : 'This file is already compact, so it was left unchanged. Strong mode may still shrink it.';
    return `${formatBytes(before)} → ${formatBytes(after)}, ${Math.round((1 - after / before) * 100)}% smaller`;
  },
};
export default mod;
