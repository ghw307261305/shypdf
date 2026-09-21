import type { APIRoute } from 'astro';
import { SITE } from '@/config/site';
import { LIVE_SLUGS } from '@/data/tools';
import { GUIDES, type GuideMeta } from '@/data/guides';
import { LOCALES, localePath } from '@/i18n';

// 一篇指南自己的最后改动日；列表页取最新的那篇。
const guideLastmod = (g: GuideMeta) => g.updated ?? g.published;
const latestGuide = GUIDES.map(guideLastmod).sort().at(-1) ?? SITE.contentUpdated;

export const GET: APIRoute = () => {
  const abs = (path: string) => new URL(path, SITE.url).href;
  // 有译文的页面：每种语言一条，互相用 xhtml:link 声明 hreflang（和 <head> 里的一致）。
  // 这些页的正文一起维护，所以共用 SITE.contentUpdated 作为 lastmod；单独改过的页面看 contentUpdatedOverrides。
  const translated = ['/', ...LIVE_SLUGS.map((s) => `/${s}/`), '/about/'];
  // 只有英文版的页面，各自带自己的日期
  const englishOnly: [path: string, lastmod: string][] = [
    ['/guides/', latestGuide],
    ...GUIDES.map((g): [string, string] => [`/guides/${g.slug}/`, guideLastmod(g)]),
    ['/privacy/', SITE.legalUpdated],
    ['/terms/', SITE.legalUpdated],
    ['/licenses/', SITE.legalUpdated],
  ];
  const entries = [
    ...translated.flatMap((path) => {
      const links = [
        ...LOCALES.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${abs(localePath(l, path))}"/>`),
        `<xhtml:link rel="alternate" hreflang="x-default" href="${abs(path)}"/>`,
      ].join('');
      const lastmod = SITE.contentUpdatedOverrides[path] ?? SITE.contentUpdated;
      return LOCALES.map((l) => `  <url><loc>${abs(localePath(l, path))}</loc><lastmod>${lastmod}</lastmod>${links}</url>`);
    }),
    ...englishOnly.map(([path, lastmod]) => `  <url><loc>${abs(path)}</loc><lastmod>${lastmod}</lastmod></url>`),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
