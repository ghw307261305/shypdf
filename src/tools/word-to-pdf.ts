import type { ToolModule } from '@/lib/types';
import { stripExt } from '@/lib/files';
import { readDocx, DocxError } from '@/lib/docx-read';
import { docxToPdf } from '@/lib/docx-layout';
import { t, tn, th } from '@/lib/i18n-client';

let lastPages = 0;

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `<div class="opt-group"><p class="hint">${th('word-to-pdf.hint')}</p></div>`,
  async run(files, _options, ctx) {
    const file = files[0];
    const data = new Uint8Array(await file.arrayBuffer());
    // 老的 .doc 是 OLE 复合文档（D0 CF 11 E0），不是 zip
    if (data[0] === 0xd0 && data[1] === 0xcf) throw new Error(t('word-to-pdf.legacyDoc'));
    ctx.progress(t('word-to-pdf.reading'), 0.08);
    let doc;
    try { doc = await readDocx(data); }
    catch (e) { throw e instanceof DocxError ? new Error(t('word-to-pdf.notDocx')) : e; }
    ctx.progress(t('word-to-pdf.fonts'), 0.15);
    const result = await docxToPdf(doc, { title: stripExt(file.name), progress: (r) => ctx.progress(t('word-to-pdf.typesetting'), 0.15 + 0.8 * r) });
    lastPages = result.pages;
    return [{ name: `${stripExt(file.name)}.pdf`, blob: new Blob([result.pdf as BlobPart], { type: 'application/pdf' }) }];
  },
  summary: () => tn('app.pages', lastPages),
};
export default mod;
