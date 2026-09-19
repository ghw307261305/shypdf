import type { ToolModule } from '@/lib/types';
import { runQpdf, QpdfError } from '@/lib/qpdf';
import { stripExt } from '@/lib/files';
import { t, th } from '@/lib/i18n-client';

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `
    <div class="opt-group">
      <label for="opt-password">${th('unlock-pdf.password')}</label>
      <input id="opt-password" name="password" type="password" autocomplete="off" placeholder="${th('unlock-pdf.passwordPlaceholder')}">
    </div>
    <p class="hint">${th('unlock-pdf.hint')}</p>
    <label class="check check-top"><input type="checkbox" name="confirm" required> ${th('unlock-pdf.confirm')}</label>`,
  async run(files, options, ctx) {
    const file = files[0];
    const pw = String(options.get('password') || '');
    // 合规：必须先确认有权处理该文件（见 terms 的 Acceptable use）
    if (!options.get('confirm')) throw new Error(t('unlock-pdf.needConfirm'));
    ctx.progress(t('unlock-pdf.removing'), 0.4);
    const args = ['--decrypt'];
    if (pw) args.push(`--password=${pw}`);
    args.push('in.pdf', 'out.pdf');
    try {
      const bytes = await runQpdf(new Uint8Array(await file.arrayBuffer()), args);
      return [{ name: `${stripExt(file.name)}_unlocked.pdf`, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
    } catch (e) {
      if (e instanceof QpdfError && (e.code === 2 || /password/i.test(e.message))) {
        throw new Error(t(pw ? 'unlock-pdf.wrongPassword' : 'unlock-pdf.needPassword'));
      }
      throw e;
    }
  },
};
export default mod;
