// P1–P12 通用 pattern：上传方式、校验、列表操作、进度、结果页、加密兜底、离线、不上传文件
import { launch, openTool, addFiles, setOptions, run, fix, pdfInfo, alertText, BASE } from './lib.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const P = (n) => fix('pdf/' + n);
const results = [];
const check = (id, ok, msg) => { results.push({ id, ok: !!ok, msg }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(30)} ${msg}`); };

async function dropFiles(page, selector, files) {
  const payload = [];
  for (const f of files) payload.push({ name: path.basename(f), b64: (await readFile(f)).toString('base64'), type: f.endsWith('.pdf') ? 'application/pdf' : 'image/png' });
  return page.evaluate(({ sel, payload }) => {
    const dt = new DataTransfer();
    for (const p of payload) {
      const bin = atob(p.b64), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      dt.items.add(new File([arr], p.name, { type: p.type }));
    }
    const el = document.querySelector(sel);
    el.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    el.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, { sel: selector, payload });
}
const stageOf = (page) => page.evaluate(() => ['upload', 'files', 'result'].find((s) => !document.getElementById('stage-' + s).classList.contains('is-hidden')));

const { browser, context } = await launch();

// ---------- P1 三种投喂方式 ----------
{
  const { page } = await openTool(context, 'merge-pdf');
  await dropFiles(page, '#dropzone', [P('text-5p.pdf'), P('text-1p.pdf')]);
  await page.waitForTimeout(800);
  const n1 = await page.evaluate(() => document.querySelectorAll('#items .item').length);
  check('P1/拖到上传区', n1 === 2, `拖放 2 个文件后卡片数 ${n1}`);
  await dropFiles(page, '#stage-files', [P('letter-3p.pdf')]);
  await page.waitForTimeout(600);
  const n2 = await page.evaluate(() => document.querySelectorAll('#items .item').length);
  check('P1/在文件列表阶段再拖', n2 === 3, `再拖 1 个后卡片数 ${n2}`);
  const over = await page.evaluate(() => { const dz = document.getElementById('dropzone');
    dz.dispatchEvent(new DragEvent('dragenter', { dataTransfer: new DataTransfer(), bubbles: true, cancelable: true }));
    const on = dz.classList.contains('is-over');
    dz.dispatchEvent(new DragEvent('dragleave', { dataTransfer: new DataTransfer(), bubbles: true, cancelable: true }));
    return { on, off: dz.classList.contains('is-over') }; });
  check('P1/拖拽高亮态', over.on && !over.off, `dragenter 高亮=${over.on}，dragleave 复原=${!over.off}`);
  await page.close();
}

// ---------- P2 类型不符 ----------
for (const [tool, file, label] of [['merge-pdf', fix('office/report-rich.docx'), '把 docx 传给 PDF 工具'], ['jpg-to-pdf', P('text-5p.pdf'), '把 PDF 传给图片工具']]) {
  const { page, pageErrors } = await openTool(context, tool);
  const a = await addFiles(page, [file]);
  check('P2/' + label, a.stage === 'upload' && /unsupported|support/i.test(a.alert) && !pageErrors.length,
    `阶段=${a.stage}，提示「${a.alert}」，未捕获异常 ${pageErrors.length} 个`);
  await page.close();
}

// ---------- P3 体积上限 ----------
{
  const { page } = await openTool(context, 'compress-pdf');
  const a = await addFiles(page, [fix('bad/oversize-53mb.pdf')], { timeout: 60000 });
  check('P3/超过 50 MB', a.stage === 'upload' && /50/.test(a.alert), `阶段=${a.stage}，提示「${a.alert}」`);
  await page.close();
}

// ---------- P4 数量上限 ----------
{
  const { page } = await openTool(context, 'jpg-to-pdf');
  const many = Array.from({ length: 25 }, () => fix('images/tiny-16px.png'));
  await page.setInputFiles('#file-input', many);
  await page.waitForTimeout(1500);
  const n = await page.evaluate(() => document.querySelectorAll('#items .item').length);
  const alert = await alertText(page, '#run-alert');
  check('P4/超过 20 个文件', n === 20 && /20/.test(alert), `收下 ${n} 个，提示「${alert}」`);
  await page.close();
}

// ---------- P5 列表操作 ----------
{
  const { page } = await openTool(context, 'merge-pdf');
  await addFiles(page, [P('letter-3p.pdf'), P('cjk-text-2p.pdf'), P('text-1p.pdf')]);
  await page.waitForTimeout(400);
  const names = () => page.evaluate(() => [...document.querySelectorAll('#items .item-name')].map((e) => e.textContent.trim()));
  const before = await names();
  await page.click('#sort-name');
  const sorted = await names();
  check('P5/按名称排序', sorted.join() === [...before].sort().join(), `${before.join(' , ')} → ${sorted.join(' , ')}`);
  await page.click('#items .item[data-idx="0"] [data-act="right"]');
  const moved = await names();
  check('P5/‹ › 换位', moved[0] === sorted[1] && moved[1] === sorted[0], moved.join(' , '));
  await page.click('#items .item[data-idx="2"] [data-act="remove"]');
  check('P5/删除卡片', (await names()).length === 2, '剩 ' + (await names()).length + ' 个');
  await page.click('#clear-all');
  check('P5/清空回到上传阶段', (await stageOf(page)) === 'upload', '当前阶段 ' + (await stageOf(page)));
  const again = await addFiles(page, [P('text-5p.pdf'), P('text-1p.pdf')]);
  check('P5/清空后能重新开始', again.stage === 'files', '阶段 ' + again.stage);
  await page.close();
}

// ---------- P6 缩略图 ----------
{
  const { page, pageErrors } = await openTool(context, 'pdf-to-jpg');
  await addFiles(page, [P('photos-12p.pdf')], { timeout: 60000 });
  await page.waitForFunction(() => !!document.querySelector('#items .thumb canvas'), null, { timeout: 60000 }).catch(() => {});
  const hasThumb = await page.evaluate(() => !!document.querySelector('#items .thumb canvas'));
  check('P6/PDF 缩略图', hasThumb, '17 MB 文件的首页缩略图渲染出来了');
  await page.close();

  const { page: p2, pageErrors: e2 } = await openTool(context, 'compress-pdf');
  await addFiles(p2, [P('encrypted-user-pw-open123.pdf')]);
  await p2.waitForTimeout(1500);
  check('P6/加密文件无缩略图但不崩', e2.length === 0 && (await stageOf(p2)) === 'files', `未捕获异常 ${e2.length} 个，阶段 ${await stageOf(p2)}`);
  await p2.close();
}

// ---------- P7 进度与禁用 ----------
{
  const { page } = await openTool(context, 'compress-pdf');
  await addFiles(page, [P('photos-12p.pdf')], { timeout: 60000 });
  await setOptions(page, { mode: 'strong', dpi: '150' });
  const seen = { texts: new Set(), widths: new Set(), disabled: false };
  const poll = setInterval(async () => {
    try { const s = await page.evaluate(() => ({ t: document.getElementById('progress').textContent, w: document.getElementById('progress-bar').style.width, d: document.getElementById('run').disabled }));
      if (s.t) seen.texts.add(s.t); if (s.w) seen.widths.add(s.w); if (s.d) seen.disabled = true; } catch {}
  }, 120);
  const r = await run(page, { timeout: 300000 });
  clearInterval(poll);
  check('P7/进度文案在变', seen.texts.size >= 2, `采到 ${seen.texts.size} 种文案，例：${[...seen.texts][0]}`);
  check('P7/进度条在推进', seen.widths.size >= 2, `采到 ${seen.widths.size} 种宽度：${[...seen.widths].slice(0, 4).join(', ')}`);
  check('P7/运行中按钮置灰', seen.disabled, '按钮 disabled 被观察到');
  check('P7/结束后可再次运行', (await page.evaluate(() => document.getElementById('run').disabled)) === false, '按钮已恢复');
  await page.close();
}

// ---------- P8 结果页 ----------
{
  const { page } = await openTool(context, 'split-pdf');
  await addFiles(page, [P('text-5p.pdf')]);
  await setOptions(page, { mode: 'ranges', ranges: '1-2, 4' });
  const r = await run(page, {});
  check('P8/自动下载', r.files.length >= 1, `下载到 ${r.files.length} 个文件：${r.files.map((f) => path.basename(f)).join(', ')}`);
  check('P8/结果摘要', /\d/.test(r.meta), `摘要「${r.meta}」`);
  check('P8/预览图', await page.evaluate(() => !!document.querySelector('#result-preview canvas, #result-preview img')), '结果页有预览');
  await page.click('#back');
  check('P8/返回选项', (await stageOf(page)) === 'files', '阶段 ' + (await stageOf(page)));
  const r2 = await run(page, {});
  check('P8/可再次运行', r2.state === 'result', '再跑一次 ' + r2.state);
  await page.click('#restart');
  check('P8/重新开始', (await stageOf(page)) === 'upload', '阶段 ' + (await stageOf(page)));
  await page.close();
}

// ---------- P10 加密文件兜底 ----------
// 三条路径都要覆盖：run() 里 pdf-lib 抛的、pages 模式展开页面时 pdf.js 抛的、自定义工作区打开文件时抛的
for (const [tool, locale] of [['split-pdf', 'en'], ['compress-pdf', 'zh'], ['add-watermark', 'ja'], ['pdf-to-jpg', 'zh'], ['organize-pdf', 'zh'], ['sign-pdf', 'de'], ['fill-pdf', 'en']]) {
  const { page, pageErrors } = await openTool(context, tool, { locale });
  const a = await addFiles(page, [P('encrypted-user-pw-open123.pdf')]);
  await page.waitForTimeout(400);
  // 自定义工作区（签名 / 填表单）打不开文件时会退回上传阶段，所以要重新读一次
  const stage = await stageOf(page);
  let where = stage === 'upload' ? '#upload-alert' : '#run-alert';
  if (stage === 'files') {
    if (tool === 'add-watermark') await setOptions(page, { text: 'X' });
    const r = await run(page, { timeout: 60000 });
    if (!r.alert) where = '#upload-alert';
  }
  const info = await page.evaluate((sel) => {
    for (const s of [sel, '#upload-alert', '#run-alert']) {
      const el = document.querySelector(s);
      if (el && !el.classList.contains('is-hidden') && el.textContent.trim()) {
        return { text: el.textContent.trim(), href: el.querySelector('a')?.getAttribute('href') ?? '' };
      }
    }
    return { text: '', href: '' };
  }, where);
  const raw = /PDFDocument\.load|ignoreEncryption|`|No password given/.test(info.text);
  const localized = locale === 'en' ? /password-protected/i.test(info.text) : /[^\x00-\x7F]/.test(info.text);
  const linked = info.href.includes('/unlock-pdf/') && (locale === 'en' || info.href.startsWith('/' + locale + '/'));
  check(`P10/${locale}/${tool}`, !!info.text && !raw && localized && linked && !pageErrors.length,
    `${raw ? '⚠ 仍是原始报错' : '友好文案'}${localized ? '' : '（⚠ 没跟随语言）'}，链接 ${info.href || '无'}：「${info.text.slice(0, 46)}…」`);
  await page.close();
}

// ---------- P11 离线 ----------
{
  const { page } = await openTool(context, 'merge-pdf');
  await addFiles(page, [P('text-5p.pdf'), P('text-1p.pdf')]);   // 先让工具模块加载完
  await context.setOffline(true);
  const r = await run(page, { timeout: 60000 });
  const i = r.files[0] ? await pdfInfo(r.files[0]) : null;
  check('P11/断网后仍能处理', r.state === 'result' && i?.pages === 6, `阶段 ${r.state}，输出 ${i?.pages} 页`);
  await context.setOffline(false);
  await page.close();
}
{ // 断网后新开工具页（首次加载依赖）——记录行为
  await context.setOffline(true);
  let note = '';
  try { const { page } = await openTool(context, 'rotate-check-offline'); await page.close(); } catch (e) { note = String(e.message).split('\n')[0].slice(0, 60); }
  await context.setOffline(false);
  check('P11/断网后新开页面（信息项）', true, note ? '打不开（预期，没有 Service Worker）：' + note : '仍能打开');
}

// ---------- P12 不上传文件 ----------
{
  const { page } = await openTool(context, 'pdf-to-word');
  const reqs = [];
  page.on('request', (r) => reqs.push({ m: r.method(), u: r.url(), len: (r.postData() || '').length }));
  await addFiles(page, [P('cjk-text-2p.pdf')]);
  const r = await run(page, { timeout: 120000 });
  const nonGet = reqs.filter((x) => x.m !== 'GET' && x.m !== 'HEAD');
  const external = reqs.filter((x) => !x.u.startsWith(BASE));
  check('P12/没有任何上传请求', nonGet.length === 0, `非 GET 请求 ${nonGet.length} 个`);
  check('P12/没有外部域请求', external.length === 0, external.length ? external.map((e) => e.u).join(', ') : '全部请求都指向本站');
  check('P12/处理仍然成功', r.state === 'result', '阶段 ' + r.state);
  await page.close();
}

await browser.close();
await mkdir(new URL('./results/', import.meta.url), { recursive: true });
await writeFile(new URL('./results/06-generic.json', import.meta.url), JSON.stringify(results, null, 1));
const bad = results.filter((r) => !r.ok);
console.log(`\n06-generic: ${results.length - bad.length}/${results.length} 通过` + (bad.length ? `，失败：${bad.map((b) => b.id).join(', ')}` : ''));
