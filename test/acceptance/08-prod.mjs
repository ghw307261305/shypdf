// 生产构建下的验收：懒加载 / vendor 路径 / 报错上报（dev 里被关掉，只能在这里验）
import { launch, openTool, addFiles, setOptions, run, fix, pdfInfo, pdfText } from './lib.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const results = [];
const check = (id, ok, msg) => { results.push({ id, ok: !!ok, msg }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(32)} ${msg}`); };

const { browser, context } = await launch();
// 直接改 BASE：lib.mjs 里的 openTool 用常量，这里自己开页面
const BASE = process.env.PREVIEW_BASE ?? 'http://localhost:4325'; // astro preview --port 4325
async function tool(slug, { locale = 'en' } = {}) {
  const page = await context.newPage();
  const consoleErrors = [], pageErrors = [], reqs = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 200)));
  page.on('request', (r) => reqs.push({ m: r.method(), u: r.url() }));
  await page.goto(`${BASE}${locale === 'en' ? '' : '/' + locale}/${slug}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#tool-app');
  return { page, consoleErrors, pageErrors, reqs };
}

// 各类工具在生产构建下各跑一个
const smoke = [
  ['merge-pdf', [fix('pdf/text-5p.pdf'), fix('pdf/text-1p.pdf')], {}, (r, i) => i.pages === 6, '6 页'],
  ['add-watermark', [fix('pdf/text-5p.pdf')], { text: '机密', layout: 'tile' }, (r, i) => i.pages === 5, '5 页'],
  ['jpg-to-pdf', [fix('images/photo-landscape.jpg')], { pagesize: 'a4' }, (r, i) => i.pages === 1, '1 页'],
  ['pdf-to-jpg', [fix('pdf/text-1p.pdf')], { dpi: '96', format: 'jpg' }, (r) => r.files.length === 1, '1 张图'],
  ['compress-pdf', [fix('pdf/photos-12p.pdf')], { mode: 'strong', dpi: '72' }, (r, i) => i && i.pages === 12, '12 页'],
  ['unlock-pdf', [fix('pdf/encrypted-user-pw-open123.pdf')], { password: 'open123', confirm: true }, (r, i) => i.pages === 3, '3 页'],
  ['repair-pdf', [fix('bad/no-eof.pdf')], {}, (r, i) => i.pages === 4, '4 页'],
  ['ocr-pdf', [fix('pdf/scanned-en-2p.pdf')], { lang: 'eng', output: 'txt' }, (r) => r.files[0]?.endsWith('.txt'), 'txt'],
  ['word-to-pdf', [fix('office/report-rich.docx')], {}, (r, i) => i.pages === 2, '2 页'],
];
for (const [slug, files, opts, pred, label] of smoke) {
  const { page, pageErrors, reqs } = await tool(slug);
  await addFiles(page, files, { timeout: 90000 });
  await setOptions(page, opts);
  const r = await run(page, { timeout: 300000 });
  let info = null;
  try { if (r.files[0]?.endsWith('.pdf')) info = await pdfInfo(r.files[0]); } catch {}
  // blob:/data: 是浏览器内的对象 URL，不是网络请求
  const external = reqs.filter((x) => !x.u.startsWith(BASE) && !/^(blob|data):/.test(x.u));
  check(`PROD/${slug}`, r.state === 'result' && pred(r, info) && !pageErrors.length && !external.length,
    `${r.state}，${label}：${info ? info.pages + ' 页' : path.basename(r.files[0] ?? '-')}，外部请求 ${external.length} 个${pageErrors.length ? '，⚠ ' + pageErrors[0] : ''}`);
  await page.close();
}

// 报错上报：真实缺陷要发，UserError 不发
{
  const { page, reqs } = await tool('merge-pdf');
  await addFiles(page, [fix('pdf/text-5p.pdf'), fix('bad/truncated.pdf')]);
  const r = await run(page, { timeout: 60000 });
  const posts = reqs.filter((x) => x.m === 'POST' && x.u.includes('/api/error-report'));
  check('S7/真实缺陷会上报', r.state === 'alert' && posts.length === 1, `界面提示「${(r.alert || '').slice(0, 50)}」，上报 ${posts.length} 次`);
  await page.close();
}
{
  const { page, reqs } = await tool('add-watermark');
  await addFiles(page, [fix('pdf/text-5p.pdf')]);
  await setOptions(page, { text: '' });
  const r = await run(page, { timeout: 60000 });
  const posts = reqs.filter((x) => x.u.includes('/api/error-report'));
  check('S7/用户输入错误不上报', r.state === 'alert' && posts.length === 0, `界面提示「${(r.alert || '').slice(0, 40)}」，上报 ${posts.length} 次`);
  await page.close();
}
{
  const { page, reqs } = await tool('compress-pdf');
  await addFiles(page, [fix('pdf/encrypted-user-pw-open123.pdf')]);
  const r = await run(page, { timeout: 60000 });
  const posts = reqs.filter((x) => x.u.includes('/api/error-report'));
  check('S7/加密文件不上报（在忽略名单里）', posts.length === 0, `上报 ${posts.length} 次`);
  await page.close();
}
// 上报内容不含隐私信息
{
  const { page } = await tool('add-page-numbers');
  const bodies = [];
  page.on('request', (r) => { if (r.url().includes('/api/error-report')) bodies.push(r.postData() ?? ''); });
  await addFiles(page, [fix('bad/名前に空白 and ünïcödé.pdf')]);
  await setOptions(page, { format: 'pageTotal', pos: 'br' });
  // 人为制造一个真实缺陷：把工具模块的 run 换成会抛错的版本
  await page.evaluate(() => { const f = document.getElementById('options'); const i = document.createElement('input'); i.type = 'hidden'; i.name = 'start'; i.value = 'NaN-trigger'; f.appendChild(i); });
  const r = await run(page, { timeout: 60000 });
  const body = bodies.join('');
  check('S7/上报内容不含文件名/文本输入', !body.includes('名前に空白') && !/机密|secret/.test(body),
    body ? `上报了 ${bodies.length} 条，未出现文件名/用户文本；字段：${Object.keys(JSON.parse(body)).join(',')}` : '本次没有触发上报（说明该输入被当作用户错误处理）');
  await page.close();
}

await browser.close();
await mkdir(new URL('./results/', import.meta.url), { recursive: true });
await writeFile(new URL('./results/08-prod.json', import.meta.url), JSON.stringify(results, null, 1));
const bad = results.filter((r) => !r.ok);
console.log(`\n08-prod: ${results.length - bad.length}/${results.length} 通过` + (bad.length ? `，失败：${bad.map((b) => b.id).join(', ')}` : ''));
