import { PDFDocument } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { stripExt } from '@/lib/files';
import { openWithPdfjs, renderPage } from '@/lib/pdfjs';
import { pageView } from '@/lib/pdfview';
import { t, th } from '@/lib/i18n-client';
import { UserError } from '@/lib/errors';

// 签名的三种来源（手写 / 打字 / 图片）最后都变成一张裁掉空白的透明 PNG，放在隐藏字段 sigData 里；
// 位置放在隐藏字段 place 里：{ page, x, y, w }，都是相对「看到的页面」的比例（x、y 为签名左上角）。run() 只读这两个字段。
interface Place { page: number; x: number; y: number; w: number; }

const INKS = { black: '#141414', blue: '#1b3a8f' } as const;
const TYPE_STYLES: Record<string, string> = {
  hand: 'italic 400 96px "Snell Roundhand","Segoe Script","Apple Chancery","Brush Script MT","Lucida Handwriting",cursive',
  serif: 'italic 400 96px Georgia,"Times New Roman",serif',
  plain: '500 88px "Inter Variable",system-ui,sans-serif',
};

/** 裁掉四周的透明边，返回 PNG dataURL；全透明时返回 null */
function trimToPng(src: HTMLCanvasElement): { url: string; width: number; height: number } | null {
  const { width, height } = src;
  if (!width || !height) return null;
  const data = src.getContext('2d')!.getImageData(0, 0, width, height).data;
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  const pad = 4;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(width - 1, x1 + pad); y1 = Math.min(height - 1, y1 + pad);
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d')!.drawImage(src, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return { url: out.toDataURL('image/png'), width: out.width, height: out.height };
}

/** 拍下来的纸上签名：把接近白色的背景变透明，笔迹保留原色 */
function cutOutPaper(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i + 3] = Math.min(d[i + 3], lum >= 215 ? 0 : Math.min(255, (215 - lum) * 3));
  }
  ctx.putImageData(img, 0, 0);
}

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => `
    <fieldset class="opt-group">
      <legend>${th('sign-pdf.signature')}</legend>
      <div class="seg">
        <label><input type="radio" name="kind" value="draw" checked><span>${th('sign-pdf.draw')}</span></label>
        <label><input type="radio" name="kind" value="type"><span>${th('sign-pdf.type')}</span></label>
        <label><input type="radio" name="kind" value="image"><span>${th('sign-pdf.image')}</span></label>
      </div>
    </fieldset>
    <div class="opt-group" data-show-when="kind=draw">
      <canvas id="sig-pad" class="sig-pad" aria-label="${th('sign-pdf.padLabel')}"></canvas>
      <div class="sig-pad-row"><span class="hint">${th('sign-pdf.drawHint')}</span><button type="button" class="btn" id="sig-clear">${th('sign-pdf.clear')}</button></div>
    </div>
    <div class="opt-group" data-show-when="kind=type">
      <label for="sig-text">${th('sign-pdf.yourName')}</label>
      <input id="sig-text" name="sigText" type="text" autocomplete="name">
      <label for="sig-style">${th('sign-pdf.style')}</label>
      <select id="sig-style" name="sigStyle">
        <option value="hand">${th('sign-pdf.styleHand')}</option>
        <option value="serif">${th('sign-pdf.styleSerif')}</option>
        <option value="plain">${th('sign-pdf.stylePlain')}</option>
      </select>
    </div>
    <div class="opt-group" data-show-when="kind=image">
      <label for="sig-file">${th('sign-pdf.imageLabel')}</label>
      <input id="sig-file" type="file" accept="image/png,image/jpeg,image/webp">
      <label class="check"><input type="checkbox" name="sigCutout" checked> ${th('sign-pdf.cutout')}</label>
    </div>
    <fieldset class="opt-group" id="sig-ink">
      <legend>${th('sign-pdf.ink')}</legend>
      <label class="check"><input type="radio" name="ink" value="black" checked> ${th('sign-pdf.black')}</label>
      <label class="check"><input type="radio" name="ink" value="blue"> ${th('sign-pdf.blue')}</label>
    </fieldset>
    <div class="opt-group">
      <label class="check"><input type="checkbox" name="allPages"> ${th('sign-pdf.allPages')}</label>
    </div>
    <input type="hidden" name="sigData"><input type="hidden" name="place">`,

  async workspace(el, file, form) {
    const doc = await openWithPdfjs(file);
    const ac = new AbortController();
    const on = <K extends keyof HTMLElementEventMap>(target: EventTarget, type: K | string, fn: (e: any) => void) => target.addEventListener(type, fn, { signal: ac.signal });
    const q = <T extends HTMLElement>(sel: string, root: ParentNode = form) => root.querySelector(sel) as T;

    el.innerHTML = `
      <div class="sign-ws">
        <div class="sign-nav">
          <button type="button" class="icon-btn" data-nav="-1" aria-label="${th('sign-pdf.prevPage')}">‹</button>
          <span id="sign-page-label"></span>
          <button type="button" class="icon-btn" data-nav="1" aria-label="${th('sign-pdf.nextPage')}">›</button>
        </div>
        <div class="sign-stage"><div class="sign-page" id="sign-page">
          <div class="sig-box is-empty" id="sig-box"><img alt="" draggable="false"><span>${th('sign-pdf.placeholder')}</span><i class="sig-handle" aria-hidden="true"></i></div>
        </div></div>
        <p class="hint">${th('sign-pdf.placeHint')}</p>
      </div>`;
    const pageEl = q<HTMLElement>('#sign-page', el), box = q<HTMLElement>('#sig-box', el), boxImg = q<HTMLImageElement>('img', box);
    const label = q<HTMLElement>('#sign-page-label', el);
    const sigField = q<HTMLInputElement>('[name=sigData]'), placeField = q<HTMLInputElement>('[name=place]');

    // ---------- 放置 ----------
    const place: Place = { page: 0, x: 0.58, y: 0.8, w: 0.32 };
    let aspect = 0.35; // 签名图的高 / 宽
    let pageRatio = 1.414; // 页面的高 / 宽（显示方向）
    const boxH = () => (place.w * aspect) / pageRatio; // 占页面高度的比例
    const layout = () => {
      place.w = Math.min(Math.max(place.w, 0.06), 1);
      if (boxH() > 1) place.w = pageRatio / aspect;
      place.x = Math.min(Math.max(place.x, 0), 1 - place.w);
      place.y = Math.min(Math.max(place.y, 0), 1 - boxH());
      Object.assign(box.style, { left: `${place.x * 100}%`, top: `${place.y * 100}%`, width: `${place.w * 100}%`, aspectRatio: `1 / ${aspect}` });
      placeField.value = JSON.stringify(place);
    };

    let rendering = 0;
    const showPage = async (index: number) => {
      place.page = Math.min(Math.max(index, 0), doc.numPages - 1);
      label.textContent = t('sign-pdf.pageOf', { i: place.page + 1, n: doc.numPages });
      const mine = ++rendering;
      const canvas = await renderPage(doc, place.page, { scale: 2, maxWidth: 1400 });
      if (mine !== rendering) return;
      pageEl.querySelector('canvas')?.remove();
      pageEl.prepend(canvas);
      pageRatio = canvas.height / canvas.width;
      layout();
    };
    on(el, 'click', (e: MouseEvent) => {
      const nav = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
      if (nav) showPage(place.page + Number(nav.dataset.nav));
    });

    // 拖动 / 右下角缩放
    let drag: { mode: 'move' | 'size'; px: number; py: number; x: number; y: number; w: number } | null = null;
    on(box, 'pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      box.setPointerCapture(e.pointerId);
      drag = { mode: (e.target as HTMLElement).classList.contains('sig-handle') ? 'size' : 'move', px: e.clientX, py: e.clientY, x: place.x, y: place.y, w: place.w };
    });
    on(box, 'pointermove', (e: PointerEvent) => {
      if (!drag) return;
      const r = pageEl.getBoundingClientRect();
      const dx = (e.clientX - drag.px) / r.width, dy = (e.clientY - drag.py) / r.height;
      if (drag.mode === 'move') { place.x = drag.x + dx; place.y = drag.y + dy; }
      else place.w = Math.min(drag.w + dx, 1 - place.x, ((1 - place.y) * pageRatio) / aspect);
      layout();
    });
    for (const ev of ['pointerup', 'pointercancel']) on(box, ev, () => { drag = null; });

    // ---------- 签名 ----------
    const setSignature = (sig: ReturnType<typeof trimToPng>) => {
      sigField.value = sig?.url ?? '';
      box.classList.toggle('is-empty', !sig);
      if (sig) { boxImg.src = sig.url; aspect = sig.height / sig.width; } else boxImg.removeAttribute('src');
      layout();
    };
    const ink = () => INKS[(new FormData(form).get('ink') as keyof typeof INKS) || 'black'] ?? INKS.black;

    // 手写板：记下笔画，换颜色时重画
    const pad = q<HTMLCanvasElement>('#sig-pad');
    let strokes: { x: number; y: number }[][] = [];
    const sizePad = () => {
      const r = pad.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
      if (r.width && pad.width !== Math.round(r.width * dpr)) { pad.width = Math.round(r.width * dpr); pad.height = Math.round(r.height * dpr); }
    };
    const paintPad = () => {
      const ctx = pad.getContext('2d')!;
      ctx.clearRect(0, 0, pad.width, pad.height);
      ctx.strokeStyle = ctx.fillStyle = ink();
      ctx.lineWidth = Math.max(2, pad.width / 160);
      ctx.lineCap = ctx.lineJoin = 'round';
      for (const s of strokes) {
        const p = s.map((pt) => ({ x: pt.x * pad.width, y: pt.y * pad.height }));
        ctx.beginPath();
        if (p.length === 1) { ctx.arc(p[0].x, p[0].y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); continue; }
        ctx.moveTo(p[0].x, p[0].y);
        // 用相邻点的中点做二次曲线，线条才圆润
        for (let i = 1; i < p.length - 1; i++) ctx.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2);
        ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y);
        ctx.stroke();
      }
    };
    let stroke: { x: number; y: number }[] | null = null;
    const padPoint = (e: PointerEvent) => { const r = pad.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; };
    on(pad, 'pointerdown', (e: PointerEvent) => { e.preventDefault(); sizePad(); pad.setPointerCapture(e.pointerId); stroke = [padPoint(e)]; strokes.push(stroke); paintPad(); });
    on(pad, 'pointermove', (e: PointerEvent) => { if (stroke) { stroke.push(padPoint(e)); paintPad(); } });
    for (const ev of ['pointerup', 'pointercancel']) on(pad, ev, () => { if (stroke) { stroke = null; refresh(); } });
    on(q('#sig-clear'), 'click', () => { strokes = []; paintPad(); refresh(); });

    // 打字
    const typed = () => {
      const text = q<HTMLInputElement>('#sig-text').value.trim();
      if (!text) return null;
      const font = TYPE_STYLES[q<HTMLSelectElement>('#sig-style').value] ?? TYPE_STYLES.hand;
      const c = document.createElement('canvas'), ctx = c.getContext('2d')!;
      ctx.font = font;
      c.width = Math.ceil(ctx.measureText(text).width) + 80; c.height = 260;
      ctx.font = font; ctx.fillStyle = ink(); ctx.textBaseline = 'middle';
      ctx.fillText(text, 40, 130);
      return trimToPng(c);
    };

    // 图片
    let picture: HTMLCanvasElement | null = null;
    on(q('#sig-file'), 'change', async (e: Event) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      const img = new Image();
      img.src = URL.createObjectURL(f);
      try { await img.decode(); } catch { URL.revokeObjectURL(img.src); return; }
      const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      picture = document.createElement('canvas');
      picture.width = Math.round(img.naturalWidth * k); picture.height = Math.round(img.naturalHeight * k);
      picture.getContext('2d')!.drawImage(img, 0, 0, picture.width, picture.height);
      URL.revokeObjectURL(img.src);
      refresh();
    });
    const fromPicture = () => {
      if (!picture) return null;
      const c = document.createElement('canvas');
      c.width = picture.width; c.height = picture.height;
      c.getContext('2d')!.drawImage(picture, 0, 0);
      if (new FormData(form).get('sigCutout')) cutOutPaper(c);
      return trimToPng(c);
    };

    function refresh() {
      const kind = new FormData(form).get('kind');
      q('#sig-ink').classList.toggle('is-hidden', kind === 'image');
      if (kind === 'draw') { paintPad(); setSignature(strokes.length ? trimToPng(pad) : null); }
      else setSignature(kind === 'type' ? typed() : fromPicture());
    }
    on(form, 'change', refresh);
    on(q('#sig-text'), 'input', refresh);

    // 表单在换文件后会复用：清掉上一份文件留下的手写笔迹
    sizePad();
    refresh();
    await showPage(0);
    return () => { ac.abort(); doc.loadingTask.destroy(); };
  },

  async run(files, options, ctx) {
    const file = files[0];
    const sig = String(options.get('sigData') || '');
    const comma = sig.indexOf(',');
    if (!sig.startsWith('data:image/png;base64,') || comma < 0) throw new UserError(t('sign-pdf.needSignature'));
    let place: Place;
    try { place = JSON.parse(String(options.get('place'))); } catch { throw new UserError(t('sign-pdf.needSignature')); }

    ctx.progress(t('sign-pdf.signing'), 0.3);
    const doc = await PDFDocument.load(await file.arrayBuffer());
    const png = await doc.embedPng(Uint8Array.from(atob(sig.slice(comma + 1)), (c) => c.charCodeAt(0)));
    const pages = doc.getPages();
    const targets = options.get('allPages') ? pages : [pages[Math.min(Math.max(place.page, 0), pages.length - 1)]];
    for (const page of targets) {
      const view = pageView(page);
      const width = place.w * view.width;
      const height = width * (png.height / png.width);
      // place 的原点在左上角，视图坐标的原点在左下角
      const at = view.toUser(place.x * view.width, view.height - place.y * view.height - height);
      page.drawImage(png, { ...at, width, height, rotate: view.rotate });
    }
    const bytes = await doc.save({ useObjectStreams: true });
    return [{ name: `${stripExt(file.name)}_signed.pdf`, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
  },
};
export default mod;
