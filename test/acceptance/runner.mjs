import { launch, runCase } from './lib.mjs';
import { writeFile, mkdir } from 'node:fs/promises';

export const ok = (cond, msg) => ({ ok: !!cond, msg });

export async function suite(name, cases, { headless = true } = {}) {
  const { browser, context } = await launch({ headless });
  const results = [];
  for (const c of cases) {
    let r = {}, checks = [];
    try {
      r = await runCase(context, { id: c.id, ...c.spec });
      checks = (await c.check(r)) ?? [];
    } catch (e) {
      checks = [ok(false, '用例抛异常: ' + String(e.message).split('\n')[0].slice(0, 160))];
    }
    // 通用：不该有未捕获的页面异常，也不该有 POST（除报错上报外）
    if (r.pageErrors?.length) checks.push(ok(false, 'pageerror: ' + r.pageErrors[0]));
    const uploads = (r.posts ?? []).filter((p) => !p.url.includes('/api/error-report'));
    if (uploads.length) checks.push(ok(false, '出现非 GET 请求: ' + uploads.map((u) => u.method + ' ' + u.url).join(', ')));
    const reports = (r.posts ?? []).filter((p) => p.url.includes('/api/error-report'));
    const bad = checks.filter((x) => !x.ok);
    results.push({ id: c.id, note: c.note, ok: !bad.length, checks, state: r.state, alert: r.alert, meta: r.meta, ms: r.ms, files: r.files, reports: reports.length, consoleErrors: r.consoleErrors?.slice(0, 2) });
    console.log(`${bad.length ? 'FAIL' : 'ok  '} ${c.id.padEnd(28)} ${String(r.ms ?? '').padStart(6)}ms ${bad.length ? '\n      ' + bad.map((b) => b.msg).join('\n      ') : ''}`);
    if (bad.length && r.alert) console.log(`      界面提示: ${r.alert}`);
  }
  await browser.close();
  await mkdir(new URL('./results/', import.meta.url), { recursive: true });
  await writeFile(new URL(`./results/${name}.json`, import.meta.url), JSON.stringify(results, null, 1));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${name}: ${results.length - failed.length}/${results.length} 通过` + (failed.length ? `，失败：${failed.map((f) => f.id).join(', ')}` : ''));
  return results;
}
