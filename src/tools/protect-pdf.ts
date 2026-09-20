import type { ToolModule } from '@/lib/types';
import { runQpdf } from '@/lib/qpdf';
import { stripExt } from '@/lib/files';
import { t, th } from '@/lib/i18n-client';
import { UserError } from '@/lib/errors';

function randomPassword(len = 24) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `
    <div class="opt-group">
      <label for="opt-user">${th('protect-pdf.user')}</label>
      <input id="opt-user" name="user" type="password" autocomplete="new-password" placeholder="${th('protect-pdf.userPlaceholder')}">
    </div>
    <div class="opt-group">
      <label for="opt-owner">${th('protect-pdf.owner')}</label>
      <input id="opt-owner" name="owner" type="password" autocomplete="new-password" placeholder="${th('protect-pdf.ownerPlaceholder')}">
    </div>
    <fieldset class="opt-group">
      <legend>${th('protect-pdf.restrictions')}</legend>
      <label class="check"><input type="checkbox" name="noPrint"> ${th('protect-pdf.noPrint')}</label>
      <label class="check"><input type="checkbox" name="noCopy"> ${th('protect-pdf.noCopy')}</label>
      <label class="check"><input type="checkbox" name="noModify"> ${th('protect-pdf.noModify')}</label>
    </fieldset>`,
  async run(files, options, ctx) {
    const file = files[0];
    const user = String(options.get('user') || '');
    let owner = String(options.get('owner') || '');
    const noPrint = !!options.get('noPrint'), noCopy = !!options.get('noCopy'), noModify = !!options.get('noModify');
    if (!user && !noPrint && !noCopy && !noModify) throw new UserError(t('protect-pdf.needInput'));
    if (!owner) owner = randomPassword();
    if (user && user === owner) throw new UserError(t('protect-pdf.mustDiffer'));
    ctx.progress(t('protect-pdf.encrypting'), 0.4);
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
