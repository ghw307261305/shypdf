import type { PDFPageProxy } from 'pdfjs-dist';
import type { ToolModule } from '@/lib/types';
import { stripExt } from '@/lib/files';
import { getPdfjs, openWithPdfjs, canvasToBlob } from '@/lib/pdfjs';
import { readPage, analyzePage, markHeadings, type PageModel } from '@/lib/pdf-layout';
import { writeDocx, type DocxImage } from '@/lib/docx-write';
import { t, th } from '@/lib/i18n-client';
import { UserError } from '@/lib/errors';

const MAX_IMAGES = 80;
const IMAGE_DPI = 220; // 图片像素远超它在页面上的显示尺寸时，缩到这个密度，Word 文件才不会大得离谱

/** pdf.js 解码后的图片对象 → PNG / JPEG 字节。只在浏览器里可用（要 canvas）。 */
async function encodeImage(page: PDFPageProxy, objId: string, widthPt: number): Promise<DocxImage | null> {
  const obj: any = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 4000);
    try { (objId.startsWith('g_') ? page.commonObjs : page.objs).get(objId, (o: any) => { clearTimeout(timer); resolve(o); }); }
    catch { clearTimeout(timer); resolve(null); }
  });
  if (!obj?.width || !obj?.height) return null;
  const src = document.createElement('canvas');
  src.width = obj.width; src.height = obj.height;
  const sctx = src.getContext('2d')!;
  let opaque = false;
  if (obj.bitmap) sctx.drawImage(obj.bitmap, 0, 0);
  else if (obj.data) {
    const n = obj.width * obj.height, rgba = new Uint8ClampedArray(n * 4), d: Uint8Array = obj.data;
    if (d.length === n * 4) rgba.set(d);
    else if (d.length === n * 3) { opaque = true; for (let i = 0, j = 0; i < n; i++, j += 3) { rgba[i * 4] = d[j]; rgba[i * 4 + 1] = d[j + 1]; rgba[i * 4 + 2] = d[j + 2]; rgba[i * 4 + 3] = 255; } }
    else { // 1 位灰度：每行按字节对齐，1 = 白
      opaque = true;
      const stride = (obj.width + 7) >> 3;
      for (let y = 0; y < obj.height; y++) for (let x = 0; x < obj.width; x++) {
        const v = (d[y * stride + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0, k = (y * obj.width + x) * 4;
        rgba[k] = rgba[k + 1] = rgba[k + 2] = v; rgba[k + 3] = 255;
      }
    }
    sctx.putImageData(new ImageData(rgba, obj.width, obj.height), 0, 0);
  } else return null;

  const k = Math.min(1, ((widthPt / 72) * IMAGE_DPI) / obj.width);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(obj.width * k)); out.height = Math.max(1, Math.round(obj.height * k));
  const octx = out.getContext('2d')!;
  // 大的不透明图（照片）用 JPEG，其余用 PNG 保住透明和锐利的边缘
  if (!opaque && out.width * out.height > 250_000) {
    const a = sctx.getImageData(0, 0, src.width, src.height).data;
    opaque = true;
    for (let i = 3; i < a.length; i += 4 * 97) if (a[i] < 250) { opaque = false; break; }
  }
  const jpeg = opaque && out.width * out.height > 250_000;
  if (jpeg) { octx.fillStyle = '#fff'; octx.fillRect(0, 0, out.width, out.height); }
  octx.drawImage(src, 0, 0, out.width, out.height);
  const blob = await canvasToBlob(out, jpeg ? 'image/jpeg' : 'image/png', 0.9);
  src.width = out.width = 0;
  return { bytes: new Uint8Array(await blob.arrayBuffer()), type: jpeg ? 'jpeg' : 'png' };
}

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `
    <div class="opt-group">
      <label class="check"><input type="checkbox" name="images" checked> ${th('pdf-to-word.images')}</label>
      <p class="hint">${th('pdf-to-word.hint')}</p>
    </div>`,
  async run(files, options, ctx) {
    const file = files[0];
    const wantImages = !!options.get('images') && typeof document !== 'undefined';
    const pdfjs = await getPdfjs();
    const doc = await openWithPdfjs(file);
    try {
      const pages: PageModel[] = [];
      const images: (DocxImage | null)[] = [];
      const shared = new Map<string, number>(); // 每页都出现的 logo 只存一份
      for (let i = 0; i < doc.numPages; i++) {
        ctx.progress(t('pdf-to-word.reading', { i: i + 1, n: doc.numPages }), 0.05 + 0.85 * (i / doc.numPages));
        const page = await doc.getPage(i + 1);
        const raw = await readPage(pdfjs, page, wantImages);
        for (const im of raw.images) {
          const cached = shared.get(im.objId);
          if (cached != null) { im.index = cached; continue; }
          if (images.length >= MAX_IMAGES) continue;
          im.index = images.length;
          images.push(await encodeImage(page, im.objId, im.width).catch(() => null));
          if (im.objId.startsWith('g_')) shared.set(im.objId, im.index);
        }
        pages.push(analyzePage(raw.items, raw.images.filter((im) => im.index >= 0), raw.width, raw.height));
        page.cleanup();
      }
      // 没有文字层的 PDF（扫描件）转出来只会是一叠图片，不如直说
      if (pages.reduce((n, p) => n + p.chars, 0) < 20) throw new UserError(t('pdf-to-word.noText'));
      markHeadings(pages);
      ctx.progress(t('pdf-to-word.writing'), 0.95);
      return [{ name: `${stripExt(file.name)}.docx`, blob: await writeDocx(pages, images) }];
    } finally { doc.loadingTask.destroy(); }
  },
};
export default mod;
