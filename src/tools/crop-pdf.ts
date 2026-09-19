import { PDFDocument } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { stripExt } from '@/lib/files';
import { openWithPdfjs, renderPage } from '@/lib/pdfjs';
import { pageView } from '@/lib/pdfview';
import { t, th } from '@/lib/i18n-client';

// 裁剪框放在隐藏字段 rect 里：{ page, x, y, w, h }，都是相对「看到的页面」的比例（x、y 为左上角）。
// 只改 CropBox，不动页面内容 —— 文案里明确说了这不是脱敏。
interface Rect { page: number; x: number; y: number; w: number; h: number; }

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `
    <fieldset class="opt-group">
      <legend>${th('crop-pdf.applyTo')}</legend>
      <label class="check"><input type="radio" name="scope" value="all" checked> ${th('crop-pdf.all')}</label>
      <label class="check"><input type="radio" name="scope" value="current"> ${th('crop-pdf.current')}</label>
    </fieldset>
    <input type="hidden" name="rect">`,

  async workspace(el, file, form) {
    const doc = await openWithPdfjs(file);
    const ac = new AbortController();
    const on = (target: EventTarget, type: string, fn: (e: any) => void) => target.addEventListener(type, fn, { signal: ac.signal });

    el.innerHTML = `
      <div class="sign-ws">
        <div class="sign-nav">
          <button type="button" class="icon-btn" data-nav="-1" aria-label="${th('crop-pdf.prevPage')}">‹</button>
          <span id="crop-page-label"></span>
          <button type="button" class="icon-btn" data-nav="1" aria-label="${th('crop-pdf.nextPage')}">›</button>
        </div>
        <div class="sign-stage"><div class="sign-page" id="crop-page">
          <div class="sig-box is-empty" id="crop-box" aria-label="${th('crop-pdf.boxLabel')}"><img alt="" draggable="false"><span>${th('crop-pdf.boxLabel')}</span><i class="sig-handle" aria-hidden="true"></i></div>
        </div></div>
        <p class="hint">${th('crop-pdf.hint')}</p>
      </div>`;
    const pageEl = el.querySelector('#crop-page') as HTMLElement;
    const box = el.querySelector('#crop-box') as HTMLElement;
    const label = el.querySelector('#crop-page-label') as HTMLElement;
    const rectField = form.querySelector('[name=rect]') as HTMLInputElement;

    const rect: Rect = { page: 0, x: 0.08, y: 0.08, w: 0.84, h: 0.84 };
    const layout = () => {
      rect.w = Math.min(Math.max(rect.w, 0.05), 1);
      rect.h = Math.min(Math.max(rect.h, 0.05), 1);
      rect.x = Math.min(Math.max(rect.x, 0), 1 - rect.w);
      rect.y = Math.min(Math.max(rect.y, 0), 1 - rect.h);
      Object.assign(box.style, { left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` });
      rectField.value = JSON.stringify(rect);
    };

    let rendering = 0;
    const showPage = async (index: number) => {
      rect.page = Math.min(Math.max(index, 0), doc.numPages - 1);
      label.textContent = t('crop-pdf.pageOf', { i: rect.page + 1, n: doc.numPages });
      const mine = ++rendering;
      const canvas = await renderPage(doc, rect.page, { scale: 2, maxWidth: 1400 });
      if (mine !== rendering) return;
      pageEl.querySelector('canvas')?.remove();
      pageEl.prepend(canvas);
      layout();
    };
    on(el, 'click', (e: MouseEvent) => {
      const nav = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
      if (nav) showPage(rect.page + Number(nav.dataset.nav));
    });

    // 拖动 / 右下角缩放（同 sign-pdf）
    let drag: { mode: 'move' | 'size'; px: number; py: number; x: number; y: number; w: number; h: number } | null = null;
    on(box, 'pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      box.setPointerCapture(e.pointerId);
      drag = { mode: (e.target as HTMLElement).classList.contains('sig-handle') ? 'size' : 'move', px: e.clientX, py: e.clientY, ...rect };
    });
    on(box, 'pointermove', (e: PointerEvent) => {
      if (!drag) return;
      const r = pageEl.getBoundingClientRect();
      const dx = (e.clientX - drag.px) / r.width, dy = (e.clientY - drag.py) / r.height;
      if (drag.mode === 'move') { rect.x = drag.x + dx; rect.y = drag.y + dy; }
      else { rect.w = Math.min(drag.w + dx, 1 - rect.x); rect.h = Math.min(drag.h + dy, 1 - rect.y); }
      layout();
    });
    for (const ev of ['pointerup', 'pointercancel']) on(box, ev, () => { drag = null; });

    layout();
    await showPage(0);
    return () => { ac.abort(); doc.loadingTask.destroy(); };
  },

  async run(files, options, ctx) {
    const file = files[0];
    let rect: Rect;
    try { rect = JSON.parse(String(options.get('rect'))); } catch { throw new Error(t('crop-pdf.hint')); }
    ctx.progress(t('crop-pdf.cropping'), 0.4);
    const doc = await PDFDocument.load(await file.arrayBuffer());
    const pages = doc.getPages();
    const targets = options.get('scope') === 'current' ? [pages[Math.min(Math.max(rect.page, 0), pages.length - 1)]] : pages;
    for (const page of targets) {
      const view = pageView(page);
      // 视图坐标（原点左下）里的两个对角，映射回用户空间后取包围盒
      const a = view.toUser(rect.x * view.width, view.height - (rect.y + rect.h) * view.height);
      const b = view.toUser((rect.x + rect.w) * view.width, view.height - rect.y * view.height);
      page.setCropBox(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    }
    const bytes = await doc.save({ useObjectStreams: true });
    return [{ name: `${stripExt(file.name)}_cropped.pdf`, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
  },
};
export default mod;
