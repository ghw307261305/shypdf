import type { APIRoute } from 'astro';
import { SITE } from '@/config/site';
import { liveTools } from '@/data/tools';
import { GUIDES } from '@/data/guides';

export const GET: APIRoute = () => {
  const urls = ['/', ...liveTools().map((t) => `/${t.slug}/`), '/guides/', ...GUIDES.map((g) => `/guides/${g.slug}/`), '/about/', '/privacy/', '/terms/', '/licenses/'];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${new URL(u, SITE.url).href}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
