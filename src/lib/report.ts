// 自动错误上报：工具出错时把「诊断信息」POST 到同源的 /api/error-report（worker/index.ts），由 Worker 发邮件给站长。
// 只报程序缺陷，不报 UserError（lib/errors.ts）。
// 隐私红线 —— 报告里绝不能有：文件内容、文件名、密码、水印 / 签名等用户输入的文字。隐私政策（pages/privacy.astro）里写了这份清单，改这里要同步改那边。
import { UserError } from './errors';

declare const __BUILD__: string; // astro.config.mjs 的 vite.define：部署的 commit

const ENDPOINT = '/api/error-report';
const MAX_PER_PAGE = 5; // 一次页面访问最多报几条，防止循环报错刷屏
const sent = new Set<string>();

export interface ReportContext {
  /** 出错的环节：load 加载工具 / open 打开文件 / run 处理 / global 未捕获 */
  stage: 'load' | 'open' | 'run' | 'global';
  tool?: string;
  /** 输入文件（只取扩展名和大小，不取文件名） */
  files?: File[];
  /** 选项表单（只取下拉 / 单选 / 复选 / 数字，不取文本框和密码） */
  form?: HTMLFormElement;
}

// 不是缺陷的常见错误：加密的 PDF（pdf-lib / pdf.js 的原始报错）、浏览器扩展和 ResizeObserver 的噪音
const IGNORE = /is encrypted|PasswordException|No password given|Incorrect Password|ResizeObserver loop|^Script error\.?$/i;

function safeOptions(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (const el of Array.from(form.elements)) {
    const f = el as HTMLInputElement | HTMLSelectElement;
    if (!f.name) continue;
    if (f instanceof HTMLSelectElement) out[f.name] = f.value;
    else if (f instanceof HTMLInputElement) {
      if (f.type === 'checkbox') out[f.name] = String(f.checked);
      else if (f.type === 'radio') { if (f.checked) out[f.name] = f.value; }
      else if (f.type === 'number' || f.type === 'range') out[f.name] = f.value;
    }
  }
  return out;
}

export function reportError(err: unknown, ctx: ReportContext) {
  try {
    if (import.meta.env.DEV) return; // astro dev 没有 Worker 端点
    if (err instanceof UserError) return;
    const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err));
    if (IGNORE.test(`${e.name} ${e.message}`)) return;
    const key = `${ctx.tool}|${e.name}|${e.message}`;
    if (sent.has(key) || sent.size >= MAX_PER_PAGE) return;
    sent.add(key);

    // 错误消息里偶尔会带文件名，抹掉
    const names = (ctx.files ?? []).map((f) => f.name).filter((n) => n.length > 2);
    const scrub = (s: string) => names.reduce((acc, n) => acc.split(n).join('<file>'), s);
    const nav = navigator as Navigator & { deviceMemory?: number };

    const body = {
      tool: ctx.tool ?? '',
      stage: ctx.stage,
      name: e.name,
      message: scrub(e.message),
      stack: scrub(e.stack ?? ''),
      cause: e.cause == null ? '' : scrub(String((e.cause as Error).message ?? e.cause)),
      path: location.pathname,
      lang: document.documentElement.lang,
      build: typeof __BUILD__ === 'string' ? __BUILD__ : '',
      ua: navigator.userAgent,
      memoryGB: nav.deviceMemory ?? null,
      cores: navigator.hardwareConcurrency ?? null,
      files: (ctx.files ?? []).slice(0, 20).map((f) => ({ ext: f.name.includes('.') ? f.name.split('.').pop()!.toLowerCase().slice(0, 8) : '', size: f.size })),
      options: ctx.form ? safeOptions(ctx.form) : {},
    };
    // keepalive：用户出错后立刻关掉页面也能发出去
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
  } catch { /* 上报本身绝不能再抛错 */ }
}

/** 未捕获的错误（自定义工作区里的事件回调等）。只认本站脚本抛出的，浏览器扩展注入的脚本不算。 */
export function installGlobalReporter(tool?: string) {
  const own = (s: string | undefined) => !!s && s.includes(location.origin);
  window.addEventListener('error', (ev) => {
    if (own(ev.filename) || own(ev.error?.stack)) reportError(ev.error ?? ev.message, { stage: 'global', tool });
  });
  window.addEventListener('unhandledrejection', (ev) => {
    if (own(ev.reason?.stack)) reportError(ev.reason, { stage: 'global', tool });
  });
}
