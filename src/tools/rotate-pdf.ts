import { PDFDocument, degrees } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { parseRanges, stripExt } from '@/lib/files';

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: `
    <fieldset class="opt-group">
      <legend>Rotation</legend>
      <div class="seg" role="radiogroup">
        <label><input type="radio" name="angle" value="90" checked><span>90° right</span></label>
        <label><input type="radio" name="angle" value="180"><span>180°</span></label>
        <label><input type="radio" name="angle" value="270"><span>90° left</span></label>
      </div>
    </fieldset>
    <fieldset class="opt-group">
      <legend>Apply to</legend>
      <label class="check"><input type="radio" name="scope" value="all" checked> All pages</label>
      <label class="check"><input type="radio" name="scope" value="ranges"> Selected pages</label>
      <input name="ranges" type="text" placeholder="e.g. 2, 5-7" aria-label="Page ranges">
    </fieldset>`,
  async run(files, options, ctx) {
    const file = files[0];
    const doc = await PDFDocument.load(await file.arrayBuffer());
    const delta = Number(options.get('angle'));
    const n = doc.getPageCount();
    let targets = doc.getPageIndices();
    if (options.get('scope') === 'ranges') {
      targets = parseRanges(String(options.get('ranges') || ''), n).flat();
    }
    ctx.progress('Rotating…', 0.5);
    for (const i of targets) {
      const p = doc.getPage(i);
      p.setRotation(degrees((p.getRotation().angle + delta) % 360));
    }
    const bytes = await doc.save({ useObjectStreams: true });
    return [{ name: `${stripExt(file.name)}_rotated.pdf`, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
  },
};
export default mod;
