import { defineConfig } from 'astro/config';
import { SITE } from './src/config/site.ts';

export default defineConfig({
  site: SITE.url,
  output: 'static',
  build: { format: 'directory' },
  vite: {
    // 错误报告里带上部署的 commit（Workers Builds 提供 WORKERS_CI_COMMIT_SHA），见 src/lib/report.ts
    define: { __BUILD__: JSON.stringify((process.env.WORKERS_CI_COMMIT_SHA ?? 'local').slice(0, 7)) },
    // 不内联任何脚本：public/_headers 的 CSP 是 script-src 'self'，内联脚本会被拦
    build: { assetsInlineLimit: 0 },
    // include：启动时就预打包，避免首次打开某个工具时中途重新优化依赖，
    // 导致动态 import 报 "Failed to fetch dynamically imported module"（504 Outdated Optimize Dep）
    optimizeDeps: {
      exclude: ['pdfjs-dist'],
      include: ['pdf-lib', '@pdf-lib/fontkit', 'jszip', 'tesseract.js'],
    },
  },
});
