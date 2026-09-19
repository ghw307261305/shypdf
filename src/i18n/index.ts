// 服务端入口（.astro 页面用）。浏览器端不要 import 这个文件 —— 会把所有语言打进包里；浏览器用 lib/i18n-client.ts。
import type { Locale } from './config';
import type { Dict } from './locales/en';
import en from './locales/en';
import es from './locales/es';
import pt from './locales/pt';
import fr from './locales/fr';
import de from './locales/de';
import ja from './locales/ja';
import type { ToolContent } from './content/en';
import cEn from './content/en';
import cEs from './content/es';
import cPt from './content/pt';
import cFr from './content/fr';
import cDe from './content/de';
import cJa from './content/ja';

export * from './config';
export { fmt } from './format';
export type { Dict, ToolContent };

const DICTS: Record<Locale, Dict> = { en, es, pt, fr, de, ja };

const CONTENT: Record<Locale, Record<string, ToolContent>> = { en: cEn, es: cEs, pt: cPt, fr: cFr, de: cDe, ja: cJa };

export const getDict = (locale: Locale): Dict => DICTS[locale];

/** 工具页的 SEO 内容（<title>、正文小节、追加 FAQ） */
export const getToolContent = (locale: Locale, slug: string): ToolContent | undefined => CONTENT[locale][slug];

/** 嵌进工具页的客户端字典：通用部分 + 当前工具自己的 key */
// 复用其它工具实现的页面（png-to-pdf 等）还要带上被复用工具的 key
const CLIENT_ALIAS: Record<string, string> = { 'png-to-pdf': 'jpg-to-pdf', 'pdf-to-png': 'pdf-to-jpg' };
export function clientDict(locale: Locale, slug: string): Record<string, unknown> {
  const keep = new Set(['app', 'lib', 'opt', slug]);
  if (CLIENT_ALIAS[slug]) keep.add(CLIENT_ALIAS[slug]);
  return Object.fromEntries(Object.entries(DICTS[locale].client).filter(([k]) => keep.has(k.slice(0, k.indexOf('.')))));
}
