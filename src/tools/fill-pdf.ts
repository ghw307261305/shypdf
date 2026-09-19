import { PDFCheckBox, PDFDocument, PDFDropdown, PDFRadioGroup, PDFTextField } from 'pdf-lib';
import type { PDFForm } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { stripExt } from '@/lib/files';
import { openWithPdfjs, renderPage } from '@/lib/pdfjs';
import { loadVendor } from '@/lib/vendor';
import { isCjk } from '@/lib/pdf-fonts';
import { t, th, escapeHtml } from '@/lib/i18n-client';

// AcroForm 填写：workspace() 用 pdf-lib 列出表单域，动态插进选项表单（name 为 f_下标），
// run() 按同样的顺序重新枚举，用下标对号入座。字段索引以 getForm().getFields() 的文档顺序为准，
// 填不了的域（只读 / 按钮 / 签名域 / 多选列表）跳过渲染但占住下标，两边才对得上。

type Spec =
  | { kind: 'text'; label: string; multiline: boolean; maxLength?: number; value: string }
  | { kind: 'check'; label: string; checked: boolean }
  | { kind: 'choice'; label: string; options: string[]; selected: string }
  | null;

function describe(form: PDFForm): Spec[] {
  return form.getFields().map((f, i) => {
    if (f.isReadOnly()) return null;
    const label = f.getName() || t('fill-pdf.field', { n: i + 1 });
    if (f instanceof PDFTextField) return { kind: 'text', label, multiline: f.isMultiline(), maxLength: f.getMaxLength(), value: f.getText() ?? '' };
    if (f instanceof PDFCheckBox) return { kind: 'check', label, checked: f.isChecked() };
    if (f instanceof PDFRadioGroup) return { kind: 'choice', label, options: f.getOptions(), selected: f.getSelected() ?? '' };
    if (f instanceof PDFDropdown) return { kind: 'choice', label, options: f.getOptions(), selected: f.getSelected()[0] ?? '' };
    return null;
  });
}

/** 文本超出 Latin-1 时选一个 vendored Unicode 字体（按文种），全 Latin-1 返回 null 用默认字体 */
function pickFontKey(text: string): string | null {
  if (!/[^\x00-\xff]/.test(text)) return null;
  if (/[぀-ヿ]/.test(text)) return 'NotoSansJP-400Regular';
  if (/[가-힯ᄀ-ᇿ㄰-㆏]/.test(text)) return 'NotoSansKR-400Regular';
  for (const ch of text) if (isCjk(ch.codePointAt(0)!)) return 'NotoSansSC-400Regular';
  return 'Arimo-400Regular'; // 希腊 / 西里尔 / 扩展拉丁等
}

function rowHtml(spec: Exclude<Spec, null>, i: number): string {
  const name = `f_${i}`, label = `<span class="fill-label">${escapeHtml(spec.label)}</span>`;
  if (spec.kind === 'check') return `<label class="fill-row fill-check"><input type="checkbox" name="${name}"${spec.checked ? ' checked' : ''}> ${label}</label>`;
  if (spec.kind === 'choice') {
    // 现值不在选项里（可编辑下拉的自定义值）也列出来，免得一保存就丢
    const all = spec.selected && !spec.options.includes(spec.selected) ? [spec.selected, ...spec.options] : spec.options;
    const opts = all.map((o) => `<option value="${escapeHtml(o)}"${o === spec.selected ? ' selected' : ''}>${escapeHtml(o)}</option>`).join('');
    return `<label class="fill-row">${label}<select name="${name}"><option value="">${th('fill-pdf.choose')}</option>${opts}</select></label>`;
  }
  if (spec.multiline) return `<label class="fill-row">${label}<textarea name="${name}" rows="3">${escapeHtml(spec.value)}</textarea></label>`;
  return `<label class="fill-row">${label}<input type="text" name="${name}" value="${escapeHtml(spec.value)}"${spec.maxLength ? ` maxlength="${spec.maxLength}"` : ''}></label>`;
}

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `
    <p class="hint">${th('fill-pdf.hint')}</p>
    <div class="opt-group">
      <label class="check"><input type="checkbox" name="flatten" checked> ${th('fill-pdf.flatten')}</label>
    </div>`,

  async workspace(el, file, form) {
    const ac = new AbortController();

    // 1) 表单域面板：插到选项 form 里，值随 FormData 一起交给 run()
    const specs = describe((await PDFDocument.load(await file.arrayBuffer())).getForm());
    let panel: HTMLElement | null = null;
    if (specs.some(Boolean)) {
      panel = document.createElement('div');
      panel.className = 'fill-fields';
      panel.innerHTML = `<h3 class="fill-title">${th('fill-pdf.fields')}</h3>`
        + specs.map((s, i) => (s ? rowHtml(s, i) : '')).join('');
      form.prepend(panel);
    }

    // 2) 页面预览（同 sign-pdf，但不需要覆盖层交互）
    const doc = await openWithPdfjs(file);
    el.innerHTML = `
      <div class="sign-ws">
        ${panel ? '' : `<p class="hint">${th('fill-pdf.noFields')}</p>`}
        <div class="sign-nav">
          <button type="button" class="icon-btn" data-nav="-1" aria-label="${th('fill-pdf.prevPage')}">‹</button>
          <span id="fill-page-label"></span>
          <button type="button" class="icon-btn" data-nav="1" aria-label="${th('fill-pdf.nextPage')}">›</button>
        </div>
        <div class="sign-stage"><div class="sign-page" id="fill-page"></div></div>
      </div>`;
    const pageEl = el.querySelector('#fill-page') as HTMLElement;
    const label = el.querySelector('#fill-page-label') as HTMLElement;

    let current = 0, rendering = 0;
    const showPage = async (index: number) => {
      current = Math.min(Math.max(index, 0), doc.numPages - 1);
      label.textContent = t('fill-pdf.pageOf', { i: current + 1, n: doc.numPages });
      const mine = ++rendering;
      const canvas = await renderPage(doc, current, { scale: 2, maxWidth: 1400 });
      if (mine !== rendering) return;
      pageEl.querySelector('canvas')?.remove();
      pageEl.prepend(canvas);
    };
    el.addEventListener('click', (e) => {
      const nav = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
      if (nav) showPage(current + Number(nav.dataset.nav));
    }, { signal: ac.signal });

    await showPage(0);
    return () => { panel?.remove(); ac.abort(); doc.loadingTask.destroy(); };
  },

  async run(files, options, ctx) {
    const file = files[0];
    ctx.progress(t('fill-pdf.filling'), 0.3);
    const doc = await PDFDocument.load(await file.arrayBuffer());
    const form = doc.getForm();
    const fields = form.getFields();
    if (!fields.length) throw new Error(t('fill-pdf.noFields'));

    // 按 workspace() 的同一顺序应用值；顺手收集写入的文本，判断要不要嵌 Unicode 字体
    let written = '';
    fields.forEach((f, i) => {
      if (f.isReadOnly()) return;
      const raw = options.get(`f_${i}`);
      if (f instanceof PDFCheckBox) { if (raw != null) f.check(); else f.uncheck(); return; }
      if (raw == null) return; // 面板没渲染这个域（不该发生）：别动它
      const value = String(raw);
      if (f instanceof PDFTextField) { f.setText(value); written += value; }
      // 值不在选项里 = 可编辑下拉原有的自定义值（面板只提供既有选项），不动它就等于保留
      else if (f instanceof PDFRadioGroup || f instanceof PDFDropdown) { if (value && f.getOptions().includes(value)) { f.select(value); written += value; } }
    });

    // 默认外观字体是 WinAnsi（≈ Latin-1）；有超出的字就嵌一个 vendored 字体重画外观
    const fontKey = pickFontKey(written);
    if (fontKey) {
      const { default: fontkit } = await import('@pdf-lib/fontkit');
      doc.registerFontkit(fontkit as any);
      const font = await doc.embedFont(await loadVendor(`fonts/${fontKey}.ttf`), { subset: true });
      form.updateFieldAppearances(font);
    } else form.updateFieldAppearances();
    // updateFieldAppearances 已经用对的字体画好了，flatten 别再用默认字体重画一遍
    if (options.get('flatten')) form.flatten({ updateFieldAppearances: false });

    const bytes = await doc.save({ useObjectStreams: true });
    return [{ name: `${stripExt(file.name)}_filled.pdf`, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
  },
};
export default mod;
