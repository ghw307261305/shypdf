import { PDFDocument, degrees } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { stripExt } from '@/lib/files';
import { t, th } from '@/lib/i18n-client';
import { UserError } from '@/lib/errors';

const mod: ToolModule = {
  mode: 'pages',
  optionsHtml: () => `
    <p class="hint">${th('organize-pdf.hint')}</p>
    <div class="opt-group">
      <label for="opt-filename">${th('opt.outputName')}</label>
      <input id="opt-filename" name="filename" type="text" value="">
    </div>`,
  async run(files, options, ctx) {
    const file = files[0];
    const src = await PDFDocument.load(await file.arrayBuffer());
    const order = ctx.pageOrder ?? src.getPageIndices();
    if (!order.length) throw new UserError(t('organize-pdf.keepOne'));
    ctx.progress(t('organize-pdf.rebuilding'), 0.3);
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, order);
    pages.forEach((p, i) => {
      const rot = ctx.pageRotations?.[order[i]] ?? 0;
      if (rot) p.setRotation(degrees((p.getRotation().angle + rot) % 360));
      out.addPage(p);
    });
    const bytes = await out.save({ useObjectStreams: true });
    let name = String(options.get('filename') || '').trim() || `${stripExt(file.name)}_organized.pdf`;
    if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
    return [{ name, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
  },
};
export default mod;
