// 工具页客户端逻辑。页面结构见 src/pages/[...locale]/[slug].astro；文案经 lib/i18n-client.ts 取当前语言；工具行为见 src/tools/<slug>.ts。
import { loadTool } from '@/tools/index';
import type { ToolModule, OutputFile } from '@/lib/types';
import { formatBytes, downloadBlob, zipOutputs, stripExt } from '@/lib/files';
import { t, tn, th, escapeHtml } from '@/lib/i18n-client';
import { reportError, installGlobalReporter } from '@/lib/report';

const root = document.getElementById('tool-app')!;
const cfg = {
  slug: root.dataset.slug!,
  multiple: root.dataset.multiple === 'true',
  minFiles: Number(root.dataset.minFiles || 1),
  maxMB: Number(root.dataset.maxMb || 50),
  maxFiles: Number(root.dataset.maxFiles || 20),
  button: root.dataset.button || 'Start',
};

installGlobalReporter(cfg.slug);

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stages = { upload: $('stage-upload'), files: $('stage-files'), result: $('stage-result') };
const dropzone = $('dropzone');
const fileInput = $<HTMLInputElement>('file-input');
const uploadAlert = $('upload-alert');
const itemsEl = $('items');
const filesMeta = $('files-meta');
const workNote = $('work-note');
const optionsForm = $<HTMLFormElement>('options');
const runBtn = $<HTMLButtonElement>('run');
const runAlert = $('run-alert');
const progressEl = $('progress');
const progressBar = $('progress-bar');

// ---------- 状态 ----------
interface Item { id: number; file: File; pageIndex?: number; rotation: number; thumb?: HTMLCanvasElement | HTMLImageElement; }
let tool: ToolModule | null = null;
let items: Item[] = [];
let nextId = 1;
let outputs: OutputFile[] = [];
let busy = false;
let closeWorkspace: (() => void) | void;

function show(stage: keyof typeof stages) {
  for (const [k, el] of Object.entries(stages)) el.classList.toggle('is-hidden', k !== stage);
  window.scrollTo({ top: 0 });
}
function alertIn(el: HTMLElement, msg: string) { el.textContent = msg; el.classList.remove('is-hidden'); }
function clearAlert(el: HTMLElement) { el.textContent = ''; el.classList.add('is-hidden'); }
function setProgress(msg: string, ratio?: number) {
  progressEl.textContent = msg;
  progressBar.style.width = ratio == null ? '0' : `${Math.round(ratio * 100)}%`;
}

// ---------- 阶段 A：接收文件 ----------
$('pick').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => { if (fileInput.files?.length) acceptFiles(Array.from(fileInput.files)); fileInput.value = ''; });
for (const ev of ['dragenter', 'dragover']) dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('is-over'); });
for (const ev of ['dragleave', 'drop']) dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('is-over'); });
dropzone.addEventListener('drop', (e) => { const fs = Array.from((e as DragEvent).dataTransfer?.files ?? []); if (fs.length) acceptFiles(fs); });
// 也允许直接拖到文件列表阶段
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
  if (stages.files.classList.contains('is-hidden')) return;
  e.preventDefault();
  const fs = Array.from((e as DragEvent).dataTransfer?.files ?? []);
  if (fs.length) acceptFiles(fs);
});

function validate(files: File[]): File[] {
  const accept = (root.querySelector('#file-input') as HTMLInputElement).accept.split(',').map((s) => s.trim().toLowerCase());
  const ok: File[] = [], bad: string[] = [];
  for (const f of files) {
    const ext = '.' + f.name.split('.').pop()!.toLowerCase();
    const typeOk = accept.some((a) => a === f.type || a === ext || (a.endsWith('/*') && f.type.startsWith(a.slice(0, -1))));
    if (!typeOk) { bad.push(t('app.unsupported', { name: f.name })); continue; }
    if (f.size > cfg.maxMB * 1024 * 1024) { bad.push(t('app.tooLarge', { name: f.name, mb: cfg.maxMB })); continue; }
    ok.push(f);
  }
  const target = stages.upload.classList.contains('is-hidden') ? runAlert : uploadAlert;
  if (bad.length) alertIn(target, bad.join(' · ')); else clearAlert(target);
  return ok;
}

async function acceptFiles(files: File[]) {
  const ok = validate(files);
  if (!ok.length) return;
  if (!tool) {
    try { tool = await loadTool(cfg.slug); }
    catch (e) { reportError(e, { stage: 'load', tool: cfg.slug }); alertIn(uploadAlert, t('app.loadFailed', { msg: (e as Error).message })); return; }
    optionsForm.innerHTML = tool.optionsHtml();
    bindConditionalFields();
  }
  if (!cfg.multiple) items = [];
  if (tool.workspace) {
    // 工具自己画工作区（lib/types.ts 的 workspace）
    items = [{ id: nextId++, file: ok[0], rotation: 0 }];
    show('files');
    render();
    closeWorkspace?.();
    itemsEl.innerHTML = '';
    try { closeWorkspace = await tool.workspace(itemsEl, ok[0], optionsForm); }
    catch (e) { reportError(e, { stage: 'open', tool: cfg.slug, files: ok }); reset(); alertIn(uploadAlert, t('app.cantOpen', { msg: (e as Error).message })); }
    return;
  }
  if (tool.mode === 'pages') {
    items = [];
    await expandPages(ok[0]);
  } else {
    for (const f of ok) {
      if (items.length >= cfg.maxFiles) { alertIn(runAlert, t('app.maxFiles', { n: cfg.maxFiles })); break; }
      items.push({ id: nextId++, file: f, rotation: 0 });
    }
  }
  show('files');
  render();
  loadThumbs();
}

/** pages 模式：把单个 PDF 展开成逐页条目 */
async function expandPages(file: File) {
  setProgress(t('app.readingPages'));
  const { openWithPdfjs } = await import('@/lib/pdfjs');
  try {
    (root as any).__pdfDoc?.loadingTask.destroy();
    (root as any).__pdfDoc = null;
    const doc = await openWithPdfjs(file);
    for (let i = 0; i < doc.numPages; i++) items.push({ id: nextId++, file, pageIndex: i, rotation: 0 });
    (root as any).__pdfDoc = doc;
  } catch (e) {
    reportError(e, { stage: 'open', tool: cfg.slug, files: [file] });
    alertIn(uploadAlert, t('app.cantOpen', { msg: (e as Error).message }));
    throw e;
  } finally { setProgress(''); }
}

// 选项面板里 data-show-when="name=value"（或 "name!=value"）的字段随选择显示/隐藏
function bindConditionalFields() {
  const update = () => {
    const data = new FormData(optionsForm);
    optionsForm.querySelectorAll<HTMLElement>('[data-show-when]').forEach((el) => {
      const [, k, op, v] = /^([^!=]+)(!?=)(.*)$/.exec(el.dataset.showWhen!)!;
      el.classList.toggle('is-hidden', (String(data.get(k)) === v) !== (op === '='));
    });
  };
  optionsForm.addEventListener('change', update);
  update();
}

// ---------- 阶段 B：列表渲染与排序 ----------
function render() {
  const isPages = tool?.mode === 'pages';
  const custom = !!tool?.workspace;
  itemsEl.classList.toggle('is-workspace', custom);
  if (!custom) itemsEl.innerHTML = '';
  if (!custom) items.forEach((it, idx) => {
    const pageLabel = isPages ? th('app.page', { n: it.pageIndex! + 1 }) : '';
    const card = document.createElement('div');
    card.className = 'item';
    card.draggable = true;
    card.dataset.idx = String(idx);
    card.innerHTML = `
      <div class="item-top">
        <span class="item-n">${idx + 1}</span>
        <span class="item-tools">
          <button type="button" class="icon-btn" data-act="left" aria-label="${th('app.moveEarlier')}">‹</button>
          <button type="button" class="icon-btn" data-act="right" aria-label="${th('app.moveLater')}">›</button>
          ${isPages ? `<button type="button" class="icon-btn" data-act="rotate" aria-label="${th('app.rotate')}">↻</button>` : ''}
          <button type="button" class="icon-btn" data-act="remove" aria-label="${th('app.remove')}">×</button>
        </span>
      </div>
      <div class="thumb">${isPages ? pageLabel : previewable(it.file) ? th('app.preview') : badge(it.file.name)}</div>
      <div class="item-name" title="${escapeHtml(it.file.name)}">${isPages ? pageLabel : escapeHtml(it.file.name)}</div>
      <div class="item-meta">${isPages ? (it.rotation ? th('app.rotated', { deg: it.rotation }) : '') : formatBytes(it.file.size)}</div>`;
    if (it.thumb) {
      const thumbEl = card.querySelector('.thumb')!;
      thumbEl.textContent = '';
      thumbEl.appendChild(it.thumb);
      (it.thumb as HTMLElement).style.transform = `rotate(${it.rotation}deg)`;
    }
    itemsEl.appendChild(card);
  });
  if (!custom && (cfg.multiple || tool?.mode === 'pages')) {
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'item-add';
    add.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg><span>${th(tool?.mode === 'pages' ? 'app.chooseAnother' : 'app.addMore')}</span>`;
    add.addEventListener('click', () => fileInput.click());
    itemsEl.appendChild(add);
  }
  const total = isPages ? items.length : items.reduce((s, i) => s + i.file.size, 0);
  filesMeta.textContent = isPages ? tn('app.pages', items.length) : `${tn('app.files', items.length)} · ${formatBytes(total)}`;
  workNote.textContent = [isPages ? t('app.dragThumbs') : cfg.multiple ? t('app.dragCards') : '', t('app.local')].filter(Boolean).join(' · ');
  runBtn.textContent = cfg.button;
  runBtn.disabled = items.length < cfg.minFiles;
  $('sort-name').classList.toggle('is-hidden', !cfg.multiple || isPages);
}


itemsEl.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!btn) return;
  const card = btn.closest<HTMLElement>('.item')!;
  const idx = Number(card.dataset.idx);
  const act = btn.dataset.act;
  if (act === 'remove') items.splice(idx, 1);
  else if (act === 'left' && idx > 0) [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
  else if (act === 'right' && idx < items.length - 1) [items[idx + 1], items[idx]] = [items[idx], items[idx + 1]];
  else if (act === 'rotate') items[idx].rotation = (items[idx].rotation + 90) % 360;
  render();
  if (!items.length) { show('upload'); }
});

// HTML5 拖拽排序（桌面）；手机用 ‹ › 按钮
let dragFrom: number | null = null;
itemsEl.addEventListener('dragstart', (e) => {
  const card = (e.target as HTMLElement).closest<HTMLElement>('.item');
  if (!card) return;
  dragFrom = Number(card.dataset.idx);
  card.classList.add('is-dragging');
  e.dataTransfer!.effectAllowed = 'move';
});
itemsEl.addEventListener('dragover', (e) => {
  const card = (e.target as HTMLElement).closest<HTMLElement>('.item');
  if (!card || dragFrom == null) return;
  e.preventDefault();
  itemsEl.querySelectorAll('.is-target').forEach((c) => c.classList.remove('is-target'));
  card.classList.add('is-target');
});
itemsEl.addEventListener('drop', (e) => {
  const card = (e.target as HTMLElement).closest<HTMLElement>('.item');
  if (!card || dragFrom == null) return;
  e.preventDefault();
  const to = Number(card.dataset.idx);
  const [moved] = items.splice(dragFrom, 1);
  items.splice(to, 0, moved);
  dragFrom = null;
  render();
});
itemsEl.addEventListener('dragend', () => { dragFrom = null; itemsEl.querySelectorAll('.is-dragging,.is-target').forEach((c) => c.classList.remove('is-dragging', 'is-target')); });

$('sort-name').addEventListener('click', () => { items.sort((a, b) => a.file.name.localeCompare(b.file.name, document.documentElement.lang, { numeric: true, sensitivity: 'base' })); render(); });
function reset() { closeWorkspace?.(); closeWorkspace = undefined; items = []; outputs = []; show('upload'); }
$('clear-all').addEventListener('click', reset);

// 缩略图：pdf 首页 / 各页用 pdf.js，图片用 <img>
async function loadThumbs() {
  const pending = items.filter((i) => !i.thumb);
  if (!pending.length) return;
  if (pending[0].file.type.startsWith('image/')) {
    for (const it of pending) {
      const img = new Image();
      img.src = URL.createObjectURL(it.file);
      img.onload = () => URL.revokeObjectURL(img.src);
      it.thumb = img;
    }
    render();
    return;
  }
  const { openWithPdfjs, renderPage } = await import('@/lib/pdfjs');
  const docs = new Map<File, any>();
  for (const it of pending) {
    if (!items.includes(it)) continue;
    if (!previewable(it.file)) continue;
    try {
      let doc = (root as any).__pdfDoc && tool?.mode === 'pages' ? (root as any).__pdfDoc : docs.get(it.file);
      if (!doc) { doc = await openWithPdfjs(it.file); docs.set(it.file, doc); }
      it.thumb = await renderPage(doc, it.pageIndex ?? 0, { maxWidth: 260 });
    } catch {
      /* 加密或损坏的文件没有缩略图，不影响处理 */
    }
    const card = itemsEl.querySelector<HTMLElement>(`.item[data-idx="${items.indexOf(it)}"] .thumb`);
    if (card && it.thumb) { card.textContent = ''; card.appendChild(it.thumb); }
  }
  for (const d of docs.values()) d.loadingTask.destroy();
}

// Word 等格式没有缩略图，用扩展名徽标代替
const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()! : '').toUpperCase().slice(0, 5);
const badge = (name: string) => `<span class="file-badge">${escapeHtml(extOf(name))}</span>`;
const previewable = (f: File) => f.type.startsWith('image/') || f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

// ---------- 运行 ----------
runBtn.addEventListener('click', async () => {
  if (!tool || busy) return;
  busy = true;
  runBtn.disabled = true;
  clearAlert(runAlert);
  setProgress(t('app.gettingReady'), 0.02);
  const files = tool.mode === 'pages' ? [items[0].file] : items.map((i) => i.file);
  const ctx = {
    progress: setProgress,
    pageOrder: tool.mode === 'pages' ? items.map((i) => i.pageIndex!) : undefined,
    pageRotations: tool.mode === 'pages' ? Object.fromEntries(items.filter((i) => i.rotation).map((i) => [i.pageIndex!, i.rotation])) : undefined,
  };
  try {
    outputs = await tool.run(files, new FormData(optionsForm), ctx);
    setProgress('', 1);
    showResult(files);
  } catch (e) {
    console.error(e);
    reportError(e, { stage: 'run', tool: cfg.slug, files, form: optionsForm });
    alertIn(runAlert, (e as Error).message || t('app.failed'));
    setProgress('', 0);
  } finally {
    busy = false;
    runBtn.disabled = false;
  }
});

// ---------- 阶段 C：结果 ----------
async function showResult(inputs: File[]) {
  const actions = $('result-actions');
  const meta = $('result-meta');
  const preview = $('result-preview');
  actions.innerHTML = '';
  preview.innerHTML = '';
  const total = outputs.reduce((s, o) => s + o.blob.size, 0);
  meta.textContent = outputs.length === 1 ? `${outputs[0].name} · ${formatBytes(total)}` : `${tn('app.files', outputs.length)} · ${formatBytes(total)}`;
  if (tool?.summary) meta.textContent += ` · ${tool.summary(inputs, outputs)}`;
  // 多个输出：主按钮下载 zip；文件不多时再列出单个文件
  const main = outputs.length > 1 ? await zipOutputs(outputs, `${stripExt(inputs[0].name)}_${cfg.slug.replace(/-pdf$/, '')}.zip`) : outputs[0];
  const icon = (stroke: string) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>`;
  const addButton = (o: OutputFile, cls: string, html: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.innerHTML = html;
    b.addEventListener('click', () => downloadBlob(o.blob, o.name));
    actions.appendChild(b);
  };
  addButton(main, 'btn-primary', `${icon('#fff')} ${th(outputs.length > 1 ? 'app.downloadAll' : 'app.download')}`);
  if (outputs.length > 1 && outputs.length <= 6) for (const o of outputs) addButton(o, 'btn', `${icon('currentColor')} ${escapeHtml(o.name)}`);
  show('result');
  // 自动触发一次下载
  downloadBlob(main.blob, main.name);
  // 预览：PDF 首页 / 图片
  const first = outputs[0];
  try {
    if (first.blob.type === 'application/pdf') {
      const { openWithPdfjs, renderPage } = await import('@/lib/pdfjs');
      const doc = await openWithPdfjs(new File([first.blob], first.name, { type: 'application/pdf' }));
      preview.appendChild(await renderPage(doc, 0, { maxWidth: 180 }));
      doc.loadingTask.destroy();
    } else if (first.blob.type.startsWith('image/')) {
      const img = new Image(); img.src = URL.createObjectURL(first.blob); preview.appendChild(img);
    } else { preview.innerHTML = badge(outputs.length > 1 ? '.zip' : first.name); }
  } catch { preview.textContent = ''; }
}

$('back').addEventListener('click', () => show('files'));
$('restart').addEventListener('click', reset);
