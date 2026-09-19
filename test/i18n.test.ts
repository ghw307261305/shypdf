// 字典一致性检查：每种语言的 key、数组长度、{占位符} 必须和英文完全一致；工具页内容的小节 / 段落 / FAQ 数量一致。
// 少翻一条、占位符写错，页面不会报错只会显示错，所以放在 npm test 里拦。
import { LOCALES, DEFAULT_LOCALE, getDict, getToolContent } from '@/i18n';
import { LIVE_SLUGS } from '@/data/tools';

const errors: string[] = [];
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

function compare(en: unknown, other: unknown, path: string, locale: string) {
  if (typeof en === 'string') {
    if (typeof other !== 'string') errors.push(`${locale} ${path}: expected a string`);
    else {
      if (!other.trim()) errors.push(`${locale} ${path}: empty`);
      if (placeholders(en) !== placeholders(other)) errors.push(`${locale} ${path}: placeholders differ — en {${placeholders(en)}} vs {${placeholders(other)}}`);
    }
  } else if (Array.isArray(en)) {
    if (!Array.isArray(other) || other.length !== en.length) errors.push(`${locale} ${path}: expected an array of ${en.length}`);
    else en.forEach((v, i) => compare(v, other[i], `${path}[${i}]`, locale));
  } else if (en && typeof en === 'object') {
    if (!other || typeof other !== 'object') { errors.push(`${locale} ${path}: expected an object`); return; }
    const a = en as Record<string, unknown>, b = other as Record<string, unknown>;
    for (const k of Object.keys(a)) (k in b) ? compare(a[k], b[k], `${path}.${k}`, locale) : errors.push(`${locale} ${path}.${k}: missing`);
    for (const k of Object.keys(b)) if (!(k in a)) errors.push(`${locale} ${path}.${k}: not in en`);
  }
}

const en = getDict(DEFAULT_LOCALE);
for (const slug of LIVE_SLUGS) {
  if (!(slug in en.tools)) errors.push(`en tools.${slug}: missing`);
  if (!getToolContent(DEFAULT_LOCALE, slug)) errors.push(`en content.${slug}: missing`);
}
// client key 的前缀决定它会被嵌进哪些工具页（见 i18n/index.ts 的 clientDict）
for (const k of Object.keys(en.client)) {
  const prefix = k.slice(0, k.indexOf('.'));
  if (!['app', 'lib', 'opt', ...LIVE_SLUGS].includes(prefix)) errors.push(`en client.${k}: unknown prefix "${prefix}"`);
}

for (const locale of LOCALES) {
  if (locale === DEFAULT_LOCALE) continue;
  compare(en, getDict(locale), 'dict', locale);
  for (const slug of LIVE_SLUGS) compare(getToolContent(DEFAULT_LOCALE, slug), getToolContent(locale, slug), `content.${slug}`, locale);
}

if (errors.length) {
  console.error(errors.join('\n'));
  throw new Error(`FAIL: ${errors.length} i18n problem(s)`);
}
console.log(`ok  i18n: ${LOCALES.length} locales consistent with en`);
