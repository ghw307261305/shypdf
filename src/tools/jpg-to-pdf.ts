import { PDFDocument, PageSizes } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';

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
  optionsHtml: `
    <fieldset class="opt-group">
      <legend>Page size</legend>
      <label class="check"><input type="radio" name="pagesize" value="fit" checked> Same as image</label>
      <label class="check"><input type="radio" name="pagesize" value="a4"> A4 (image scaled to fit)</label>
      <label class="check"><input type="radio" name="pagesize" value="letter"> Letter (image scaled to fit)</label>
    </fieldset>
    <fieldset class="opt-group">
      <legend>Orientation</legend>
      <label class="check"><input type="radio" name="orient" value="auto" checked> Match image</label>
      <label class="check"><input type="radio" name="orient" value="portrait"> Portrait</label>
      <label class="check"><input type="radio" name="orient" value="landscape"> Landscape</label>
    </fieldset>
    <div class="opt-row">
      <div class="opt-group"><label for="opt-margin">Margin (pt)</label><input id="opt-margin" name="margin" type="number" value="0" min="0" max="100"></div>
      <div class="opt-group"><label class="check"><input type="checkbox" name="compress"> Compress images</label></div>
    </div>
    <div class="opt-group">
      <label for="opt-filename">Output file name</label>
      <input id="opt-filename" name="filename" type="text" value="images.pdf">
    </div>`,
  async run(files, options, ctx) {
    const doc = await PDFDocument.create();
    const pagesize = String(options.get('pagesize') || 'fit');
    const orient = String(options.get('orient') || 'auto');
    const margin = Number(options.get('margin') ?? 0);
    const compress = !!options.get('compress');

    for (let i = 0; i < files.length; i++) {
      ctx.progress(`Adding ${files[i].name} (${i + 1}/${files.length})`, i / files.length);
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
    let name = String(options.get('filename') || 'images.pdf').trim();
    if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
    return [{ name, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
  },
};
export default mod;
