import { defineConfig } from 'astro/config';
import { SITE } from './src/config/site.ts';

export default defineConfig({
  site: SITE.url,
  output: 'static',
  build: { format: 'directory' },
  vite: {
    // 不内联任何脚本：public/_headers 的 CSP 是 script-src 'self'，内联脚本会被拦
    build: { assetsInlineLimit: 0 },
    optimizeDeps: { exclude: ['pdfjs-dist'] },
  },
});
