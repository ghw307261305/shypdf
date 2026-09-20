import { PDFDocument } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { runQpdf, QpdfError } from '@/lib/qpdf';
import { stripExt } from '@/lib/files';
import { t, th } from '@/lib/i18n-client';
import { UserError } from '@/lib/errors';

// 两道防线：
// 1. qpdf 重写整个文件结构（交叉引用表、对象流），能修下载不完整、文件头有垃圾这类问题；
// 2. qpdf 认输时再让 pdf-lib 试一次 —— 它对坏掉的 xref 宽容得多（偏移写错、%%EOF 之后有脏东西
//    这些最常见的坏法，qpdf 会直接退出，pdf-lib 却能把对象扫出来）。读通了就重新存一份，
//    再把结果交给 qpdf 规整一遍，输出和正常那条路一致。
const asPdf = (bytes: Uint8Array, name: string) => [{ name, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];

/** pdf-lib 兜底：能读出页面就重新写一份，读不了返回 null */
async function rebuild(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    if (!doc.getPageCount()) return null;
    return await doc.save({ useObjectStreams: true });
  } catch {
    return null;
  }
}

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `<p class="hint">${th('repair-pdf.hint')}</p>`,
  async run(files, _options, ctx) {
    const file = files[0];
    const name = `${stripExt(file.name)}_repaired.pdf`;
    const input = new Uint8Array(await file.arrayBuffer());
    ctx.progress(t('repair-pdf.repairing'), 0.4);
    try {
      return asPdf(await runQpdf(input, ['--object-streams=generate', 'in.pdf', 'out.pdf']), name);
    } catch (e) {
      if (!(e instanceof QpdfError)) throw e;
      if (/password/i.test(e.message)) throw new UserError(t('repair-pdf.encrypted'));

      ctx.progress(t('repair-pdf.repairing'), 0.7);
      const rescued = await rebuild(input);
      if (!rescued) throw new UserError(t('repair-pdf.failed'));
      // 救回来之后再走一遍 qpdf；它这次多半能过，过不了就直接用 pdf-lib 的结果
      try {
        return asPdf(await runQpdf(rescued, ['--object-streams=generate', 'in.pdf', 'out.pdf']), name);
      } catch {
        return asPdf(rescued, name);
      }
    }
  },
};
export default mod;
