// 把浏览器运行时要按需下载的大文件从 node_modules 拷到 public/vendor/（qpdf、OCR 引擎和语言包、Word 转 PDF 用的字体、字体子集器）。
// 这些文件不进 git（见 .gitignore），版本由 package-lock.json 锁定；npm 的 predev / prebuild / pretest 钩子会自动跑这个脚本。
// CSP 是 connect-src 'self'，所以它们必须由本站提供，不能指向 CDN。
// 新增 OCR 语言：npm i @tesseract.js-data/<code>，在 OCR_LANGS 里加一项，再到 src/tools/ocr-pdf.ts 的 LANGS 里登记。
import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = (p) => join(root, 'node_modules', p);
const out = (p) => join(root, 'public/vendor', p);

export const OCR_LANGS = ['eng', 'spa', 'por', 'fra', 'deu', 'ita', 'jpn', 'chi_sim', 'chi_tra'];

const font = (pkg, dir, file) => [`@expo-google-fonts/${pkg}/${dir}/${file}_${dir}.ttf`, `fonts/${file}-${dir}.ttf`];
const family = (pkg, file) => ['400Regular', '400Regular_Italic', '700Bold', '700Bold_Italic'].map((d) => font(pkg, d, file));

const files = [
  // ---- 加密 / 解密 / 修复：qpdf 11 的 Emscripten 构建（只暴露命令行，src/lib/qpdf.ts 用 callMain 调）。LICENSE 跟着一起发 ----
  ...['qpdf.js', 'qpdf.wasm', 'LICENSE'].map((f) => [`@jspawn/qpdf-wasm/${f}`, `qpdf/${f}`]),
  // ---- OCR：tesseract.js 的 worker + 仅 LSTM 的三种 WASM 核心（worker 按浏览器能力自己挑）+ 语言包 ----
  ['tesseract.js/dist/worker.min.js', 'tesseract/worker.min.js'],
  ...['lstm', 'simd-lstm', 'relaxedsimd-lstm'].map((v) => [`tesseract.js-core/tesseract-core-${v}.wasm.js`, `tesseract/core/tesseract-core-${v}.wasm.js`]),
  ...OCR_LANGS.map((l) => [`@tesseract.js-data/${l}/4.0.0_best_int/${l}.traineddata.gz`, `tesseract/lang/${l}.traineddata.gz`]),
  // ---- Word 转 PDF：与 Office 字体度量兼容的开源字体（Calibri→Carlito，Arial→Arimo，Times New Roman→Tinos，Courier New→Cousine）+ CJK ----
  ...family('carlito', 'Carlito'), ...family('arimo', 'Arimo'), ...family('tinos', 'Tinos'), ...family('cousine', 'Cousine'),
  font('noto-sans-jp', '400Regular', 'NotoSansJP'), font('noto-sans-sc', '400Regular', 'NotoSansSC'), font('noto-sans-kr', '400Regular', 'NotoSansKR'),
  // ---- 字体子集器（HarfBuzz） ----
  ['harfbuzzjs/dist/harfbuzz-subset.wasm', 'hb/harfbuzz-subset.wasm'],
];

let copied = 0;
for (const [from, to] of files) {
  const src = nm(from), dst = out(to);
  if (!existsSync(src)) throw new Error(`vendor: ${from} not found — run npm install`);
  if (existsSync(dst) && statSync(dst).size === statSync(src).size) continue;
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  copied++;
}
console.log(`vendor: ${files.length} files in public/vendor (${copied} copied)`);
