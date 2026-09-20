import { PDFDocument, degrees } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { parseRanges, stripExt } from '@/lib/files';
import { t, th } from '@/lib/i18n-client';
import { UserError } from '@/lib/errors';

// 两种删法：在缩略图上点 ×（走 ctx.pageOrder），或直接输入页码范围（优先生效）。
const mod: ToolModule = {
  mode: 'pages',
  optionsHtml: () => `
    <p class="hint">${th('delete-pages.hint')}</p>
    <div class="opt-group">
      <label for="opt-ranges">${th('delete-pages.ranges')}</label>
      <input id="opt-ranges" name="ranges" type="text" placeholder="${th('delete-pages.rangesPlaceholder')}">
    </div>`,
  async run(files, options, ctx) {
    const file = files[0];
    const src = await PDFDocument.load(await file.arrayBuffer());
    let order = ctx.pageOrder ?? src.getPageIndices();
    const rangeText = String(options.get('ranges') || '').trim();
    if (rangeText) {
      const drop = new Set(parseRanges(rangeText, src.getPageCount()).flat());
      order = order.filter((i) => !drop.has(i));
    }
    if (!order.length) throw new UserError(t('delete-pages.keepOne'));
    ctx.progress(t('delete-pages.rebuilding'), 0.3);
    const out = await PDFDocument.create();
    (await out.copyPages(src, order)).forEach((p, i) => {
      const rot = ctx.pageRotations?.[order[i]] ?? 0;
      if (rot) p.setRotation(degrees((p.getRotation().angle + rot) % 360));
      out.addPage(p);
    });
    const bytes = await out.save({ useObjectStreams: true });
    return [{ name: `${stripExt(file.name)}_pages-deleted.pdf`, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
  },
};
export default mod;
