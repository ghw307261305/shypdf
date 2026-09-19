// 多语言配置。新增一种语言 = 在 LOCALES / LOCALE_INFO 加一项 + 在 locales/ 下加一个字典文件 + 在 index.ts 登记。
// 英文是默认语言，放在根路径（/merge-pdf/）；其它语言带前缀（/es/merge-pdf/）。slug 不翻译。

export const LOCALES = ['en', 'es', 'pt', 'fr', 'de', 'ja', 'zh', 'zh-tw'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_INFO: Record<Locale, { name: string; htmlLang: string; og: string }> = {
  en: { name: 'English', htmlLang: 'en', og: 'en_US' },
  es: { name: 'Español', htmlLang: 'es', og: 'es_ES' },
  pt: { name: 'Português', htmlLang: 'pt-BR', og: 'pt_BR' },
  fr: { name: 'Français', htmlLang: 'fr', og: 'fr_FR' },
  de: { name: 'Deutsch', htmlLang: 'de', og: 'de_DE' },
  ja: { name: '日本語', htmlLang: 'ja', og: 'ja_JP' },
  zh: { name: '简体中文', htmlLang: 'zh-Hans', og: 'zh_CN' },
  'zh-tw': { name: '繁體中文', htmlLang: 'zh-Hant', og: 'zh_TW' },
};

/** 不带语言前缀的路径（'/merge-pdf/'）→ 该语言下的路径 */
export function localePath(locale: Locale, path = '/'): string {
  return locale === DEFAULT_LOCALE ? path : `/${locale}${path}`;
}

/** 从当前 URL 里去掉语言前缀，得到各语言共用的路径 */
export function barePath(locale: Locale, pathname: string): string {
  if (locale === DEFAULT_LOCALE) return pathname;
  return pathname.replace(new RegExp(`^/${locale}(?=/|$)`), '') || '/';
}

/** 给 src/pages/[...locale]/ 下的页面用：英文的 locale 参数是 undefined（根路径） */
export function localeStaticPaths() {
  return LOCALES.map((locale) => ({
    params: { locale: locale === DEFAULT_LOCALE ? undefined : locale },
    props: { locale },
  }));
}
