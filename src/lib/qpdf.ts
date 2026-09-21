// qpdf（WASM）封装：用于加密 / 解密 / 修复。文件来自 npm 包 @jspawn/qpdf-wasm，由 scripts/vendor.mjs 拷到 public/vendor/qpdf/，按需以 <script> 载入。
// 每次调用新建一个 Module 实例（Emscripten 的 callMain 只能跑一次）。

import { t } from './i18n-client';

declare global {
  interface Window { Module?: (opts: any) => Promise<any>; }
}

let scriptLoaded: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptLoaded) return scriptLoaded;
  scriptLoaded = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/vendor/qpdf/qpdf.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(t('lib.qpdfLoad')));
    document.head.appendChild(s);
  });
  return scriptLoaded;
}

export class QpdfError extends Error {
  constructor(message: string, public code: number) { super(message); }
}

/**
 * 运行 qpdf 命令行。args 中用 'in.pdf' / 'out.pdf' 指代输入输出。
 * 返回输出文件字节；qpdf 非 0 退出时抛 QpdfError（消息为 stderr）。
 */
export async function runQpdf(input: Uint8Array, args: string[]): Promise<Uint8Array> {
  await loadScript();
  const factory = window.Module ?? (window as any).exports?.Module;
  if (!factory) throw new Error('qpdf module is not ready');
  const stderr: string[] = [];
  const mod = await factory({
    locateFile: (f: string) => '/vendor/qpdf/' + f,
    printErr: (line: string) => stderr.push(line),
    print: () => {},
  });
  mod.FS.writeFile('in.pdf', input);
  let code = 0;
  try {
    code = mod.callMain(args);
  } catch (e: any) {
    // Emscripten 在 exit() 时抛 ExitStatus
    if (e && typeof e.status === 'number') code = e.status; else throw e;
  }
  if (code !== 0 && code !== 3) { // 3 = 有警告但已输出
    throw new QpdfError(stderr.join('\n') || `qpdf exited with code ${code}`, code);
  }
  try {
    return mod.FS.readFile('out.pdf') as Uint8Array;
  } catch {
    throw new QpdfError(stderr.join('\n') || 'No output file was produced', code);
  }
}
