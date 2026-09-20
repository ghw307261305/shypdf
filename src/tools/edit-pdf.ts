import { PDFDocument, rgb, BlendMode } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { stripExt } from '@/lib/files';
import { openWithPdfjs, renderPage } from '@/lib/pdfjs';
import { pageView } from '@/lib/pdfview';
import { renderTextToPng } from '@/lib/textimage';
import { t, th } from '@/lib/i18n-client';
import { UserError } from '@/lib/errors';

// 页面上的叠加元素（文字 / 高亮 / 涂白 / 涂黑）全部序列化进隐藏字段 edits：
// { page, kind, x, y, w, h, text?, color? }，x/y/w/h 是相对「看到的页面」的比例（原点在左上角），
// 和 sign-pdf 的 place 字段同一套约定。run() 只读这个字段。
type Kind = 'text' | 'highlight' | 'whiteout' | 'blackout';
interface Edit { page: number; kind: Kind; x: number; y: number; w: number; h: number; text?: string; color?: string; }

const TEXT_COLORS: Record<string, string> = { black: '#141414', red: '#b3261e', blue: '#1b3a8f' };
const RECT_STYLES = {
  highlight: { color: rgb(1, 0.88, 0.25), opacity: 0.45, blendMode: BlendMode.Multiply },
  whiteout: { color: rgb(1, 1, 1), opacity: 1 },
  blackout: { color: rgb(0, 0, 0), opacity: 1 },
} as const;
// 点击页面时插入的默认大小（占页面宽 / 高的比例）
const DEFAULTS: Record<Kind, { w: number; h: number }> = {
  text: { w: 0.32, h: 0.045 },
  highlight: { w: 0.3, h: 0.035 },
  whiteout: { w: 0.26, h: 0.04 },
  blackout: { w: 0.26, h: 0.04 },
};

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `
    <fieldset class="opt-group">
      <legend>${th('edit-pdf.textColor')}</legend>
      <label class="check"><input type="radio" name="color" value="black" checked> ${th('edit-pdf.black')}</label>
      <label class="check"><input type="radio" name="color" value="red"> ${th('edit-pdf.red')}</label>
      <label class="check"><input type="radio" name="color" value="blue"> ${th('edit-pdf.blue')}</label>
    </fieldset>
    <p class="hint">${th('edit-pdf.hint')}</p>
    <input type="hidden" name="edits">`,

  async workspace(el, file, form) {
    const doc = await openWithPdfjs(file);
    const ac = new AbortController();
    const on = <K extends keyof HTMLElementEventMap>(target: EventTarget, type: K | string, fn: (e: any) => void) => target.addEventListener(type, fn, { signal: ac.signal });
    const q = <T extends HTMLElement>(sel: string, root: ParentNode = form) => root.querySelector(sel) as T;

    el.innerHTML = `
      <div class="sign-ws">
        <div class="edit-tools" role="group" aria-label="${th('edit-pdf.add')}">
          <button type="button" class="btn" data-kind="text">${th('edit-pdf.text')}</button>
          <button type="button" class="btn" data-kind="highlight">${th('edit-pdf.highlight')}</button>
          <button type="button" class="btn" data-kind="whiteout">${th('edit-pdf.whiteout')}</button>
          <button type="button" class="btn" data-kind="blackout">${th('edit-pdf.blackout')}</button>
        </div>
        <div class="sign-nav">
          <button type="button" class="icon-btn" data-nav="-1" aria-label="${th('edit-pdf.prevPage')}">‹</button>
          <span id="edit-page-label"></span>
          <button type="button" class="icon-btn" data-nav="1" aria-label="${th('edit-pdf.nextPage')}">›</button>
        </div>
        <div class="sign-stage"><div class="sign-page" id="edit-page"></div></div>
      </div>`;
    const pageEl = q<HTMLElement>('#edit-page', el), label = q<HTMLElement>('#edit-page-label', el);
    const editsField = q<HTMLInputElement>('[name=edits]');

    // ---------- 状态 ----------
    type Box = Edit & { el: HTMLElement };
    const boxes: Box[] = [];
    let current = 0;
    const sync = () => {
      editsField.value = JSON.stringify(boxes.map((b) => ({ page: b.page, kind: b.kind, x: b.x, y: b.y, w: b.w, h: b.h, ...(b.kind === 'text' ? { text: b.text ?? '' } : {}) })));
    };
    sync(); // 表单在换文件后会复用：清掉上一份文件留下的元素

    const layout = (b: Box) => {
      b.w = Math.min(Math.max(b.w, 0.02), 1); b.h = Math.min(Math.max(b.h, 0.012), 1);
      b.x = Math.min(Math.max(b.x, 0), 1 - b.w); b.y = Math.min(Math.max(b.y, 0), 1 - b.h);
      Object.assign(b.el.style, { left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` });
      if (b.kind === 'text') q<HTMLInputElement>('input', b.el).style.fontSize = `${Math.max(9, b.h * pageEl.clientHeight * 0.72)}px`; // 字号跟着框高走
      sync();
    };

    const add = (e: Edit) => {
      const div = document.createElement('div');
      div.className = `edit-el edit-el--${e.kind}`;
      div.innerHTML = `<button type="button" class="edit-x" aria-label="${th('edit-pdf.remove')}">×</button><i class="sig-handle" aria-hidden="true"></i>`;
      const b: Box = { ...e, el: div };
      if (e.kind === 'text') {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = t('edit-pdf.textPlaceholder');
        div.prepend(inp);
        on(inp, 'input', () => { b.text = inp.value; sync(); });
      }
      // 拖动 / 右下角拉伸；点在输入框或 × 上时不拖
      let drag: { mode: 'move' | 'size'; px: number; py: number; x: number; y: number; w: number; h: number } | null = null;
      on(div, 'pointerdown', (ev: PointerEvent) => {
        const tgt = ev.target as HTMLElement;
        if (tgt instanceof HTMLInputElement || tgt.closest('.edit-x')) return;
        ev.preventDefault();
        div.setPointerCapture(ev.pointerId);
        drag = { mode: tgt.classList.contains('sig-handle') ? 'size' : 'move', px: ev.clientX, py: ev.clientY, x: b.x, y: b.y, w: b.w, h: b.h };
      });
      on(div, 'pointermove', (ev: PointerEvent) => {
        if (!drag) return;
        const r = pageEl.getBoundingClientRect();
        const dx = (ev.clientX - drag.px) / r.width, dy = (ev.clientY - drag.py) / r.height;
        if (drag.mode === 'move') { b.x = drag.x + dx; b.y = drag.y + dy; }
        else { b.w = Math.min(drag.w + dx, 1 - b.x); b.h = Math.min(drag.h + dy, 1 - b.y); }
        layout(b);
      });
      for (const ev of ['pointerup', 'pointercancel']) on(div, ev, () => { drag = null; });
      on(q<HTMLElement>('.edit-x', div), 'click', () => { boxes.splice(boxes.indexOf(b), 1); div.remove(); sync(); });
      boxes.push(b);
      pageEl.appendChild(div);
      layout(b);
      return b;
    };

    // ---------- 翻页 ----------
    let rendering = 0;
    const showPage = async (index: number) => {
      current = Math.min(Math.max(index, 0), doc.numPages - 1);
      label.textContent = t('edit-pdf.pageOf', { i: current + 1, n: doc.numPages });
      const mine = ++rendering;
      const canvas = await renderPage(doc, current, { scale: 2, maxWidth: 1400 });
      if (mine !== rendering) return;
      pageEl.querySelector('canvas')?.remove();
      pageEl.prepend(canvas);
      // 元素记得自己属于哪一页，只显示当前页的
      for (const b of boxes) { b.el.style.display = b.page === current ? '' : 'none'; if (b.page === current) layout(b); }
    };

    // ---------- 工具条：先选类型，再点页面插入 ----------
    let armed: Kind | null = null;
    const disarm = () => {
      armed = null;
      pageEl.classList.remove('is-adding');
      el.querySelectorAll('.edit-tools .is-active').forEach((n) => n.classList.remove('is-active'));
    };
    on(el, 'click', (ev: MouseEvent) => {
      const tgt = ev.target as HTMLElement;
      const nav = tgt.closest<HTMLElement>('[data-nav]');
      if (nav) { showPage(current + Number(nav.dataset.nav)); return; }
      const tool = tgt.closest<HTMLElement>('[data-kind]');
      if (tool) {
        const was = armed === tool.dataset.kind;
        disarm();
        if (!was) { armed = tool.dataset.kind as Kind; tool.classList.add('is-active'); pageEl.classList.add('is-adding'); }
        return;
      }
      if (armed && (tgt === pageEl || tgt.tagName === 'CANVAS')) {
        const r = pageEl.getBoundingClientRect();
        const d = DEFAULTS[armed];
        const b = add({ page: current, kind: armed, x: (ev.clientX - r.left) / r.width - d.w / 2, y: (ev.clientY - r.top) / r.height - d.h / 2, w: d.w, h: d.h });
        disarm();
        if (b.kind === 'text') q<HTMLInputElement>('input', b.el).focus();
      }
    });

    // 文字颜色的预览跟着选项走（保存时 run() 再按选项取色）
    const paintInk = () => pageEl.style.setProperty('--edit-ink', TEXT_COLORS[String(new FormData(form).get('color') || 'black')] ?? TEXT_COLORS.black);
    on(form, 'change', paintInk);
    // 窗口变化时字号要按新的显示高度重算
    on(window, 'resize', () => { for (const b of boxes) if (b.page === current) layout(b); });

    paintInk();
    await showPage(0);
    return () => { ac.abort(); doc.loadingTask.destroy(); };
  },

  async run(files, options, ctx) {
    const file = files[0];
    let edits: Edit[] = [];
    try { edits = JSON.parse(String(options.get('edits') || '[]')); } catch { /* 按空处理 */ }
    edits = (Array.isArray(edits) ? edits : []).filter((e) => e.kind !== 'text' || (e.text ?? '').trim());
    if (!edits.length) throw new UserError(t('edit-pdf.nothing'));
    const defColor = String(options.get('color') || 'black');

    const doc = await PDFDocument.load(await file.arrayBuffer());
    const pages = doc.getPages();
    const byPage = new Map<number, Edit[]>();
    for (const e of edits) {
      const p = Math.min(Math.max(e.page | 0, 0), pages.length - 1);
      let list = byPage.get(p);
      if (!list) byPage.set(p, (list = []));
      list.push(e);
    }
    let done = 0;
    for (const [pi, list] of [...byPage.entries()].sort((a, b) => a[0] - b[0])) {
      ctx.progress(t('edit-pdf.applying', { i: pi + 1, n: pages.length }), done++ / byPage.size);
      const page = pages[pi];
      const view = pageView(page);
      for (const e of list) {
        if (e.kind === 'text') {
          const img = await renderTextToPng((e.text ?? '').trim(), { fontSizePx: e.h * view.height * 0.72, color: TEXT_COLORS[e.color ?? defColor] ?? TEXT_COLORS.black, scale: 3 });
          const png = await doc.embedPng(img.png);
          // 文字按自身宽高比画，不拉伸到框宽；锚在元素左上角（edits 原点在左上，用户空间原点在左下）
          const at = view.toUser(e.x * view.width, view.height - e.y * view.height - img.height);
          page.drawImage(png, { ...at, width: img.width, height: img.height, rotate: view.rotate });
        } else {
          const style = RECT_STYLES[e.kind];
          if (!style) continue; // JSON 里混进未知类型时跳过
          const w = e.w * view.width, h = e.h * view.height;
          const at = view.toUser(e.x * view.width, view.height - e.y * view.height - h);
          page.drawRectangle({ ...at, width: w, height: h, rotate: view.rotate, ...style });
        }
      }
    }
    const bytes = await doc.save({ useObjectStreams: true });
    return [{ name: `${stripExt(file.name)}_edited.pdf`, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
  },
};
export default mod;
