import { PDFDocument } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { openWithPdfjs, renderPage, canvasToBlob } from '@/lib/pdfjs';
import { stripExt, formatBytes } from '@/lib/files';
import { t, th } from '@/lib/i18n-client';

// summary() 拿不到选项，用它记住上一次 run 的模式
let lastMode: 'light' | 'strong' = 'light';
/** 压缩结果不比原文件小就原样返回 —— 不能把更大的文件当「压缩结果」交给用户 */
const keepSmaller = async (file: File, bytes: Uint8Array, name: string) =>
  [{ name, blob: bytes.length < file.size ? new Blob([bytes as BlobPart], { type: 'application/pdf' }) : new Blob([await file.arrayBuffer()], { type: 'application/pdf' }) }];

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `
    <fieldset class="opt-group">
      <legend>${th('compress-pdf.mode')}</legend>
      <label class="check"><input type="radio" name="mode" value="light" checked> ${th('compress-pdf.light')}</label>
      <label class="check"><input type="radio" name="mode" value="strong"> ${th('compress-pdf.strong')}</label>
    </fieldset>
    <fieldset class="opt-group" data-show-when="mode=strong">
      <legend>${th('compress-pdf.quality')}</legend>
      <label class="check"><input type="radio" name="dpi" value="72"> ${th('compress-pdf.q72')}</label>
      <label class="check"><input type="radio" name="dpi" value="110" checked> ${th('compress-pdf.q110')}</label>
      <label class="check"><input type="radio" name="dpi" value="150"> ${th('compress-pdf.q150')}</label>
    </fieldset>`,
  async run(files, options, ctx) {
    const file = files[0];
    const base = stripExt(file.name);
    lastMode = options.get('mode') === 'strong' ? 'strong' : 'light';
    if (lastMode !== 'strong') {
      ctx.progress(t('compress-pdf.rebuilding'), 0.3);
      const doc = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
      const bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
      return keepSmaller(file, bytes, `${base}_compressed.pdf`);
    }
    const dpi = Number(options.get('dpi') ?? 110);
    const src = await openWithPdfjs(file);
    const out = await PDFDocument.create();
    for (let i = 0; i < src.numPages; i++) {
      ctx.progress(t('compress-pdf.compressing', { i: i + 1, n: src.numPages }), i / src.numPages);
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
    if (after >= before) return t(lastMode === 'strong' ? 'compress-pdf.unchangedStrong' : 'compress-pdf.unchangedLight');
    return t('compress-pdf.result', { before: formatBytes(before), after: formatBytes(after), pct: Math.round((1 - after / before) * 100) });
  },
};
export default mod;
