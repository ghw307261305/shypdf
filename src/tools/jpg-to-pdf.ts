import { PDFDocument, PageSizes } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { t, th } from '@/lib/i18n-client';

/**
 * 读出图片里的 EXIF 方向（1 = 正常，2–8 = 需要旋转 / 镜像，0 = 没有这个信息）。
 * PDF 不认 EXIF，原始字节直传会让手机竖拍的照片躺倒 —— 浏览器、访达、以及我们自己的卡片缩略图
 * 都是按 EXIF 摆正显示的，所以这里必须先问一声，方向不是 1 就改走 canvas 重绘那条路。
 * 支持 JPEG 的 APP1 段和 PNG 的 eXIf 块，两者装的都是同一套 TIFF 结构。
 */
export function readExifOrientation(head: Uint8Array): number {
  const u16 = (i: number, le: boolean) => (le ? head[i] | (head[i + 1] << 8) : (head[i] << 8) | head[i + 1]);
  const u32 = (i: number, le: boolean) =>
    (le ? head[i] | (head[i + 1] << 8) | (head[i + 2] << 16) | (head[i + 3] << 24)
        : (head[i] << 24) | (head[i + 1] << 16) | (head[i + 2] << 8) | head[i + 3]) >>> 0;

  /** 从 TIFF 头（II*\0 / MM\0*）开始找 IFD0 里的 Orientation(0x0112) */
  const fromTiff = (tiff: number): number => {
    if (tiff + 8 > head.length) return 0;
    const le = head[tiff] === 0x49 && head[tiff + 1] === 0x49;
    if (!le && !(head[tiff] === 0x4d && head[tiff + 1] === 0x4d)) return 0;
    if (u16(tiff + 2, le) !== 42) return 0;
    const ifd = tiff + u32(tiff + 4, le);
    if (ifd + 2 > head.length) return 0;
    const count = u16(ifd, le);
    for (let i = 0; i < count; i++) {
      const entry = ifd + 2 + i * 12;
      if (entry + 12 > head.length) break;
      if (u16(entry, le) === 0x0112) {
        const v = u16(entry + 8, le);
        return v >= 1 && v <= 8 ? v : 0;
      }
    }
    return 0;
  };

  // JPEG：SOI 之后逐个跳段，找 APP1 里的 "Exif\0\0"
  if (head[0] === 0xff && head[1] === 0xd8) {
    let i = 2;
    while (i + 4 <= head.length && head[i] === 0xff) {
      const marker = head[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      if (marker === 0xda) break; // 到了图像数据，后面不会再有 EXIF
      const len = u16(i + 2, false);
      if (len < 2) break;
      if (marker === 0xe1 && String.fromCharCode(...head.subarray(i + 4, i + 10)) === 'Exif\0\0') return fromTiff(i + 10);
      i += 2 + len;
    }
    return 0;
  }

  // PNG：逐个跳 chunk，找 eXIf
  if (head[0] === 0x89 && head[1] === 0x50) {
    let i = 8;
    while (i + 8 <= head.length) {
      const len = u32(i, false);
      const type = String.fromCharCode(head[i + 4], head[i + 5], head[i + 6], head[i + 7]);
      if (type === 'eXIf') return fromTiff(i + 8);
      if (type === 'IDAT' || type === 'IEND') break;
      i += 12 + len; // 长度 + 类型 + 数据 + CRC
    }
  }
  return 0;
}

/** 读取图片；需要压缩、WebP、或带 EXIF 旋转时经 canvas 重新编码为 JPEG */
async function loadImage(file: File, compress: boolean): Promise<{ bytes: Uint8Array; kind: 'jpg' | 'png' }> {
  const isJpg = file.type === 'image/jpeg';
  const isPng = file.type === 'image/png';
  if (!compress && (isJpg || isPng)) {
    // 只读文件开头够找 EXIF 了，不为这一下把整个文件读两遍
    const head = new Uint8Array(await file.slice(0, 128 * 1024).arrayBuffer());
    if (readExifOrientation(head) <= 1) {
      return { bytes: new Uint8Array(await file.arrayBuffer()), kind: isJpg ? 'jpg' : 'png' };
    }
  }
  // imageOrientation: 'from-image' 是新版浏览器的默认值，写出来是为了老一点的 Safari
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(file));
  const max = compress ? 2000 : 6000;
  const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // 没勾压缩的人只是想摆正图，质量给高一点
  const quality = compress ? 0.82 : 0.92;
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', quality));
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
