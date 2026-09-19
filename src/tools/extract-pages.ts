import { PDFDocument } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { parseRanges, stripExt } from '@/lib/files';
import { t, th } from '@/lib/i18n-client';

// 与 split-pdf 的区别：选中的页合成「一个」新 PDF，而不是每个范围各出一个文件。
const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `
    <div class="opt-group">
      <label for="opt-ranges">${th('extract-pages.ranges')}</label>
      <input id="opt-ranges" name="ranges" type="text" placeholder="${th('extract-pages.rangesPlaceholder')}">
      <p class="hint">${th('extract-pages.hint')}</p>
    </div>`,
  async run(files, options, ctx) {
    const file = files[0];
    const src = await PDFDocument.load(await file.arrayBuffer());
    // 按文档顺序去重：1-3,2 也只出一次第 2 页
    const picked = new Set(parseRanges(String(options.get('ranges') || ''), src.getPageCount()).flat());
    const indices = src.getPageIndices().filter((i) => picked.has(i));
    ctx.progress(t('extract-pages.extracting'), 0.4);
    const out = await PDFDocument.create();
    (await out.copyPages(src, indices)).forEach((p) => out.addPage(p));
    const bytes = await out.save({ useObjectStreams: true });
    return [{ name: `${stripExt(file.name)}_extracted.pdf`, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
  },
};
export default mod;
