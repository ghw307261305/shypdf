// 顺序跑完所有验收套件（生产构建那套要单独跑，见 README）。
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const suites = ['01-edit', '02-workspace', '03-convert', '04-opt-sec', '05-ocr', '06-generic', '07-site'];
const only = process.argv.slice(2);
const list = only.length ? suites.filter((s) => only.some((o) => s.includes(o))) : suites;
let failed = 0;
for (const s of list) {
  console.log(`\n───── ${s} ─────`);
  const code = await new Promise((res) => spawn(process.execPath, [fileURLToPath(new URL(`./${s}.mjs`, import.meta.url))], { stdio: 'inherit' }).on('exit', res));
  if (code !== 0) failed++;
}
process.exit(failed ? 1 : 0);
