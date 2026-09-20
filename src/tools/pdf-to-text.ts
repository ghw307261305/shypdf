import type { ToolModule } from '@/lib/types';
import { openWithPdfjs } from '@/lib/pdfjs';
import { parseRanges, stripExt } from '@/lib/files';
import { t, th } from '@/lib/i18n-client';
import { UserError } from '@/lib/errors';

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `
    <div class="opt-group">
      <label for="opt-pages">${th('pdf-to-text.pages')}</label>
      <input id="opt-pages" name="pages" type="text" placeholder="${th('pdf-to-text.pagesPlaceholder')}">
    </div>
    <div class="opt-group">
      <label class="check"><input type="checkbox" name="breaks" checked> ${th('pdf-to-text.breaks')}</label>
    </div>`,
  async run(files, options, ctx) {
    const file = files[0];
    const doc = await openWithPdfjs(file);
    const n = doc.numPages;
    let indices = Array.from({ length: n }, (_, i) => i);
    const rangeText = String(options.get('pages') || '').trim();
    if (rangeText) indices = parseRanges(rangeText, n).flat();
    const marks = !!options.get('breaks');
    const parts: string[] = [];
    const bodies: string[] = [];
    for (let k = 0; k < indices.length; k++) {
      const i = indices[k];
      ctx.progress(t('pdf-to-text.reading', { i: k + 1, n: indices.length }), k / indices.length);
      const page = await doc.getPage(i + 1);
      const content = await page.getTextContent();
      // pdf.js 已按阅读顺序给出条目并标了换行；行内直接拼接（条目自带空格）
      let text = '';
      for (const item of content.items as { str: string; hasEOL?: boolean }[]) {
        text += item.str;
        if (item.hasEOL) text += '\n';
      }
      page.cleanup();
      const body = text.replace(/[ \t]+\n/g, '\n').trim();
      bodies.push(body);
      parts.push(marks ? `${t('pdf-to-text.breakLine', { n: i + 1 })}\n\n${body}` : body);
    }
    await doc.loadingTask.destroy();
    // 全文没有可提取的字符：多半是扫描件
    if (!/[\p{L}\p{N}]/u.test(bodies.join(''))) throw new UserError(t('pdf-to-text.noText'));
    const out = parts.join('\n\n');
    return [{ name: `${stripExt(file.name)}.txt`, blob: new Blob([out], { type: 'text/plain;charset=utf-8' }) }];
  },
};
export default mod;
