import { suite, ok } from './runner.mjs';
import { fix, pdfInfo, pdfText, PROJ } from './lib.mjs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const P = (n) => fix('pdf/' + n);
const BAD = (n) => fix('bad/' + n);
const one = (r) => r.files?.[0];
const size = async (f) => (await stat(f)).size;
const pdflib = () => import(path.join(PROJ, 'node_modules/pdf-lib/cjs/index.js'));
async function encState(file) {
  const { PDFDocument } = await pdflib();
  try { const d = await PDFDocument.load(await readFile(file)); return { encrypted: false, pages: d.getPageCount() }; }
  catch (e) { return { encrypted: true, why: String(e.message).split('\n')[0].slice(0, 60) }; }
}
let origPhotos = 0, strongSizes = {};

const cases = [
  // ---------------- compress ----------------
  { id: 'compress/light-photos', spec: { slug: 'compress-pdf', files: [P('photos-12p.pdf')], options: { mode: 'light' }, timeout: 180000, addTimeout: 60000 },
    check: async (r) => { origPhotos = await size(P('photos-12p.pdf')); const s = await size(one(r));
      return [ok(r.state === 'result', '出结果'), ok(s <= origPhotos, `不会更大：${Math.round(origPhotos / 1024 / 1024 * 10) / 10} MB → ${Math.round(s / 1024 / 1024 * 10) / 10} MB`),
        ok(/%|MB|KB/.test(r.meta), '结果页给出体积/压缩率：' + r.meta)]; } },

  { id: 'compress/strong-72', spec: { slug: 'compress-pdf', files: [P('photos-12p.pdf')], options: { mode: 'strong', dpi: '72' }, timeout: 300000, addTimeout: 60000 },
    check: async (r) => { strongSizes[72] = await size(one(r));
      return [ok(strongSizes[72] < origPhotos * 0.5, `72 dpi 大幅变小：${Math.round(strongSizes[72] / 1024)} KB`), ok((await pdfInfo(one(r))).pages === 12, '页数不变')]; } },

  { id: 'compress/strong-150', spec: { slug: 'compress-pdf', files: [P('photos-12p.pdf')], options: { mode: 'strong', dpi: '150' }, timeout: 300000, addTimeout: 60000 },
    check: async (r) => { strongSizes[150] = await size(one(r));
      return [ok(strongSizes[150] > strongSizes[72], `150 dpi 比 72 dpi 大（更清晰）：${Math.round(strongSizes[150] / 1024)} KB > ${Math.round(strongSizes[72] / 1024)} KB`),
        ok(strongSizes[150] < origPhotos, '仍比原文件小')]; } },

  { id: 'compress/incompressible-text', spec: { slug: 'compress-pdf', files: [P('text-5p.pdf')], options: { mode: 'light' } },
    check: async (r) => { const s = await size(one(r)); const o = await size(P('text-5p.pdf'));
      return [ok(s <= o, `压不动时不返回更大的文件：${o} B → ${s} B`), ok(r.meta.length > 0, '结果页文案：' + r.meta)]; } },

  { id: 'compress/light-keeps-text', spec: { slug: 'compress-pdf', files: [P('cjk-text-2p.pdf')], options: { mode: 'light' } },
    check: async (r) => { const t = (await pdfText(one(r))).join(' ');
      return [ok(t.includes('中文测试文档'), '轻度压缩不栅格化，文字层保留')]; } },

  { id: 'compress/strong-rasterizes', spec: { slug: 'compress-pdf', files: [P('cjk-text-2p.pdf')], options: { mode: 'strong', dpi: '110' }, timeout: 120000 },
    check: async (r) => { const t = (await pdfText(one(r))).join('').trim();
      return [ok(r.state === 'result', '出结果'), ok(true, `（观察）强力压缩后文字层：${t.length ? '仍有 ' + t.length + ' 字符' : '已变成图片，文字不可选中'}`)]; } },

  { id: 'compress/poster-a0', spec: { slug: 'compress-pdf', files: [P('poster-a0.pdf')], options: { mode: 'strong', dpi: '110' }, timeout: 180000 },
    check: async (r) => [ok(r.state === 'result', 'A0 巨幅能跑完，实际 ' + r.state), ok((await pdfInfo(one(r))).pages === 1, '1 页')] },

  // ---------------- repair ----------------
  { id: 'repair/broken-xref', spec: { slug: 'repair-pdf', files: [BAD('broken-xref.pdf')], timeout: 120000 },
    check: async (r) => { const i = await pdfInfo(one(r)); const t = (await pdfText(one(r))).join(' ');
      return [ok(r.state === 'result', 'xref 偏移写错（%%EOF 完好）能修，实际 ' + r.state),
        ok(i.pages === 4, '4 页都在，实际 ' + i.pages),
        ok(t.includes('Damaged source'), '文字层保留（重建结构，不是把页面拍成图）')]; } },

  { id: 'repair/broken-xref-classic', spec: { slug: 'repair-pdf', files: [BAD('broken-xref-classic.pdf')], timeout: 120000 },
    check: async (r) => { const i = await pdfInfo(one(r));
      return [ok(r.state === 'result', '老式结构同样能修，实际 ' + r.state), ok(i.pages === 4, '4 页都在，实际 ' + i.pages)]; } },

  { id: 'repair/junk-prefix-600b', spec: { slug: 'repair-pdf', files: [BAD('junk-prefix.pdf')], timeout: 120000 },
    check: async (r) => [ok(r.state === 'result', '文件头前 600 B 垃圾能修，实际 ' + r.state), ok((await pdfInfo(one(r))).pages === 4, '4 页都在')] },

  { id: 'repair/junk-prefix-2k', spec: { slug: 'repair-pdf', files: [BAD('junk-prefix-2k.pdf')], timeout: 120000 },
    check: async (r) => { if (r.state !== 'result') return [ok(false, '头部 2 KB 垃圾没救回来：' + r.alert)];
      return [ok((await pdfInfo(one(r))).pages === 4, '超出 qpdf 的 1 KB 搜索窗，靠 pdf-lib 兜底救回 4 页')]; } },

  { id: 'repair/no-eof', spec: { slug: 'repair-pdf', files: [BAD('no-eof.pdf')], timeout: 120000 },
    check: async (r) => [ok(r.state === 'result', '能修，实际 ' + r.state), ok((await pdfInfo(one(r))).pages === 4, '4 页都在')] },

  { id: 'repair/truncated', spec: { slug: 'repair-pdf', files: [BAD('truncated.pdf')], timeout: 120000 },
    check: async (r) => { if (r.state !== 'result') return [ok(!!r.alert && !/undefined|\[object/.test(r.alert), '救不回时给出可读提示：' + r.alert)];
      const i = await pdfInfo(one(r)); return [ok(i.pages >= 1, `救回 ${i.pages} 页（原 4 页）`)]; } },

  { id: 'repair/not-a-pdf', spec: { slug: 'repair-pdf', files: [BAD('not-a-pdf.pdf')], timeout: 120000 },
    check: async (r) => [ok(r.state === 'alert', '应报错，实际 ' + r.state),
      ok(!!r.alert && !/undefined|\[object|TypeError/.test(r.alert), '提示可读：' + r.alert),
      ok(r.reports === 0, '属于用户输入问题，不发报错邮件，实际发了 ' + r.reports + ' 次')] },

  { id: 'repair/empty-file', spec: { slug: 'repair-pdf', files: [BAD('empty.pdf')], timeout: 120000 },
    check: async (r) => [ok(r.state === 'alert' || r.uploadStage === 'upload', '空文件被拦下，实际 ' + (r.state ?? r.uploadStage)),
      ok(r.reports === 0, '不发报错邮件')] },

  // ---------------- unlock ----------------
  { id: 'unlock/correct-password', spec: { slug: 'unlock-pdf', files: [P('encrypted-user-pw-open123.pdf')], options: { password: 'open123', confirm: true }, timeout: 120000 },
    check: async (r) => { const e = await encState(one(r));
      return [ok(r.state === 'result', '解锁成功，实际 ' + r.state), ok(path.basename(one(r)).endsWith('_unlocked.pdf'), '输出名带 _unlocked'),
        ok(!e.encrypted && e.pages === 3, '输出无需密码即可打开，3 页，实际 ' + JSON.stringify(e))]; } },

  { id: 'unlock/wrong-password', spec: { slug: 'unlock-pdf', files: [P('encrypted-user-pw-open123.pdf')], options: { password: 'wrong', confirm: true }, timeout: 120000 },
    check: async (r) => [ok(r.state === 'alert', '应提示密码不对，实际 ' + r.state), ok(!!r.alert, '提示：' + r.alert), ok(r.reports === 0, '不发报错邮件')] },

  { id: 'unlock/without-confirm', spec: { slug: 'unlock-pdf', files: [P('encrypted-user-pw-open123.pdf')], options: { password: 'open123', confirm: false } },
    check: async (r) => [ok(r.state === 'alert', '不勾授权确认就应拦住，实际 ' + r.state), ok(!!r.alert, '提示：' + r.alert)] },

  { id: 'unlock/owner-only', spec: { slug: 'unlock-pdf', files: [P('encrypted-owner-only.pdf')], options: { password: '', confirm: true }, timeout: 120000 },
    check: async (r) => { const e = await encState(one(r));
      return [ok(r.state === 'result', '空密码即可去限制，实际 ' + r.state), ok(!e.encrypted, '输出已解密')]; } },

  { id: 'unlock/rc4-128', spec: { slug: 'unlock-pdf', files: [P('encrypted-rc4-128-open123.pdf')], options: { password: 'open123', confirm: true }, timeout: 120000 },
    check: async (r) => { const e = await encState(one(r)); return [ok(r.state === 'result', '老式 RC4 也能解，实际 ' + r.state), ok(!e.encrypted, '输出已解密')]; } },

  // ---------------- protect ----------------
  { id: 'protect/user-password', spec: { slug: 'protect-pdf', files: [P('text-5p.pdf')], options: { user: 'secret123', owner: 'ownerABC' }, timeout: 120000 },
    check: async (r) => { const e = await encState(one(r));
      return [ok(r.state === 'result', '出结果'), ok(e.encrypted, '输出确实需要密码才能打开：' + (e.why ?? ''))]; } },

  { id: 'protect/restrictions-only', spec: { slug: 'protect-pdf', files: [P('text-5p.pdf')], options: { user: '', owner: '', noPrint: true, noCopy: true }, timeout: 120000 },
    check: async (r) => { const bytes = await readFile(one(r));
      const e = await encState(one(r));
      return [ok(r.state === 'result', '出结果'), ok(bytes.includes(Buffer.from('/Encrypt')), '文件带加密字典（权限限制）'),
        ok(true, `（观察）无用户密码时 pdf-lib 读取：${e.encrypted ? '仍按加密拒绝' : '可直接打开'}`)]; } },

  { id: 'protect/same-passwords', spec: { slug: 'protect-pdf', files: [P('text-5p.pdf')], options: { user: 'same', owner: 'same' } },
    check: async (r) => [ok(r.state === 'alert', '两个密码相同应提示，实际 ' + r.state), ok(!!r.alert, '提示：' + r.alert)] },

  { id: 'protect/nothing-set', spec: { slug: 'protect-pdf', files: [P('text-5p.pdf')], options: { user: '', owner: '' } },
    check: async (r) => [ok(r.state === 'alert', '什么都不填应提示，实际 ' + r.state), ok(!!r.alert, '提示：' + r.alert)] },

  { id: 'protect/roundtrip-unlock', spec: { slug: 'protect-pdf', files: [P('text-1p.pdf')], options: { user: 'rt123456', owner: 'rtowner' }, timeout: 120000 },
    check: async (r) => [ok((await encState(one(r))).encrypted, '加密成功（下一条用解锁工具还原）')] },
];

await suite('04-opt-sec', cases);
