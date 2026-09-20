// 验收测试驱动：用系统 Chrome 打开真实工具页，走完「选文件 → 填选项 → 运行 → 下载」。
import { chromium } from 'playwright-core';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';

// 地址和浏览器都可以用环境变量覆盖：
//   BASE=http://localhost:4322 CHROME_PATH=/path/to/chrome node test/acceptance/01-edit.mjs
export const BASE = process.env.BASE ?? 'http://localhost:4321';
export const PROJ = fileURLToPath(new URL('../../', import.meta.url));
export const FIX = path.join(PROJ, 'test/fixtures');
export const DL = path.join(tmpdir(), 'shypdf-acceptance');
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export const fix = (p) => path.join(FIX, p);

export async function launch({ headless = true } = {}) {
  const browser = await chromium.launch({ executablePath: CHROME, headless, args: ['--no-sandbox'] });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 1000 } });
  return { browser, context };
}

/** 打开工具页，返回 page 和采集器 */
export async function openTool(context, slug, { locale = 'en' } = {}) {
  const page = await context.newPage();
  const consoleErrors = [], pageErrors = [], posts = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 300)));
  page.on('request', (r) => { if (r.method() !== 'GET' && r.method() !== 'HEAD') posts.push({ method: r.method(), url: r.url(), size: (r.postData() || '').length }); });
  const url = `${BASE}${locale === 'en' ? '' : '/' + locale}/${slug}/`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#tool-app');
  return { page, consoleErrors, pageErrors, posts, url };
}

/** 选文件；返回进入了哪个阶段（files / upload） */
export async function addFiles(page, files, { timeout = 30000 } = {}) {
  await page.setInputFiles('#file-input', files);
  await page.waitForFunction(() => {
    const f = document.getElementById('stage-files');
    const a = document.getElementById('upload-alert');
    return (f && !f.classList.contains('is-hidden')) || (a && !a.classList.contains('is-hidden'));
  }, null, { timeout });
  return {
    stage: await page.evaluate(() => (document.getElementById('stage-files').classList.contains('is-hidden') ? 'upload' : 'files')),
    alert: await alertText(page, '#upload-alert'),
  };
}

export async function alertText(page, sel) {
  return page.evaluate((s) => { const el = document.querySelector(s); return el && !el.classList.contains('is-hidden') ? el.textContent.trim() : ''; }, sel);
}

/** 设置选项表单：文本/数字直接赋值，radio/checkbox/select 按值选中，并派发 change */
export async function setOptions(page, options = {}) {
  return page.evaluate((opts) => {
    const form = document.getElementById('options');
    const missing = [];
    for (const [name, value] of Object.entries(opts)) {
      const els = [...form.querySelectorAll(`[name="${CSS.escape(name)}"]`)];
      if (!els.length) { missing.push(name); continue; }
      const el = els[0];
      if (el.type === 'radio') {
        const hit = els.find((e) => e.value === String(value));
        if (!hit) { missing.push(`${name}=${value}`); continue; }
        hit.checked = true; hit.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (el.type === 'checkbox') {
        el.checked = !!value; el.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (el.tagName === 'SELECT') {
        el.value = String(value); el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        el.value = String(value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    return { missing, fields: [...new FormData(form).keys()] };
  }, options);
}

/** 点开始，等结果或报错；下载的文件存到 dir */
export async function run(page, { dir, timeout = 180000 } = {}) {
  const outDir = dir ?? path.join(DL, 'run-' + Date.now());
  await mkdir(outDir, { recursive: true });
  const saved = [];
  const onDownload = async (d) => {
    const p = path.join(outDir, d.suggestedFilename());
    try { await d.saveAs(p); saved.push(p); } catch { /* 同名重复下载忽略 */ }
  };
  page.on('download', onDownload);
  await page.click('#run');
  let state = 'timeout';
  try {
    await page.waitForFunction(() => {
      const r = document.getElementById('stage-result');
      const a = document.getElementById('run-alert');
      return (r && !r.classList.contains('is-hidden')) || (a && !a.classList.contains('is-hidden'));
    }, null, { timeout });
    state = await page.evaluate(() => (document.getElementById('stage-result').classList.contains('is-hidden') ? 'alert' : 'result'));
  } catch (e) { state = 'timeout'; }
  const alert = await alertText(page, '#run-alert');
  const meta = await page.evaluate(() => document.getElementById('result-meta')?.textContent?.trim() ?? '');
  const buttons = await page.evaluate(() => [...document.querySelectorAll('#result-actions button')].map((b) => b.textContent.trim()));
  if (state === 'result') await page.waitForTimeout(700); // 等自动下载落盘
  page.off('download', onDownload);
  return { state, alert, meta, buttons, dir: outDir, files: saved };
}

/** 一条用例的完整流程 */
export async function runCase(context, spec) {
  const { slug, locale = 'en', files, options = {}, before, after, timeout } = spec;
  const t0 = Date.now();
  const { page, consoleErrors, pageErrors, posts } = await openTool(context, slug, { locale });
  const out = { id: spec.id, slug, consoleErrors, pageErrors, posts };
  try {
    const add = await addFiles(page, files, { timeout: spec.addTimeout });
    out.uploadStage = add.stage;
    out.uploadAlert = add.alert;
    if (add.stage === 'upload') { out.state = 'rejected'; return out; }
    if (before) out.beforeResult = await before(page);
    if (spec.skipRun) { out.state = 'skipped-run'; return out; }
    const so = await setOptions(page, options);
    out.missingOptions = so.missing;
    out.formFields = so.fields;
    const r = await run(page, { dir: spec.dir, timeout });
    Object.assign(out, { state: r.state, alert: r.alert, meta: r.meta, buttons: r.buttons, dir: r.dir, files: r.files });
    if (after) out.afterResult = await after(page, r);
  } catch (e) {
    out.state = 'error';
    out.error = String(e.message).split('\n')[0].slice(0, 200);
  } finally {
    out.ms = Date.now() - t0;
    out.reports = (out.posts ?? []).filter((x) => x.url.includes('/api/error-report')).length;
    if (!spec.keepOpen) await page.close();
  }
  return out;
}

// ---------- 结果校验（用项目里的 pdf-lib / pdfjs） ----------
const projMod = (p) => import(path.join(PROJ, 'node_modules', p));
export async function pdfInfo(file) {
  const { PDFDocument } = await projMod('pdf-lib/cjs/index.js');
  const bytes = await readFile(file);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return { pages: doc.getPageCount(), bytes: bytes.length, sizes: doc.getPages().map((p) => [Math.round(p.getSize().width), Math.round(p.getSize().height), p.getRotation().angle]) };
}
let pdfjsMod = null;
export async function pdfText(file) {
  pdfjsMod ??= await projMod('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjsMod.getDocument({ data: new Uint8Array(await readFile(file)), useSystemFonts: false }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) pages.push((await (await doc.getPage(i)).getTextContent()).items.map((it) => it.str ?? '').join(' '));
  await doc.loadingTask.destroy();
  return pages;
}
export async function zipNames(file) {
  const { default: JSZip } = await projMod('jszip/dist/jszip.min.js');
  const zip = await JSZip.loadAsync(await readFile(file));
  return Object.keys(zip.files);
}
export const ls = async (dir) => (await readdir(dir)).sort();
