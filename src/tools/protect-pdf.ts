import type { ToolModule } from '@/lib/types';
import { runQpdf } from '@/lib/qpdf';
import { stripExt } from '@/lib/files';

function randomPassword(len = 24) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: `
    <div class="opt-group">
      <label for="opt-user">Open password</label>
      <input id="opt-user" name="user" type="password" autocomplete="new-password" placeholder="Needed to open the file">
    </div>
    <div class="opt-group">
      <label for="opt-owner">Permissions password (optional)</label>
      <input id="opt-owner" name="owner" type="password" autocomplete="new-password" placeholder="Leave empty to auto-generate">
    </div>
    <fieldset class="opt-group">
      <legend>Restrictions</legend>
      <label class="check"><input type="checkbox" name="noPrint"> Block printing</label>
      <label class="check"><input type="checkbox" name="noCopy"> Block copying text and images</label>
      <label class="check"><input type="checkbox" name="noModify"> Block editing</label>
    </fieldset>`,
  async run(files, options, ctx) {
    const file = files[0];
    const user = String(options.get('user') || '');
    let owner = String(options.get('owner') || '');
    const noPrint = !!options.get('noPrint'), noCopy = !!options.get('noCopy'), noModify = !!options.get('noModify');
    if (!user && !noPrint && !noCopy && !noModify) throw new Error('Enter an open password or select at least one restriction.');
    if (!owner) owner = randomPassword();
    if (user && user === owner) throw new Error('The permissions password must differ from the open password.');
    ctx.progress('Encrypting…', 0.4);
    const args = ['--encrypt', user, owner, '256',
      `--print=${noPrint ? 'none' : 'full'}`,
      `--modify=${noModify ? 'none' : 'all'}`,
      `--extract=${noCopy ? 'n' : 'y'}`,
      '--', 'in.pdf', 'out.pdf'];
    const bytes = await runQpdf(new Uint8Array(await file.arrayBuffer()), args);
    return [{ name: `${stripExt(file.name)}_protected.pdf`, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
  },
};
export default mod;
