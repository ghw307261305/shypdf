import { PDFDocument } from 'pdf-lib';
import type { ToolModule, OutputFile } from '@/lib/types';
import { parseRanges, stripExt } from '@/lib/files';
import { t, th } from '@/lib/i18n-client';
import { UserError } from '@/lib/errors';

async function extract(src: PDFDocument, indices: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, indices);
  pages.forEach((p) => doc.addPage(p));
  return doc.save({ useObjectStreams: true });
}

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `
    <fieldset class="opt-group">
      <legend>${th('split-pdf.mode')}</legend>
      <label class="check"><input type="radio" name="mode" value="ranges" checked> ${th('split-pdf.byRange')}</label>
      <input name="ranges" type="text" placeholder="${th('split-pdf.rangesPlaceholder')}" aria-label="${th('opt.pageRanges')}">
      <p class="hint">${th('split-pdf.hint')}</p>
      <label class="check"><input type="radio" name="mode" value="each"> ${th('split-pdf.each')}</label>
      <label class="check"><input type="radio" name="mode" value="odd"> ${th('split-pdf.odd')}</label>
      <label class="check"><input type="radio" name="mode" value="even"> ${th('split-pdf.even')}</label>
    </fieldset>`,
  async run(files, options, ctx) {
    const file = files[0];
    const src = await PDFDocument.load(await file.arrayBuffer());
    const n = src.getPageCount();
    const base = stripExt(file.name);
    const mode = String(options.get('mode'));
    const outputs: OutputFile[] = [];
    const push = async (indices: number[], name: string) => {
      const bytes = await extract(src, indices);
      outputs.push({ name, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) });
    };
    if (mode === 'ranges') {
      const groups = parseRanges(String(options.get('ranges') || ''), n);
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        ctx.progress(t('split-pdf.extracting', { from: g[0] + 1, to: g[g.length - 1] + 1, i: i + 1, n: groups.length }), i / groups.length);
        const label = g.length === 1 ? `p${g[0] + 1}` : `p${g[0] + 1}-${g[g.length - 1] + 1}`;
        await push(g, `${base}_${label}.pdf`);
      }
    } else if (mode === 'each') {
      for (let i = 0; i < n; i++) {
        ctx.progress(t('split-pdf.splitting', { i: i + 1, n }), i / n);
        await push([i], `${base}_p${i + 1}.pdf`);
      }
    } else {
      const want = mode === 'odd' ? 0 : 1; // 0 起索引：奇数页 = 偶数索引
      const idx = src.getPageIndices().filter((i) => i % 2 === want);
      if (!idx.length) throw new UserError(t('split-pdf.noMatch'));
      await push(idx, `${base}_${mode === 'odd' ? 'odd-pages' : 'even-pages'}.pdf`);
    }
    return outputs;
  },
};
export default mod;
