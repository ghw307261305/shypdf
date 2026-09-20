// 站点唯一的服务端代码：接收浏览器自动上报的错误（src/lib/report.ts），发邮件给站长。
// 只有 /api/* 会先进这里（wrangler.jsonc 的 run_worker_first），其余请求直接由静态资源响应。
// 发信用 Cloudflare Email Routing 的 send_email 绑定（免费；收件地址必须是 Email Routing 里验证过的 Destination address）。配置步骤见 README「错误报告邮件」。
import { EmailMessage } from 'cloudflare:email';
import { parseReport, fingerprint, emailSubject, emailText, buildMime, MAX_BODY } from './report';

interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> };
  MAILER: { send(msg: EmailMessage): Promise<void> };
  REPORT_LIMIT?: { limit(o: { key: string }): Promise<{ success: boolean }> };
  /** 发件地址，域名必须开了 Email Routing（wrangler.jsonc 的 vars） */
  REPORT_FROM: string;
  /** 收件地址：wrangler secret put REPORT_TO（不进 git） */
  REPORT_TO?: string;
}

const DEDUPE_SECONDS = 6 * 3600; // 同一个错误多久内只发一封

const done = () => new Response(null, { status: 204 }); // 对浏览器永远答 204：上报成不成功都和用户无关

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function handleReport(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const url = new URL(request.url);
  // 只收本站页面发来的（挡掉别的网站顺手 POST；真要伪造的人由下面的限流兜底）
  if (request.headers.get('Origin') !== url.origin) return new Response(null, { status: 403 });
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY) return new Response(null, { status: 413 });

  const report = parseReport(await request.text());
  if (!report) return new Response(null, { status: 400 });

  // 去重：同一个错误在缓存有效期内只发一封。Cache API 按 Cloudflare 机房各存一份，所以同一个错误最多每个机房一封 —— 不用 KV，零配置
  const cache = (caches as unknown as { default: Cache }).default;
  const dedupeKey = new Request(`${url.origin}/__error-dedupe/${await sha256(fingerprint(report))}`);
  if (await cache.match(dedupeKey)) return done();

  // 限流兜底：有人变着消息刷接口时，保护邮箱
  if (env.REPORT_LIMIT && !(await env.REPORT_LIMIT.limit({ key: 'error-report' })).success) return done();

  // 无论邮件发没发出去，Workers Logs 里都有一份
  console.error('error-report', JSON.stringify(report));
  if (!env.REPORT_TO) { console.warn('REPORT_TO is not set — run: npx wrangler secret put REPORT_TO'); return done(); }

  const now = new Date();
  const mime = buildMime({
    from: env.REPORT_FROM,
    to: env.REPORT_TO,
    subject: emailSubject(report),
    text: emailText(report, { country: (request as Request & { cf?: { country?: string } }).cf?.country, time: now.toISOString() }),
    messageId: `${crypto.randomUUID()}@${env.REPORT_FROM.split('@')[1]}`,
    date: now,
  });
  try {
    await env.MAILER.send(new EmailMessage(env.REPORT_FROM, env.REPORT_TO, mime));
    await cache.put(dedupeKey, new Response('1', { headers: { 'Cache-Control': `max-age=${DEDUPE_SECONDS}` } }));
  } catch (e) {
    console.error('error-report: send failed', (e as Error).message);
  }
  return done();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/error-report') return handleReport(request, env);
    if (pathname.startsWith('/api/')) return new Response(null, { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
