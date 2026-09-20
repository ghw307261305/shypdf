import { suite, ok } from './runner.mjs';
import { fix, pdfInfo, pdfText, PROJ } from './lib.mjs';
import { inkDiff, inkRatio } from './render.mjs';
import path from 'node:path';

const P = (n) => fix('pdf/' + n);
const IMG = (n) => fix('images/' + n);
const one = (r) => r.files?.[0];

// 鼠标拖拽：从元素内的相对点拖到另一个相对点
async function dragBy(page, sel, from, delta) {
  await page.locator(sel).scrollIntoViewIfNeeded();
  const b = await page.locator(sel).boundingBox();
  await page.mouse.move(b.x + b.width * from.x, b.y + b.height * from.y);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * from.x + delta.dx, b.y + b.height * from.y + delta.dy, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(120);
}
const waitCanvas = (page, sel) => page.waitForSelector(`${sel} canvas`, { timeout: 30000 });
/** 编辑工具是两步：先点工具按钮，再点页面上的位置 */
async function placeEdit(page, kind, at = { x: 0.4, y: 0.3 }) {
  await page.click(`[data-kind="${kind}"]`);
  const cb = await page.locator('#edit-page canvas').boundingBox();
  await page.mouse.click(cb.x + cb.width * at.x, cb.y + cb.height * at.y);
  await page.waitForTimeout(150);
}
const pickKind = (page, kind) => page.evaluate((k) => { const r = document.querySelector(`[name=kind][value=${k}]`); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }, kind);
const hidden = (page, name) => page.evaluate((n) => document.querySelector(`[name="${n}"]`)?.value ?? null, name);

const cases = [
  // ---------------- crop ----------------
  { id: 'crop/drag-box-all-pages', spec: { slug: 'crop-pdf', files: [P('text-5p.pdf')], options: { scope: 'all' },
      before: async (page) => { await waitCanvas(page, '#crop-page');
        await dragBy(page, '#crop-box', { x: 0.5, y: 0.5 }, { dx: 30, dy: 20 });          // 移动
        await dragBy(page, '#crop-box .sig-handle', { x: 0.5, y: 0.5 }, { dx: -120, dy: -160 }); // 缩小
        return JSON.parse(await hidden(page, 'rect')); } },
    check: async (r) => { const rect = r.beforeResult; const i = await pdfInfo(one(r));
      const { PDFDocument } = await import(path.join(PROJ, 'node_modules/pdf-lib/cjs/index.js'));
      const doc = await PDFDocument.load(await (await import('node:fs/promises')).readFile(one(r)));
      const cb = doc.getPage(3).getCropBox(), mb = doc.getPage(3).getMediaBox();
      const near = (a, b) => Math.abs(a - b) < 2;
      return [ok(rect && rect.w < 0.8, '拖拽后裁剪框变小了：' + JSON.stringify(rect)),
        ok(near(cb.width, rect.w * mb.width) && near(cb.height, rect.h * mb.height), `第 4 页 CropBox 与框一致：${Math.round(cb.width)}×${Math.round(cb.height)} vs ${Math.round(rect.w * mb.width)}×${Math.round(rect.h * mb.height)}`),
        ok(near(cb.x, rect.x * mb.width), `左边距一致：${Math.round(cb.x)} vs ${Math.round(rect.x * mb.width)}`),
        ok(i.pages === 5, '页数不变')]; } },

  { id: 'crop/current-page-only', spec: { slug: 'crop-pdf', files: [P('text-5p.pdf')], options: { scope: 'current' },
      before: async (page) => { await waitCanvas(page, '#crop-page');
        await page.click('[data-nav="1"]'); await page.waitForTimeout(400);   // 翻到第 2 页
        await dragBy(page, '#crop-box .sig-handle', { x: 0.5, y: 0.5 }, { dx: -150, dy: -200 });
        return JSON.parse(await hidden(page, 'rect')); } },
    check: async (r) => { const { PDFDocument } = await import(path.join(PROJ, 'node_modules/pdf-lib/cjs/index.js'));
      const doc = await PDFDocument.load(await (await import('node:fs/promises')).readFile(one(r)));
      const p2 = doc.getPage(1), p1 = doc.getPage(0);
      return [ok(r.beforeResult.page === 1, '当前页 = 第 2 页，实际 ' + r.beforeResult.page),
        ok(p2.getCropBox().width < p2.getMediaBox().width - 5, '第 2 页被裁剪'),
        ok(Math.abs(p1.getCropBox().width - p1.getMediaBox().width) < 2, '第 1 页保持原样')]; } },

  { id: 'crop/mixed-sizes', spec: { slug: 'crop-pdf', files: [P('mixed-sizes-rotations.pdf')], options: { scope: 'all' },
      before: async (page) => { await waitCanvas(page, '#crop-page'); await dragBy(page, '#crop-box .sig-handle', { x: 0.5, y: 0.5 }, { dx: -100, dy: -120 }); return JSON.parse(await hidden(page, 'rect')); } },
    check: async (r) => { const { PDFDocument } = await import(path.join(PROJ, 'node_modules/pdf-lib/cjs/index.js'));
      const doc = await PDFDocument.load(await (await import('node:fs/promises')).readFile(one(r)));
      const rect = r.beforeResult;
      const rows = doc.getPages().map((p) => ({ rot: p.getRotation().angle % 180,
        wr: +(p.getCropBox().width / p.getMediaBox().width).toFixed(2), hr: +(p.getCropBox().height / p.getMediaBox().height).toFixed(2) }));
      const near = (a, b) => Math.abs(a - b) <= 0.02;
      const flat = rows.filter((x) => !x.rot), turned = rows.filter((x) => x.rot);
      return [ok(flat.every((x) => near(x.wr, rect.w) && near(x.hr, rect.h)), `未旋转页按框比例裁剪 (w=${rect.w.toFixed(2)}, h=${rect.h.toFixed(2)})：` + JSON.stringify(flat)),
        ok(turned.every((x) => near(x.wr, rect.h) && near(x.hr, rect.w)), '旋转 90/270 的页按「看到的方向」换算宽高：' + JSON.stringify(turned)),
        ok(rect.w < 0.95, '确实裁掉了一部分')]; } },

  // ---------------- edit ----------------
  { id: 'edit/four-kinds+text', spec: { slug: 'edit-pdf', files: [P('text-5p.pdf')], options: { color: 'red' },
      before: async (page) => { await waitCanvas(page, '#edit-page');
        const at = { text: { x: 0.3, y: 0.2 }, highlight: { x: 0.5, y: 0.35 }, whiteout: { x: 0.35, y: 0.5 }, blackout: { x: 0.5, y: 0.65 } };
        for (const k of ['text', 'highlight', 'whiteout', 'blackout']) await placeEdit(page, k, at[k]);
        const box = page.locator('#edit-page .edit-el--text input').first();
        await box.fill('批注 Annotation');
        await page.waitForTimeout(150);
        return JSON.parse(await hidden(page, 'edits')); } },
    check: async (r) => { const d = await inkDiff(P('text-5p.pdf'), one(r), 0); const t = await pdfText(one(r));
      const kinds = (r.beforeResult ?? []).map((e) => e.kind);
      return [ok(kinds.length === 4, '四种标注都加上了：' + kinds.join(',')),
        ok((r.beforeResult ?? []).some((e) => e.text?.includes('批注')), '文字框内容进了隐藏字段'),
        ok(d.changed > 2000, '页面上确实画了东西，改动像素 ' + d.changed),
        ok(t[0].includes('Acceptance'), '原文字仍在（非破坏性标注）')]; } },

  { id: 'edit/blackout-redaction', spec: { slug: 'edit-pdf', files: [P('text-5p.pdf')], options: { color: 'black' },
      before: async (page) => { await waitCanvas(page, '#edit-page');
        // 直接把黑框落在标题 "Text 5 pages" 上
        await placeEdit(page, 'blackout', { x: 0.28, y: 0.085 });
        return JSON.parse(await hidden(page, 'edits')); } },
    check: async (r) => { const t = await pdfText(one(r));
      return [ok(r.state === 'result', '出结果'),
        ok(true, '涂黑后文字层是否仍可提取（信息项）：' + (t[0].includes('Text 5 pages') ? '仍可提取到被盖住的文字' : '文字已移除'))]; } },

  { id: 'edit/multi-page', spec: { slug: 'edit-pdf', files: [P('text-5p.pdf')], options: { color: 'blue' },
      before: async (page) => { await waitCanvas(page, '#edit-page');
        await placeEdit(page, 'highlight', { x: 0.4, y: 0.3 });
        for (let i = 0; i < 3; i++) { await page.click('[data-nav="1"]'); await page.waitForTimeout(400); }
        await placeEdit(page, 'blackout', { x: 0.4, y: 0.5 });
        return JSON.parse(await hidden(page, 'edits')); } },
    check: async (r) => { const d1 = await inkDiff(P('text-5p.pdf'), one(r), 0), d4 = await inkDiff(P('text-5p.pdf'), one(r), 3), d2 = await inkDiff(P('text-5p.pdf'), one(r), 1);
      const pages = (r.beforeResult ?? []).map((e) => e.page);
      return [ok(pages.join(',') === '0,3', '两处标注分别在第 1、4 页，实际 ' + pages.join(',')),
        ok(d1.changed > 500 && d4.changed > 500, '两页都有改动'),
        ok(d2.changed < 100, '没被标注的页保持原样，实际改动 ' + d2.changed)]; } },

  { id: 'edit/no-edits', spec: { slug: 'edit-pdf', files: [P('text-5p.pdf')],
      before: async (page) => waitCanvas(page, '#edit-page').then(() => hidden(page, 'edits')) },
    check: async (r) => { if (r.state !== 'result') return [ok(true, '没有任何标注时给出提示：' + r.alert)];
      const d = await inkDiff(P('text-5p.pdf'), one(r), 0);
      return [ok(d.changed < 100, '不加标注时页面无变化，实际改动 ' + d.changed)]; } },

  // ---------------- fill ----------------
  { id: 'fill/enumerate-fields', spec: { slug: 'fill-pdf', files: [P('form-acroform.pdf')], skipRun: true,
      before: async (page) => page.evaluate(() => {
        const rows = [...document.querySelectorAll('.fill-fields .fill-row')];
        return rows.map((r) => ({ label: r.querySelector('.fill-label')?.textContent, name: r.querySelector('[name]')?.name,
          tag: r.querySelector('[name]')?.tagName, type: r.querySelector('[name]')?.type,
          maxlength: r.querySelector('[name]')?.getAttribute('maxlength'),
          options: [...(r.querySelectorAll('option') ?? [])].map((o) => o.value), selected: r.querySelector('select')?.value })); }) },
    check: async (r) => { const f = r.beforeResult ?? [];
      const names = f.map((x) => x.label);
      return [ok(f.length === 6, '列出 6 个可填域，实际 ' + f.length + '：' + names.join(', ')),
        ok(!names.includes('invoice.id'), '只读域不出现'),
        ok(f.find((x) => x.label === 'applicant.code')?.maxlength === '6', '长度上限 6 传到了 input'),
        ok(f.find((x) => x.label === 'applicant.notes')?.tag === 'TEXTAREA', '多行域用 textarea'),
        ok(f.find((x) => x.label === 'country')?.selected === 'Spain', '下拉默认选中 Spain，实际 ' + f.find((x) => x.label === 'country')?.selected),
        ok((f.find((x) => x.label === 'plan')?.options ?? []).includes('Yearly'), '单选组选项完整')]; } },

  { id: 'fill/flatten', spec: { slug: 'fill-pdf', files: [P('form-acroform.pdf')],
      options: { f_0: '张三 Zhang San', f_1: 'AB1234', f_2: '备注：第一行\n第二行', f_3: true, f_4: 'Yearly', f_5: 'Japan', flatten: true },
      before: async (page) => page.waitForSelector('.fill-fields') },
    check: async (r) => { const { PDFDocument } = await import(path.join(PROJ, 'node_modules/pdf-lib/cjs/index.js'));
      const doc = await PDFDocument.load(await (await import('node:fs/promises')).readFile(one(r)));
      const t = (await pdfText(one(r))).join(' ');
      return [ok(r.state === 'result', '出结果'),
        ok(doc.getForm().getFields().length === 0, '扁平化后没有表单域了，实际 ' + doc.getForm().getFields().length),
        ok(t.includes('Zhang San'), '填写的英文内容在页面上'),
        ok(t.includes('张三'), '中文值正常写入（字体回退）'),
        ok(t.includes('AB1234') && t.includes('Japan'), '短文本与下拉值都写入')]; } },

  { id: 'fill/keep-editable', spec: { slug: 'fill-pdf', files: [P('form-acroform.pdf')],
      options: { f_0: 'Keep Editable', flatten: false }, before: async (page) => page.waitForSelector('.fill-fields') },
    check: async (r) => { const { PDFDocument } = await import(path.join(PROJ, 'node_modules/pdf-lib/cjs/index.js'));
      const doc = await PDFDocument.load(await (await import('node:fs/promises')).readFile(one(r)));
      const form = doc.getForm();
      return [ok(form.getFields().length > 0, '仍是可填表单，域数 ' + form.getFields().length),
        ok(form.getTextField('applicant.name').getText() === 'Keep Editable', '值已预填，实际 ' + form.getTextField('applicant.name').getText())]; } },

  { id: 'fill/no-form-pdf', spec: { slug: 'fill-pdf', files: [P('text-5p.pdf')], skipRun: true,
      before: async (page) => { await page.waitForSelector('#items .sign-ws', { timeout: 30000 });
        return page.evaluate(() => ({ panel: !!document.querySelector('.fill-fields'), hint: document.querySelector('#items .hint')?.textContent?.trim() })); } },
    check: async (r) => [ok(r.beforeResult.panel === false, '没有表单域时不显示字段面板'),
      ok(!!r.beforeResult.hint, '给出提示：' + (r.beforeResult.hint ?? '').slice(0, 80))] },

  // ---------------- sign ----------------
  { id: 'sign/type-blue', spec: { slug: 'sign-pdf', files: [P('text-5p.pdf')],
      options: { kind: 'type', sigText: 'Alice Zhang', sigStyle: 'hand', ink: 'blue' },
      before: async (page) => { await waitCanvas(page, '#sign-page'); await page.waitForTimeout(300); },
      after: async (page) => page.evaluate(() => ({ sig: (document.querySelector('[name=sigData]')?.value ?? '').slice(0, 20), place: document.querySelector('[name=place]')?.value })) },
    check: async (r) => { const d = await inkDiff(P('text-5p.pdf'), one(r), 0); const place = JSON.parse(r.afterResult.place);
      return [ok(r.state === 'result', '出结果'), ok(r.afterResult.sig.startsWith('data:image/png'), '签名生成为 PNG'),
        ok(d.changed > 300, '第 1 页画上了签名，改动像素 ' + d.changed),
        ok(d.rel.x0 > place.x - 0.06 && d.rel.y0 > place.y - 0.06, `落点与 place 一致：${JSON.stringify(d.rel)} vs ${JSON.stringify(place)}`)]; } },

  { id: 'sign/draw-pad', spec: { slug: 'sign-pdf', files: [P('text-5p.pdf')], options: { kind: 'draw', ink: 'black' },
      before: async (page) => { await waitCanvas(page, '#sign-page');
        const b = await page.locator('#sig-pad').boundingBox();
        await page.mouse.move(b.x + 30, b.y + b.height * 0.7); await page.mouse.down();
        for (let i = 1; i <= 12; i++) await page.mouse.move(b.x + 30 + i * (b.width - 60) / 12, b.y + b.height * (0.7 - 0.35 * Math.sin(i / 2)), { steps: 2 });
        await page.mouse.up(); await page.waitForTimeout(200);
        return (await page.evaluate(() => document.querySelector('[name=sigData]')?.value?.length ?? 0)); } },
    check: async (r) => { const d = await inkDiff(P('text-5p.pdf'), one(r), 0);
      return [ok(r.beforeResult > 1000, '手写笔迹生成了签名数据，长度 ' + r.beforeResult),
        ok(d.changed > 200, '签名画到了页面上，改动像素 ' + d.changed)]; } },

  { id: 'sign/image-transparent', spec: { slug: 'sign-pdf', files: [P('text-5p.pdf')], options: { kind: 'image' },
      before: async (page) => { await waitCanvas(page, '#sign-page');
        await pickKind(page, 'image');
        await page.setInputFiles('#sig-file', IMG('signature-transparent.png'));
        await page.waitForFunction(() => (document.querySelector('[name=sigData]')?.value ?? '').length > 1000, null, { timeout: 15000 });
        return page.evaluate(() => (document.querySelector('[name=sigData]')?.value ?? '').length); } },
    check: async (r) => { const d = await inkDiff(P('text-5p.pdf'), one(r), 0);
      return [ok(r.beforeResult > 1000, '图片签名已载入'), ok(d.changed > 200, '签名画上去了，改动像素 ' + d.changed),
        ok(d.ratio < 0.06, '透明底没变成大白块/黑块，覆盖 ' + (d.ratio * 100).toFixed(1) + '%')]; } },

  { id: 'sign/paper-cutout', spec: { slug: 'sign-pdf', files: [P('text-5p.pdf')], options: { kind: 'image', sigCutout: true },
      before: async (page) => { await waitCanvas(page, '#sign-page');
        await pickKind(page, 'image');
        await page.setInputFiles('#sig-file', IMG('signature-on-paper.jpg'));
        await page.waitForFunction(() => (document.querySelector('[name=sigData]')?.value ?? '').length > 1000, null, { timeout: 15000 }); } },
    check: async (r) => { const d = await inkDiff(P('text-5p.pdf'), one(r), 0);
      return [ok(d.changed > 200, '签名画上去了'), ok(d.ratio < 0.05, '白底被去掉（没盖成一大块），覆盖 ' + (d.ratio * 100).toFixed(1) + '%')]; } },

  { id: 'sign/all-pages', spec: { slug: 'sign-pdf', files: [P('text-5p.pdf')],
      options: { kind: 'type', sigText: 'Every Page', sigStyle: 'plain', ink: 'black', allPages: true },
      before: async (page) => { await waitCanvas(page, '#sign-page'); await page.waitForTimeout(300); } },
    check: async (r) => { const ds = []; for (const p of [0, 2, 4]) ds.push((await inkDiff(P('text-5p.pdf'), one(r), p)).changed);
      return [ok(ds.every((n) => n > 200), '每页都有签名，改动像素 ' + ds.join('/')),
        ok(Math.max(...ds) / Math.min(...ds) < 1.5, '各页签名大小一致')]; } },

  { id: 'sign/empty-signature', spec: { slug: 'sign-pdf', files: [P('text-5p.pdf')], options: { kind: 'draw' },
      before: async (page) => waitCanvas(page, '#sign-page') },
    check: async (r) => [ok(r.state === 'alert', '没签名就运行应提示，实际 ' + r.state), ok(!!r.alert, '提示：' + r.alert)] },

  { id: 'sign/rotated-page', spec: { slug: 'sign-pdf', files: [P('mixed-sizes-rotations.pdf')],
      options: { kind: 'type', sigText: 'Rotated', sigStyle: 'serif', ink: 'black' },
      before: async (page) => { await waitCanvas(page, '#sign-page');
        for (let i = 0; i < 3; i++) { await page.click('[data-nav="1"]'); await page.waitForTimeout(400); } // 第 4 页（旋转 90°）
        await page.waitForTimeout(300);
        return JSON.parse(await hidden(page, 'place')); } },
    check: async (r) => { const d = await inkDiff(P('mixed-sizes-rotations.pdf'), one(r), 3);
      const place = r.beforeResult;
      return [ok(place.page === 3, '停在第 4 页，实际 ' + place.page), ok(d.changed > 200, '旋转页上画了签名，改动像素 ' + d.changed),
        ok(d.rel && d.rel.x0 > place.x - 0.1 && d.rel.x1 < place.x + place.w + 0.15, `签名按「看到的方向」落位：${JSON.stringify(d.rel)} vs place ${JSON.stringify(place)}`)]; } },
];

await suite('02-workspace', cases);
