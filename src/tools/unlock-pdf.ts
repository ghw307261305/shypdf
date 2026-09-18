import type { ToolModule } from '@/lib/types';
import { runQpdf, QpdfError } from '@/lib/qpdf';
import { stripExt } from '@/lib/files';

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: `
    <div class="opt-group">
      <label for="opt-password">Open password (only if the file needs one to open)</label>
      <input id="opt-password" name="password" type="password" autocomplete="off" placeholder="Leave empty if there is none">
    </div>
    <p class="hint">Files that only restrict printing or copying don’t need a password.</p>
    <label class="check check-top"><input type="checkbox" name="confirm" required> I own this file or have the owner’s permission to remove its protection.</label>`,
  async run(files, options, ctx) {
    const file = files[0];
    const pw = String(options.get('password') || '');
    // 合规：必须先确认有权处理该文件（见 terms 的 Acceptable use）
    if (!options.get('confirm')) throw new Error('Please confirm that you have the right to unlock this file.');
    ctx.progress('Removing protection…', 0.4);
    const args = ['--decrypt'];
    if (pw) args.push(`--password=${pw}`);
    args.push('in.pdf', 'out.pdf');
    try {
      const bytes = await runQpdf(new Uint8Array(await file.arrayBuffer()), args);
      return [{ name: `${stripExt(file.name)}_unlocked.pdf`, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
    } catch (e) {
      if (e instanceof QpdfError && (e.code === 2 || /password/i.test(e.message))) {
        throw new Error(pw ? 'Wrong password. Check it and try again.' : 'This file needs a password to open. Enter it above.');
      }
      throw e;
    }
  },
};
export default mod;
