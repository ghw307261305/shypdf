import { suite, ok } from './runner.mjs';
import { fix, pdfText } from './lib.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const P = (n) => fix('pdf/' + n);
const one = (r) => r.files?.[0];
const clean = (s) => s.replace(/\s+/g, '');
const T = 420000;

const cases = [
  { id: 'ocr/english-pdf', spec: { slug: 'ocr-pdf', files: [P('scanned-en-2p.pdf')], options: { lang: 'eng', output: 'pdf', skipText: true }, timeout: T },
    check: async (r) => { const t = await pdfText(one(r)); const all = t.join(' ');
      return [ok(r.state === 'result', '出结果，实际 ' + r.state),
        ok(/INVOICE/i.test(all), '识别出 INVOICE，实际首页片段：' + t[0].slice(0, 70)),
        ok(/Northwind/i.test(all), '识别出公司名 Northwind'),
        ok(/147\.00|147/.test(all), '识别出金额 147.00'),
        ok(t.length === 2 && t[1].length > 20, '第 2 页（西班牙文发票）也有文字层，长度 ' + t[1].length)]; } },

  { id: 'ocr/german', spec: { slug: 'ocr-pdf', files: [P('scanned-de.pdf')], options: { lang: 'deu', english: false, output: 'pdf', skipText: true }, timeout: T },
    check: async (r) => { const all = (await pdfText(one(r))).join(' ');
      return [ok(/RECHNUNG/i.test(all), '识别出 RECHNUNG，实际：' + all.slice(0, 70)),
        ok(/M[üu]ller/.test(all), '带变音的 Müller 识别正确（实际含 ü：' + /ü/.test(all) + '）'),
        ok(/Gesamtbetrag/i.test(all), '识别出 Gesamtbetrag')]; } },

  { id: 'ocr/chinese+english', spec: { slug: 'ocr-pdf', files: [P('scanned-zh.pdf')], options: { lang: 'chi_sim', english: true, output: 'pdf', skipText: true }, timeout: T },
    check: async (r) => { const all = clean((await pdfText(one(r))).join(' '));
      return [ok(r.state === 'result', '出结果'),
        ok(all.includes('发票') || all.includes('發票'), '识别出「发票」，实际：' + all.slice(0, 40)),
        ok(/北风|贸易|有限公司/.test(all), '识别出客户名中的词'),
        ok(/1047|349/.test(all), '识别出金额数字')]; } },

  { id: 'ocr/japanese', spec: { slug: 'ocr-pdf', files: [P('scanned-ja.pdf')], options: { lang: 'jpn', english: true, output: 'pdf', skipText: true }, timeout: T },
    check: async (r) => { const all = clean((await pdfText(one(r))).join(' '));
      return [ok(r.state === 'result', '出结果'),
        ok(/請求書|請求|求書/.test(all), '识别出「請求書」，实际：' + all.slice(0, 40)),
        ok(all.length > 20, '有足够的识别结果，长度 ' + all.length)]; } },

  { id: 'ocr/txt-output', spec: { slug: 'ocr-pdf', files: [P('scanned-en-2p.pdf')], options: { lang: 'eng', output: 'txt', skipText: true }, timeout: T },
    check: async (r) => { const txt = await readFile(one(r), 'utf8');
      return [ok(one(r).endsWith('.txt'), '输出 .txt，实际 ' + path.basename(one(r))),
        ok(/INVOICE/i.test(txt), 'txt 里有识别结果'), ok(txt.length > 100, '长度 ' + txt.length)]; } },

  { id: 'ocr/skip-text-pages', spec: { slug: 'ocr-pdf', files: [P('mixed-text-and-scan-2p.pdf')], options: { lang: 'eng', output: 'pdf', skipText: true }, timeout: T },
    check: async (r) => { const t = await pdfText(one(r));
      return [ok(t[0].includes('Acceptance fixture'), '第 1 页原有文字层保留'),
        ok(/INVOICE/i.test(t[1]), '第 2 页扫描页被识别，实际：' + t[1].slice(0, 60))]; } },

  { id: 'ocr/no-skip-text', spec: { slug: 'ocr-pdf', files: [P('mixed-text-and-scan-2p.pdf')], options: { lang: 'eng', output: 'txt', skipText: false }, timeout: T },
    check: async (r) => { const txt = await readFile(one(r), 'utf8');
      return [ok(r.state === 'result', '取消勾选也能跑完'), ok(/Damaged|Acceptance|page/i.test(txt), '第 1 页也走了识别，实际片段：' + txt.slice(0, 60).replace(/\n/g, ' '))]; } },

  { id: 'ocr/default-lang-ja-page', spec: { slug: 'ocr-pdf', locale: 'ja', files: [P('scanned-ja.pdf')], skipRun: true,
      before: async (page) => page.evaluate(() => document.querySelector('[name=lang]')?.value) },
    check: async (r) => [ok(r.beforeResult === 'jpn', '日文页面默认选日本語，实际 ' + r.beforeResult)] },

  { id: 'ocr/default-lang-zh-page', spec: { slug: 'ocr-pdf', locale: 'zh', files: [P('scanned-zh.pdf')], skipRun: true,
      before: async (page) => page.evaluate(() => document.querySelector('[name=lang]')?.value) },
    check: async (r) => [ok(r.beforeResult === 'chi_sim', '中文页面默认选简体中文，实际 ' + r.beforeResult)] },

  // html lang 是 zh-Hans / zh-Hant，截两位分不出简繁，所以默认语言认的是 data-locale
  { id: 'ocr/default-lang-zh-tw-page', spec: { slug: 'ocr-pdf', locale: 'zh-tw', files: [P('scanned-zh.pdf')], skipRun: true,
      before: async (page) => page.evaluate(() => document.querySelector('[name=lang]')?.value) },
    check: async (r) => [ok(r.beforeResult === 'chi_tra', '繁中页面默认选繁體中文，实际 ' + r.beforeResult)] },

  { id: 'ocr/poster-a0', spec: { slug: 'ocr-pdf', files: [P('poster-a0.pdf')], options: { lang: 'eng', output: 'txt', skipText: false }, timeout: T },
    check: async (r) => [ok(r.state === 'result', 'A0 巨幅页能跑完（按上限缩放），实际 ' + r.state),
      ok(/Poster|Acceptance|fixture/i.test(await readFile(one(r), 'utf8')), '识别出内容')] },
];

await suite('05-ocr', cases);
