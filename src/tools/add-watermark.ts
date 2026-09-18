import { PDFDocument, degrees } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { stripExt } from '@/lib/files';
import { renderTextToPng } from '@/lib/textimage';

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: `
    <div class="opt-group">
      <label for="opt-text">Watermark text</label>
      <input id="opt-text" name="text" type="text" value="CONFIDENTIAL" required>
    </div>
    <div class="opt-row">
      <div class="opt-group"><label for="opt-size">Font size</label><input id="opt-size" name="size" type="number" value="48" min="8" max="200"></div>
      <div class="opt-group"><label for="opt-angle">Angle</label><input id="opt-angle" name="angle" type="number" value="-30" min="-90" max="90"></div>
    </div>
    <div class="opt-row">
      <div class="opt-group"><label for="opt-opacity">Opacity</label><input id="opt-opacity" name="opacity" type="range" value="25" min="5" max="100"></div>
      <div class="opt-group"><label for="opt-color">Color</label><input id="opt-color" name="color" type="color" value="#c8412f"></div>
    </div>
    <fieldset class="opt-group">
      <legend>Layout</legend>
      <label class="check"><input type="radio" name="layout" value="center" checked> Single, centered</label>
      <label class="check"><input type="radio" name="layout" value="tile"> Tiled across the page</label>
    </fieldset>`,
  async run(files, options, ctx) {
    const file = files[0];
    const text = String(options.get('text') || '').trim();
    if (!text) throw new Error('Enter the watermark text.');
    const size = Number(options.get('size') ?? 48);
    const angle = Number(options.get('angle') ?? -30);
    const opacity = Number(options.get('opacity') ?? 25) / 100;
    const color = String(options.get('color') || '#c8412f');
    const tile = options.get('layout') === 'tile';

    const doc = await PDFDocument.load(await file.arrayBuffer());
    const img = await renderTextToPng(text, { fontSizePx: size, color, bold: true });
    const embedded = await doc.embedPng(img.png);
    const pages = doc.getPages();
    const rad = (angle * Math.PI) / 180;
    // 旋转后图片包围盒的偏移，使旋转围绕图片中心
    const cx = (img.width * Math.cos(rad) - img.height * Math.sin(rad)) / 2;
    const cy = (img.width * Math.sin(rad) + img.height * Math.cos(rad)) / 2;

    pages.forEach((page, i) => {
      ctx.progress(`Stamping page ${i + 1} of ${pages.length}`, i / pages.length);
      const { width, height } = page.getSize();
      const place = (x: number, y: number) =>
        page.drawImage(embedded, { x: x - cx, y: y - cy, width: img.width, height: img.height, rotate: degrees(angle), opacity });
      if (tile) {
        const stepX = img.width + 80, stepY = img.height + 120;
        for (let y = stepY / 2; y < height + stepY; y += stepY)
          for (let x = stepX / 2; x < width + stepX; x += stepX) place(x, y);
      } else {
        place(width / 2, height / 2);
      }
    });
    const bytes = await doc.save({ useObjectStreams: true });
    return [{ name: `${stripExt(file.name)}_watermarked.pdf`, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
  },
};
export default mod;
