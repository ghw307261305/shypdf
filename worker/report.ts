// 错误报告的校验与邮件正文（纯函数，不依赖 Workers 运行时，test/report-worker.test.ts 直接测）。
// 报告来自 src/lib/report.ts；这里不信任任何字段：只取已知的 key，全部截断。

export interface Report {
  tool: string; stage: string; name: string; message: string; stack: string; cause: string;
  path: string; lang: string; build: string; ua: string;
  memoryGB: number | null; cores: number | null;
  files: { ext: string; size: number }[];
  options: Record<string, string>;
}

export const MAX_BODY = 16 * 1024;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v : '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, max);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** 不是合法报告就返回 null */
export function parseReport(raw: string): Report | null {
  if (raw.length > MAX_BODY) return null;
  let d: any;
  try { d = JSON.parse(raw); } catch { return null; }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const message = str(d.message, 1000);
  if (!message) return null;
  const tool = str(d.tool, 40);
  if (tool && !/^[a-z0-9-]+$/.test(tool)) return null;
  return {
    tool,
    stage: str(d.stage, 10),
    name: str(d.name, 80),
    message,
    stack: str(d.stack, 4000),
    cause: str(d.cause, 500),
    path: str(d.path, 200),
    lang: str(d.lang, 10),
    build: str(d.build, 40),
    ua: str(d.ua, 300),
    memoryGB: num(d.memoryGB),
    cores: num(d.cores),
    files: (Array.isArray(d.files) ? d.files : []).slice(0, 20).map((f: any) => ({ ext: str(f?.ext, 8), size: num(f?.size) ?? 0 })),
    options: Object.fromEntries(Object.entries(d.options && typeof d.options === 'object' ? d.options : {}).slice(0, 30).map(([k, v]) => [str(k, 40), str(v, 80)])),
  };
}

/** 同一个缺陷的指纹：同工具、同错误名、同消息（数字抹掉，「第 3 页」和「第 7 页」算同一个） */
export function fingerprint(r: Report): string {
  return `${r.tool}|${r.name}|${r.message.replace(/\d+/g, '#')}`;
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;

export function emailSubject(r: Report): string {
  return `[ShyPDF] ${r.tool || r.path || 'site'}: ${r.message.split('\n')[0].slice(0, 80)}`;
}

export function emailText(r: Report, extra: { country?: string; time: string }): string {
  const total = r.files.reduce((s, f) => s + f.size, 0);
  return [
    `Tool:     ${r.tool || '-'}  (stage: ${r.stage || '-'})`,
    `Error:    ${r.name}: ${r.message}`,
    ...(r.cause ? [`Cause:    ${r.cause}`] : []),
    `Page:     ${r.path}  (lang: ${r.lang || '-'})`,
    `Build:    ${r.build || '-'}`,
    `Time:     ${extra.time}`,
    `Country:  ${extra.country || '-'}`,
    `Browser:  ${r.ua}`,
    `Device:   ${r.memoryGB ?? '?'} GB RAM, ${r.cores ?? '?'} cores`,
    `Files:    ${r.files.length ? `${r.files.length} (${mb(total)} total) — ${r.files.map((f) => `.${f.ext || '?'} ${mb(f.size)}`).join(', ')}` : '-'}`,
    `Options:  ${Object.keys(r.options).length ? Object.entries(r.options).map(([k, v]) => `${k}=${v}`).join(', ') : '-'}`,
    '',
    'Stack:',
    r.stack || '(none)',
    '',
    '--',
    'Sent automatically by the /api/error-report Worker. Identical errors are sent at most once every few hours per Cloudflare location.',
  ].join('\n');
}

const b64 = (bytes: Uint8Array) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };

/** RFC 2047：非 ASCII 的标题（报错消息可能是日文 / 中文）切成多个 encoded-word，每个不超过 75 字符 */
function encodeHeader(text: string): string {
  if (/^[\x20-\x7e]*$/.test(text)) return text;
  const enc = new TextEncoder();
  const words: string[] = [];
  let chunk = '';
  for (const ch of text) {
    if (enc.encode(chunk + ch).length > 39) { words.push(chunk); chunk = ''; }
    chunk += ch;
  }
  if (chunk) words.push(chunk);
  return words.map((w) => `=?UTF-8?B?${b64(enc.encode(w))}?=`).join('\r\n ');
}

/** 手写一封最小的 MIME 邮件（纯文本、base64 正文），省掉 mimetext 依赖 */
export function buildMime(o: { from: string; to: string; subject: string; text: string; messageId: string; date: Date }): string {
  const body = b64(new TextEncoder().encode(o.text)).replace(/.{76}/g, '$&\r\n');
  return [
    `From: ShyPDF errors <${o.from}>`,
    `To: <${o.to}>`,
    `Subject: ${encodeHeader(o.subject)}`,
    `Message-ID: <${o.messageId}>`,
    `Date: ${o.date.toUTCString().replace('GMT', '+0000')}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
  ].join('\r\n');
}
