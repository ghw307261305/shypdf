// 站点级：多语言、数字格式、语言切换、404、sitemap/robots、内链可达
import { launch, openTool, addFiles, BASE, fix } from './lib.mjs';
import { writeFile, mkdir } from 'node:fs/promises';

const results = [];
const check = (id, ok, msg) => { results.push({ id, ok: !!ok, msg }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(34)} ${msg}`); };
const LOCALES = ['en', 'es', 'pt', 'fr', 'de', 'ja', 'zh', 'zh-tw'];
const LANG_ATTR = { en: 'en', es: 'es', pt: 'pt-BR', fr: 'fr', de: 'de', ja: 'ja', zh: 'zh-Hans', 'zh-tw': 'zh-Hant' };
const { browser, context } = await launch();
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 120)));

// ---------- 各语言的首页与工具页 ----------
const h1s = {};
for (const loc of LOCALES) {
  const prefix = loc === 'en' ? '' : '/' + loc;
  for (const p of ['/', '/merge-pdf/', '/about/']) {
    const res = await page.goto(`${BASE}${prefix}${p}`, { waitUntil: 'domcontentloaded' });
    const info = await page.evaluate(() => ({
      lang: document.documentElement.lang, title: document.title,
      canonical: document.querySelector('link[rel=canonical]')?.href ?? '',
      hreflang: [...document.querySelectorAll('link[rel=alternate][hreflang]')].map((l) => l.hreflang),
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      body: document.body.innerText,
    }));
    const missing = /\b(undefined|NaN|\[object Object\]|missing key)\b/.test(info.body) || /\{\{|\}\}/.test(info.body);
    const okAll = res.status() === 200 && info.lang === LANG_ATTR[loc] && info.title && info.h1 && !missing && info.hreflang.length >= 8;
    check(`S1/${loc}${p}`, okAll, `HTTP ${res.status()}，lang=${info.lang}，hreflang ${info.hreflang.length} 个，标题「${info.title.slice(0, 40)}」${missing ? '，⚠ 页面里有 undefined/占位符' : ''}`);
    if (p === '/merge-pdf/') h1s[loc] = info.h1;
  }
}
check('S1/各语言文案确实不同', new Set(Object.values(h1s)).size >= 7, Object.entries(h1s).map(([k, v]) => `${k}:${v.slice(0, 16)}`).join(' | '));

// ---------- 数字与单位格式 ----------
const metas = {};
for (const loc of ['en', 'de', 'fr', 'ja', 'zh']) {
  const { page: p2 } = await openTool(context, 'merge-pdf', { locale: loc });
  await addFiles(p2, [fix('pdf/photos-12p.pdf')], { timeout: 60000 });
  metas[loc] = await p2.evaluate(() => document.getElementById('files-meta').textContent.trim());
  await p2.close();
}
check('S2/体积单位随语言变', new Set(Object.values(metas)).size >= 3, Object.entries(metas).map(([k, v]) => `${k}: ${v}`).join(' | '));

// ---------- 语言切换保持路径 ----------
{
  await page.goto(`${BASE}/zh/add-watermark/`, { waitUntil: 'domcontentloaded' });
  const links = await page.evaluate(() => [...document.querySelectorAll('a[hreflang], .lang-menu a, [data-lang] a, a[href*="/es/"]')].map((a) => a.getAttribute('href')));
  const es = links.find((h) => h && h.includes('/es/'));
  check('S3/语言切换保持当前工具', !!es && es.includes('add-watermark'), `从 /zh/add-watermark/ 切到西语的链接：${es}`);
}

// ---------- 404 ----------
for (const p of ['/nope/', '/zh/nope/']) {
  const res = await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' });
  const txt = await page.evaluate(() => document.body.innerText.slice(0, 80).replace(/\s+/g, ' '));
  check(`S6/404 ${p}`, res.status() === 404, `HTTP ${res.status()}，页面文字「${txt}」`);
}

// ---------- sitemap / robots ----------
{
  const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const tools = new Set(urls.map((u) => u.replace(/https?:\/\/[^/]+/, '').replace(/^\/(es|pt|fr|de|ja|zh|zh-tw)\//, '/')));
  const locCount = LOCALES.filter((l) => l === 'en' || urls.some((u) => u.includes(`/${l}/`))).length;
  check('S5/sitemap 条目', urls.length > 150, `${urls.length} 条，覆盖 ${locCount}/8 种语言，去重路径 ${tools.size} 个`);
  check('S5/sitemap 指向线上域名', urls.every((u) => u.startsWith('https://shypdf.com')), '示例：' + urls[0]);
  const rb = await (await fetch(`${BASE}/robots.txt`)).text();
  check('S5/robots.txt', /sitemap/i.test(rb), rb.replace(/\s+/g, ' ').slice(0, 80));
}

// ---------- 内链可达性 ----------
{
  const seen = new Map();
  for (const start of ['/', '/zh/', '/guides/', '/about/', '/privacy/', '/terms/', '/licenses/']) {
    const res = await page.goto(`${BASE}${start}`, { waitUntil: 'domcontentloaded' }).catch(() => null);
    if (!res) { seen.set(start, 'ERR'); continue; }
    seen.set(start, res.status());
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/')));
    for (const h of new Set(hrefs)) if (!seen.has(h)) {
      const r = await fetch(`${BASE}${h}`, { method: 'GET' });
      seen.set(h, r.status);
    }
  }
  const broken = [...seen.entries()].filter(([, s]) => s !== 200);
  check('S3/站内链接无死链', broken.length === 0, `检查 ${seen.size} 个链接，异常 ${broken.length} 个${broken.length ? '：' + broken.slice(0, 6).map(([h, s]) => `${h}→${s}`).join(', ') : ''}`);
}

check('S/浏览期间无未捕获异常', errors.length === 0, errors.length ? errors.slice(0, 3).join(' | ') : '0 个');

await browser.close();
await mkdir(new URL('./results/', import.meta.url), { recursive: true });
await writeFile(new URL('./results/07-site.json', import.meta.url), JSON.stringify(results, null, 1));
const bad = results.filter((r) => !r.ok);
console.log(`\n07-site: ${results.length - bad.length}/${results.length} 通过` + (bad.length ? `，失败：${bad.map((b) => b.id).join(', ')}` : ''));
