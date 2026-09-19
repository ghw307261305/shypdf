import type { APIRoute } from 'astro';
import { SITE } from '@/config/site';
import { LIVE_SLUGS } from '@/data/tools';
import { GUIDES } from '@/data/guides';
import { LOCALES, localePath } from '@/i18n';

export const GET: APIRoute = () => {
  const abs = (path: string) => new URL(path, SITE.url).href;
  // 有译文的页面：每种语言一条，互相用 xhtml:link 声明 hreflang（和 <head> 里的一致）
  const translated = ['/', ...LIVE_SLUGS.map((s) => `/${s}/`), '/about/'];
  // 只有英文版的页面
  const englishOnly = ['/guides/', ...GUIDES.map((g) => `/guides/${g.slug}/`), '/privacy/', '/terms/', '/licenses/'];
  const entries = [
    ...translated.flatMap((path) => {
      const links = [
        ...LOCALES.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${abs(localePath(l, path))}"/>`),
        `<xhtml:link rel="alternate" hreflang="x-default" href="${abs(path)}"/>`,
      ].join('');
      return LOCALES.map((l) => `  <url><loc>${abs(localePath(l, path))}</loc>${links}</url>`);
    }),
    ...englishOnly.map((path) => `  <url><loc>${abs(path)}</loc></url>`),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
