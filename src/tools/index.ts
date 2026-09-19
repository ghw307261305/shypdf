// 客户端工具模块注册：按 slug 懒加载，首页和其它页面不会打包这些代码。
import type { ToolModule } from '@/lib/types';

const loaders: Record<string, () => Promise<{ default: ToolModule }>> = {
  'merge-pdf': () => import('./merge-pdf'),
  'split-pdf': () => import('./split-pdf'),
  'rotate-pdf': () => import('./rotate-pdf'),
  'organize-pdf': () => import('./organize-pdf'),
  'add-page-numbers': () => import('./add-page-numbers'),
  'add-watermark': () => import('./add-watermark'),
  'crop-pdf': () => import('./crop-pdf'),
  'delete-pages': () => import('./delete-pages'),
  'extract-pages': () => import('./extract-pages'),
  'edit-pdf': () => import('./edit-pdf'),
  'fill-pdf': () => import('./fill-pdf'),
  'jpg-to-pdf': () => import('./jpg-to-pdf'),
  'png-to-pdf': () => import('./png-to-pdf'),
  'pdf-to-jpg': () => import('./pdf-to-jpg'),
  'pdf-to-png': () => import('./pdf-to-png'),
  'pdf-to-text': () => import('./pdf-to-text'),
  'pdf-to-word': () => import('./pdf-to-word'),
  'word-to-pdf': () => import('./word-to-pdf'),
  'compress-pdf': () => import('./compress-pdf'),
  'ocr-pdf': () => import('./ocr-pdf'),
  'repair-pdf': () => import('./repair-pdf'),
  'unlock-pdf': () => import('./unlock-pdf'),
  'protect-pdf': () => import('./protect-pdf'),
  'sign-pdf': () => import('./sign-pdf'),
};

export async function loadTool(slug: string): Promise<ToolModule> {
  const loader = loaders[slug];
  if (!loader) throw new Error(`Unknown tool: ${slug}`);
  return (await loader()).default;
}
