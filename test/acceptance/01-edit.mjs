import { suite, ok } from './runner.mjs';
import { fix, pdfInfo, pdfText, zipNames, ls } from './lib.mjs';
import { inkDiff, regionDiffers } from './render.mjs';
import path from 'node:path';

const P = (n) => fix('pdf/' + n);
const one = (r) => r.files?.[0];

const cases = [
  { id: 'merge/basic+bookmarks', spec: { slug: 'merge-pdf', files: [P('text-5p.pdf'), P('letter-3p.pdf'), P('cjk-text-2p.pdf')], options: { bookmarks: true, filename: '合并结果' } },
    check: async (r) => { const i = await pdfInfo(one(r)); const t = await pdfText(one(r));
      return [ok(r.state === 'result', '出结果'), ok(path.basename(one(r)) === '合并结果.pdf', '文件名 = 合并结果.pdf，实际 ' + path.basename(one(r))),
        ok(i.pages === 10, '10 页，实际 ' + i.pages), ok(i.sizes[5][0] === 612, '第 6 页保持 Letter 宽度 612，实际 ' + i.sizes[5][0]),
        ok(t[8].includes('中文测试文档'), '中文页文字保留')]; } },

  { id: 'merge/filename-ext', spec: { slug: 'merge-pdf', files: [P('text-1p.pdf'), P('text-5p.pdf')], options: { filename: 'x.pdf', bookmarks: false } },
    check: async (r) => [ok(path.basename(one(r)) === 'x.pdf', '不重复加后缀，实际 ' + path.basename(one(r)))] },

  { id: 'merge/min-2-files', spec: { slug: 'merge-pdf', files: [P('text-5p.pdf')],
      skipRun: true, before: async (page) => page.evaluate(() => document.getElementById('run').disabled) },
    check: async (r) => [ok(r.beforeResult === true, '只有 1 个文件时开始按钮置灰，实际 disabled=' + r.beforeResult)] },

  { id: 'merge/encrypted-input', spec: { slug: 'merge-pdf', files: [P('text-5p.pdf'), P('encrypted-user-pw-open123.pdf')] },
    check: async (r) => [ok(r.state === 'alert', '加密文件应报错，实际 ' + r.state), ok(r.alert && !/undefined|\[object/.test(r.alert), '提示可读：' + r.alert)] },

  { id: 'split/each', spec: { slug: 'split-pdf', files: [P('text-5p.pdf')], options: { mode: 'each' } },
    check: async (r) => { const names = await zipNames(one(r));
      return [ok(one(r).endsWith('.zip'), '多输出打成 zip'), ok(names.length === 5, 'zip 内 5 个文件，实际 ' + names.length), ok(r.buttons.length === 6, '1 个打包按钮 + 5 个单文件按钮，实际 ' + r.buttons.length)]; } },

  { id: 'split/ranges', spec: { slug: 'split-pdf', files: [P('text-5p.pdf')], options: { mode: 'ranges', ranges: '1-2, 4' } },
    check: async (r) => { const names = await zipNames(one(r));
      return [ok(names.length === 2, '2 个文件，实际 ' + names.length), ok(r.buttons.length === 3, '≤6 个时列出单文件按钮，实际 ' + r.buttons.length)]; } },

  { id: 'split/odd', spec: { slug: 'split-pdf', files: [P('text-5p.pdf')], options: { mode: 'odd' } },
    check: async (r) => { const i = await pdfInfo(one(r)); return [ok(i.pages === 3, '奇数页 3 页，实际 ' + i.pages)]; } },

  { id: 'split/out-of-range', spec: { slug: 'split-pdf', files: [P('text-5p.pdf')], options: { mode: 'ranges', ranges: '1-9' } },
    check: async (r) => [ok(r.state === 'alert', '越界应报错'), ok(/9|5/.test(r.alert), '提示里带页数信息：' + r.alert)] },

  { id: 'split/single-page', spec: { slug: 'split-pdf', files: [P('text-1p.pdf')], options: { mode: 'each' } },
    check: async (r) => [ok(one(r).endsWith('.pdf'), '单输出不打包 zip，实际 ' + path.basename(one(r)))] },

  { id: 'organize/expand-60p', spec: { slug: 'organize-pdf', files: [P('text-60p-bookmarks.pdf')], addTimeout: 60000,
      before: async (page) => page.evaluate(() => document.querySelectorAll('#items .item').length) },
    check: async (r) => { const i = await pdfInfo(one(r));
      return [ok(r.beforeResult === 60, '展开 60 个页面缩略图，实际 ' + r.beforeResult), ok(i.pages === 60, '不改动时输出仍 60 页，实际 ' + i.pages),
        ok(path.basename(one(r)) === 'text-60p-bookmarks_organized.pdf', '默认输出名，实际 ' + path.basename(one(r)))]; } },

  { id: 'organize/reorder+rotate+delete', spec: { slug: 'organize-pdf', files: [P('text-5p.pdf')],
      before: async (page) => { // 删掉第 1 页，把新的第 1 页旋转 90°，再把最后一页移到最前
        await page.click('#items .item[data-idx="0"] [data-act="remove"]');
        await page.click('#items .item[data-idx="0"] [data-act="rotate"]');
        for (let i = 3; i > 0; i--) await page.click(`#items .item[data-idx="${i}"] [data-act="left"]`);
        return page.evaluate(() => document.querySelectorAll('#items .item').length); } },
    check: async (r) => { const i = await pdfInfo(one(r)); const t = await pdfText(one(r));
      return [ok(r.beforeResult === 4, '删后剩 4 页'), ok(i.pages === 4, '输出 4 页，实际 ' + i.pages),
        ok(t[0].includes('Page 5 of 5'), '最后一页被移到最前，实际首页文字 ' + t[0].slice(0, 30)),
        ok(i.sizes[1][2] === 90, '被旋转的那页角度 90，实际 ' + i.sizes[1][2])]; } },

  { id: 'organize/rotate-all-on-rotated', spec: { slug: 'organize-pdf', files: [P('mixed-sizes-rotations.pdf')],
      before: async (page) => { await page.click('#rotate-all'); return page.evaluate(() => document.querySelectorAll('#items .item').length); } },
    check: async (r) => { const i = await pdfInfo(one(r));
      return [ok(i.pages === 6, '6 页'), ok(i.sizes[3][2] === 180, '原本 90° 的页 +90 = 180，实际 ' + i.sizes[3][2]),
        ok(i.sizes[5][2] === 270, '原本 180° 的页 +90 = 270，实际 ' + i.sizes[5][2])]; } },

  { id: 'delete/ranges', spec: { slug: 'delete-pages', files: [P('text-5p.pdf')], options: { ranges: '2, 5' } },
    check: async (r) => { const i = await pdfInfo(one(r)); const t = await pdfText(one(r));
      return [ok(i.pages === 3, '剩 3 页，实际 ' + i.pages), ok(!t.join().includes('Page 2 of 5'), '第 2 页确实被删')]; } },

  { id: 'delete/all-pages', spec: { slug: 'delete-pages', files: [P('text-5p.pdf')], options: { ranges: '1-5' } },
    check: async (r) => [ok(r.state === 'alert', '删光应报错，实际 ' + r.state), ok(!!r.alert, '提示：' + r.alert)] },

  { id: 'extract/dedupe-order', spec: { slug: 'extract-pages', files: [P('text-5p.pdf')], options: { ranges: '4-5, 2, 4' } },
    check: async (r) => { const i = await pdfInfo(one(r)); const t = await pdfText(one(r));
      return [ok(i.pages === 3, '去重后 3 页，实际 ' + i.pages), ok(t[0].includes('Page 2 of 5'), '按文档顺序：首页是原第 2 页，实际 ' + t[0].slice(0, 30))]; } },

  { id: 'pagenum/zh-pageTotal+br', spec: { slug: 'add-page-numbers', locale: 'zh', files: [P('text-5p.pdf')], options: { format: 'pageTotal', pos: 'br', start: '1', from: '1', size: '11', margin: '28' } },
    check: async (r) => { const d = await inkDiff(P('text-5p.pdf'), one(r), 0);
      const differs = await regionDiffers(one(r), 0, 4, { x0: 0.5, y0: 0.9, x1: 1, y1: 1 });
      return [ok(d.changed > 200, '第 1 页右下角画上了内容，改动像素 ' + d.changed),
        ok(d.rel && d.rel.x0 > 0.55 && d.rel.y0 > 0.9, '位置在右下角，实际 ' + JSON.stringify(d.rel)),
        ok(differs > 100, '第 1 页与第 5 页的页码不同（差异像素 ' + differs + '）')]; } },

  { id: 'pagenum/start-from', spec: { slug: 'add-page-numbers', files: [P('text-5p.pdf')], options: { format: 'slash', pos: 'tc', start: '3', from: '2', size: '11', margin: '28' } },
    check: async (r) => { const t = await pdfText(one(r));
      return [ok(!/\d+\s*\/\s*\d+/.test(t[0].replace('Page 1 of 5', '')), '第 1 页无页码'),
        ok(t[1].includes('3 / 6') || t[1].replace(/\s/g, '').includes('3/6'), '第 2 页显示 3 / 6，实际 ' + t[1].slice(-16))]; } },

  { id: 'pagenum/rotated-pages', spec: { slug: 'add-page-numbers', files: [P('mixed-sizes-rotations.pdf')], options: { format: 'plain', pos: 'bc', start: '1', from: '1', size: '12', margin: '28' } },
    check: async (r) => { const i = await pdfInfo(one(r)); const t = await pdfText(one(r));
      return [ok(i.pages === 6, '6 页'), ok(t.every((p, k) => p.includes(String(k + 1))), '每页都有页码'), ok(i.sizes[3][2] === 90, '原旋转角度未被改写，实际 ' + i.sizes[3][2])]; } },

  { id: 'watermark/tile-zh', spec: { slug: 'add-watermark', files: [P('text-5p.pdf')], options: { text: '机密文件', layout: 'tile', angle: '-30', opacity: '25', size: '48', color: 'gray' } },
    check: async (r) => { const d = await inkDiff(P('text-5p.pdf'), one(r), 0);
      return [ok(r.state === 'result', '出结果'), ok(d.ratio > 0.01, '平铺覆盖面积够大，实际 ' + (d.ratio * 100).toFixed(1) + '%'),
        ok(d.rowBands >= 3, '纵向多行平铺，实际 ' + d.rowBands + ' 条'), ok(d.colBands >= 2, '横向多列平铺，实际 ' + d.colBands + ' 列')]; } },

  { id: 'watermark/center-once', spec: { slug: 'add-watermark', files: [P('text-5p.pdf')], options: { text: 'DRAFT', layout: 'center', angle: '-30', opacity: '25', size: '48' } },
    check: async (r) => { const d = await inkDiff(P('text-5p.pdf'), one(r), 0);
      return [ok(d.rowBands === 1 && d.colBands === 1, '只有一处水印，实际 ' + d.rowBands + ' 行 ' + d.colBands + ' 列'),
        ok(d.rel.x0 > 0.2 && d.rel.x1 < 0.8 && d.rel.y0 > 0.25 && d.rel.y1 < 0.75, '位置居中，实际 ' + JSON.stringify(d.rel))]; } },

  { id: 'watermark/empty-text', spec: { slug: 'add-watermark', files: [P('text-5p.pdf')], options: { text: '' } },
    check: async (r) => [ok(r.state === 'alert', '空文字应提示，实际 ' + r.state), ok(!!r.alert, '提示：' + r.alert)] },
];

await suite('01-edit', cases);
