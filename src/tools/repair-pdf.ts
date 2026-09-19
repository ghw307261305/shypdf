import type { ToolModule } from '@/lib/types';
import { runQpdf, QpdfError } from '@/lib/qpdf';
import { stripExt } from '@/lib/files';
import { t, th } from '@/lib/i18n-client';

// qpdf 重写整个文件结构（交叉引用表、对象流），能修复下载不完整、xref 损坏这类问题。
const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `<p class="hint">${th('repair-pdf.hint')}</p>`,
  async run(files, _options, ctx) {
    const file = files[0];
    ctx.progress(t('repair-pdf.repairing'), 0.4);
    try {
      const bytes = await runQpdf(new Uint8Array(await file.arrayBuffer()), ['--object-streams=generate', 'in.pdf', 'out.pdf']);
      return [{ name: `${stripExt(file.name)}_repaired.pdf`, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
    } catch (e) {
      if (e instanceof QpdfError) {
        if (/password/i.test(e.message)) throw new Error(t('repair-pdf.encrypted'));
        throw new Error(t('repair-pdf.failed'));
      }
      throw e;
    }
  },
};
export default mod;
