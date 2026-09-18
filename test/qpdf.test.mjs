import { createRequire } from 'module';
import { PDFDocument } from 'pdf-lib';
const require = createRequire(import.meta.url);
globalThis.fetch = undefined;
// 项目是 type: module，qpdf.js 需以 CommonJS 载入，先复制成 .cjs
import { copyFileSync } from 'fs';
copyFileSync('public/vendor/qpdf/qpdf.js', '/tmp/qpdf-test.cjs'); copyFileSync('public/vendor/qpdf/qpdf.wasm', '/tmp/qpdf.wasm');
const createModule = require('/tmp/qpdf-test.cjs');
// 用法：node test/qpdf.test.mjs（在项目根目录运行）

async function run(input, args) {
  const err = [];
  const fs = await import('fs'); const mod = await createModule({ wasmBinary: fs.readFileSync('public/vendor/qpdf/qpdf.wasm'), printErr: (l) => err.push(l), print: () => {} });
  mod.FS.writeFile('in.pdf', input);
  let code = 0;
  try { code = mod.callMain(args); } catch (e) { if (typeof e?.status === 'number') code = e.status; else throw e; }
  let out = null; try { out = mod.FS.readFile('out.pdf'); } catch {}
  return { code, err: err.join('\n'), out };
}
const doc = await PDFDocument.create(); doc.addPage([300, 300]).drawText('hi', { x: 20, y: 20 });
const src = await doc.save();

let r = await run(src, ['--encrypt', 'open123', 'ownerXYZ', '256', '--print=none', '--modify=all', '--extract=y', '--', 'in.pdf', 'out.pdf']);
console.log('encrypt code', r.code, r.err, 'bytes', r.out?.length);
const enc = r.out;
r = await run(enc, ['--decrypt', 'in.pdf', 'out.pdf']);
console.log('decrypt no pw → code', r.code, '|', r.err.split('\n')[0]);
r = await run(enc, ['--decrypt', '--password=open123', 'in.pdf', 'out.pdf']);
console.log('decrypt with pw → code', r.code, r.err, 'bytes', r.out?.length);
const d = await PDFDocument.load(r.out); console.log('decrypted opens in pdf-lib, pages:', d.getPageCount());
// owner-password-only file (user pw empty)
r = await run(src, ['--encrypt', '', 'ownerXYZ', '256', '--print=none', '--', 'in.pdf', 'out.pdf']);
console.log('owner-only encrypt code', r.code, r.err);
r = await run(r.out, ['--decrypt', 'in.pdf', 'out.pdf']);
console.log('owner-only decrypt code', r.code, r.err);
