// 客户端工具模块注册：按 slug 懒加载，首页和其它页面不会打包这些代码。
import type { ToolModule } from '@/lib/types';

const loaders: Record<string, () => Promise<{ default: ToolModule }>> = {
  'merge-pdf': () => import('./merge-pdf'),
  'split-pdf': () => import('./split-pdf'),
  'rotate-pdf': () => import('./rotate-pdf'),
  'organize-pdf': () => import('./organize-pdf'),
  'add-page-numbers': () => import('./add-page-numbers'),
  'add-watermark': () => import('./add-watermark'),
  'jpg-to-pdf': () => import('./jpg-to-pdf'),
  'pdf-to-jpg': () => import('./pdf-to-jpg'),
  'compress-pdf': () => import('./compress-pdf'),
  'unlock-pdf': () => import('./unlock-pdf'),
  'protect-pdf': () => import('./protect-pdf'),
};

export async function loadTool(slug: string): Promise<ToolModule> {
  const loader = loaders[slug];
  if (!loader) throw new Error(`Unknown tool: ${slug}`);
  return (await loader()).default;
}
