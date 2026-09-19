// 浏览器端的翻译函数。字典由 pages/[...locale]/[slug].astro 以 <script type="application/json" id="i18n"> 嵌在页面里
// （只含当前语言、当前工具用得到的 key）。Node 测试里没有 document，用 setClientDict() 注入。
import type { Dict } from '@/i18n/locales/en';
import { fmt } from '@/i18n/format';

type Client = Dict['client'];
type PluralKey = { [K in keyof Client]: Client[K] extends string ? never : K }[keyof Client];
type TextKey = Exclude<keyof Client, PluralKey>;
type Vars = Record<string, string | number>;

let dict: Partial<Client> = {};
let lang = 'en';
let plural = new Intl.PluralRules(lang);

export function setClientDict(d: Partial<Client>, l = 'en') {
  dict = d;
  lang = l;
  plural = new Intl.PluralRules(l);
}

if (typeof document !== 'undefined') {
  const el = document.getElementById('i18n');
  if (el?.textContent) setClientDict(JSON.parse(el.textContent), document.documentElement.lang || 'en');
}

export function t(key: TextKey, vars?: Vars): string {
  return fmt(dict[key] ?? key, vars);
}

/** 复数：t 的带数量版本，{n} 自动填入 */
export function tn(key: PluralKey, n: number, vars?: Vars): string {
  const forms = dict[key] as Record<string, string> | undefined;
  return fmt(forms?.[plural.select(n)] ?? forms?.other ?? key, { n, ...vars });
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

/** 拼 HTML（选项面板）时用：翻译后转义，放进文本或属性值都安全 */
export function th(key: TextKey, vars?: Vars): string {
  return escapeHtml(t(key, vars));
}

/** 按当前语言格式化数字，如 1.5 → "1,5"（de / fr / es / pt） */
export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false }).format(n);
}
