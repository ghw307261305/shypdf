import { PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFNumber, type PDFRef } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { stripExt } from '@/lib/files';

/** 给合并后的文档加一级书签（每个源文件一条）。pdf-lib 没有高层 API，这里直接写对象。 */
function addOutlines(doc: PDFDocument, entries: { title: string; pageIndex: number }[]) {
  const ctx = doc.context;
  const pages = doc.getPages();
  const outlinesRef = ctx.nextRef();
  const itemRefs: PDFRef[] = entries.map(() => ctx.nextRef());
  entries.forEach((e, i) => {
    const item = ctx.obj({
      Title: PDFString.of(e.title),
      Parent: outlinesRef,
      Dest: ctx.obj([pages[e.pageIndex].ref, PDFName.of('Fit')]),
    }) as PDFDict;
    if (i > 0) item.set(PDFName.of('Prev'), itemRefs[i - 1]);
    if (i < entries.length - 1) item.set(PDFName.of('Next'), itemRefs[i + 1]);
    ctx.assign(itemRefs[i], item);
  });
  const outlines = ctx.obj({
    Type: PDFName.of('Outlines'),
    First: itemRefs[0],
    Last: itemRefs[itemRefs.length - 1],
    Count: PDFNumber.of(entries.length),
  });
  ctx.assign(outlinesRef, outlines);
  doc.catalog.set(PDFName.of('Outlines'), outlinesRef);
}

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: `
    <fieldset class="opt-group">
      <legend>Extras</legend>
      <label class="check"><input type="checkbox" name="bookmarks" checked> Add a bookmark for each file</label>
    </fieldset>
    <div class="opt-group">
      <label for="opt-filename">Output file name</label>
      <input id="opt-filename" name="filename" type="text" value="merged.pdf">
    </div>`,
  async run(files, options, ctx) {
    const out = await PDFDocument.create();
    const entries: { title: string; pageIndex: number }[] = [];
    for (let i = 0; i < files.length; i++) {
      ctx.progress(`Reading ${files[i].name} (${i + 1}/${files.length})`, i / files.length);
      const src = await PDFDocument.load(await files[i].arrayBuffer(), { ignoreEncryption: false });
      const indices = src.getPageIndices();
      const copied = await out.copyPages(src, indices);
      entries.push({ title: stripExt(files[i].name), pageIndex: out.getPageCount() });
      copied.forEach((p) => out.addPage(p));
    }
    if (options.get('bookmarks')) addOutlines(out, entries);
    ctx.progress('Writing file…', 0.95);
    const bytes = await out.save({ useObjectStreams: true });
    let name = String(options.get('filename') || 'merged.pdf').trim();
    if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
    return [{ name, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
  },
};
export default mod;
