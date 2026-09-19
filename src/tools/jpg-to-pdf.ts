import { PDFDocument, PageSizes } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { t, th } from '@/lib/i18n-client';

/** 读取图片；WebP 或需要压缩时经 canvas 重新编码为 JPEG */
async function loadImage(file: File, compress: boolean): Promise<{ bytes: Uint8Array; kind: 'jpg' | 'png' }> {
  const isJpg = file.type === 'image/jpeg';
  const isPng = file.type === 'image/png';
  if (!compress && (isJpg || isPng)) {
    return { bytes: new Uint8Array(await file.arrayBuffer()), kind: isJpg ? 'jpg' : 'png' };
  }
  const bitmap = await createImageBitmap(file);
  const max = compress ? 2000 : 6000;
  const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', 0.82));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), kind: 'jpg' };
}

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `
    <fieldset class="opt-group">
      <legend>${th('jpg-to-pdf.pageSize')}</legend>
      <label class="check"><input type="radio" name="pagesize" value="fit" checked> ${th('jpg-to-pdf.fit')}</label>
      <label class="check"><input type="radio" name="pagesize" value="a4"> ${th('jpg-to-pdf.a4')}</label>
      <label class="check"><input type="radio" name="pagesize" value="letter"> ${th('jpg-to-pdf.letter')}</label>
    </fieldset>
    <fieldset class="opt-group">
      <legend>${th('jpg-to-pdf.orientation')}</legend>
      <label class="check"><input type="radio" name="orient" value="auto" checked> ${th('jpg-to-pdf.auto')}</label>
      <label class="check"><input type="radio" name="orient" value="portrait"> ${th('jpg-to-pdf.portrait')}</label>
      <label class="check"><input type="radio" name="orient" value="landscape"> ${th('jpg-to-pdf.landscape')}</label>
    </fieldset>
    <div class="opt-row">
      <div class="opt-group"><label for="opt-margin">${th('opt.margin')}</label><input id="opt-margin" name="margin" type="number" value="0" min="0" max="100"></div>
      <div class="opt-group"><label class="check"><input type="checkbox" name="compress"> ${th('jpg-to-pdf.compress')}</label></div>
    </div>
    <div class="opt-group">
      <label for="opt-filename">${th('opt.outputName')}</label>
      <input id="opt-filename" name="filename" type="text" value="${th('jpg-to-pdf.defaultName')}">
    </div>`,
  async run(files, options, ctx) {
    const doc = await PDFDocument.create();
    const pagesize = String(options.get('pagesize') || 'fit');
    const orient = String(options.get('orient') || 'auto');
    const margin = Number(options.get('margin') ?? 0);
    const compress = !!options.get('compress');

    for (let i = 0; i < files.length; i++) {
      ctx.progress(t('jpg-to-pdf.adding', { name: files[i].name, i: i + 1, n: files.length }), i / files.length);
      const { bytes, kind } = await loadImage(files[i], compress);
      const img = kind === 'jpg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
      let pw: number, ph: number;
      if (pagesize === 'fit') { pw = img.width + margin * 2; ph = img.height + margin * 2; }
      else { [pw, ph] = pagesize === 'a4' ? PageSizes.A4 : PageSizes.Letter; }
      const wantLandscape = orient === 'landscape' || (orient === 'auto' && img.width > img.height);
      if (pagesize !== 'fit' && wantLandscape !== pw > ph) [pw, ph] = [ph, pw];
      const page = doc.addPage([pw, ph]);
      const boxW = pw - margin * 2, boxH = ph - margin * 2;
      const s = Math.min(boxW / img.width, boxH / img.height, pagesize === 'fit' ? 1 : Infinity);
      const w = img.width * s, h = img.height * s;
      page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    }
    const bytes = await doc.save({ useObjectStreams: true });
    let name = String(options.get('filename') || t('jpg-to-pdf.defaultName')).trim();
    if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
    return [{ name, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
  },
};
export default mod;
