// 工具注册表：新增一个工具 = 在这里加一条 + 在 src/i18n/locales/*.ts 的 tools 里加文案 + 在 src/tools/ 下写一个模块。
// slug 即 URL（/merge-pdf/，各语言相同），也是 src/tools/<slug>.ts 的文件名。
// 这里只放与语言无关的信息；名称、简介、步骤、FAQ 都在字典里，由 getTools(locale) 合并。
import { getDict, type Locale } from '@/i18n';

export type Category = 'edit' | 'convert' | 'optimize' | 'security';
export type Phase = 1 | 2 | 3;

export interface ToolMeta {
  slug: string;
  name: string;            // 页面 H1 / 卡片标题
  short: string;           // 卡片一句话
  description: string;     // 页面副标题，也用于 <meta description>
  category: Category;
  phase: Phase;            // 1 = 已实现；2/3 = 首页灰显占位，无独立页面（目前没有，机制保留）
  icon: string;            // 内联 SVG 的 path 内容（24x24 viewBox）
  accept: string;          // <input type=file accept>
  multiple: boolean;       // 是否允许多文件
  minFiles?: number;
  button: string;          // 主按钮文案，如 "Merge PDF"
  steps: string[];
  faq: { q: string; a: string }[];
  related: string[];       // 相关工具 slug
}

// 分类名在字典的 ui.categories 里
export const CATEGORIES: Record<Category, { tint: string; ink: string }> = {
  edit:     { tint: '#fbeae6', ink: '#c8412f' },
  convert:  { tint: '#e6eef6', ink: '#2f5c8a' },
  optimize: { tint: '#e8f1e9', ink: '#1f7a4d' },
  security: { tint: '#f0ebf7', ink: '#5b3e8f' },
};

const ICONS = {
  merge: '<path d="M8 3h5l5 5v13H8z"/><path d="M13 3v5h5"/><path d="M4 9v12h10"/>',
  split: '<path d="M4 4h6v16H4z"/><path d="M14 4h6v16h-6z"/><path d="M12 8v8"/>',
  rotate: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
  organize: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/>',
  pageNumbers: '<path d="M6 3h12v18H6z"/><path d="M10 17h4"/>',
  watermark: '<path d="M6 3h12v18H6z"/><path d="M8 15l8-8"/>',
  compress: '<path d="M4 14l4-4 4 4 4-4 4 4"/><path d="M4 20h16"/><path d="M12 4v10"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/>',
  pdfToImage: '<path d="M8 3h5l5 5v13H8z"/><path d="M13 3v5h5"/><path d="M4 15l3 3 3-3"/><path d="M7 18V9"/>',
  word: '<path d="M6 3h12v18H6z"/><path d="M9 9l1.5 6 1.5-4 1.5 4L15 9"/>',
  pdfToWord: '<path d="M8 3h5l5 5v13H8z"/><path d="M13 3v5h5"/><path d="M10.5 12l1 5 1.5-3.5 1.5 3.5 1-5"/>',
  ocr: '<path d="M4 8V4h4"/><path d="M20 8V4h-4"/><path d="M4 16v4h4"/><path d="M20 16v4h-4"/><path d="M8 12h8"/>',
  sign: '<path d="M4 18c4-6 6-8 8-8s2 6 4 6 3-4 4-4"/><path d="M4 21h16"/>',
  crop: '<path d="M6 2v16h16"/><path d="M2 6h16v16"/>',
  deletePages: '<path d="M6 3h12v18H6z"/><path d="M9.5 9.5l5 5"/><path d="M14.5 9.5l-5 5"/>',
  extractPages: '<path d="M8 3h5l5 5v13H8z"/><path d="M13 3v5h5"/><path d="M4 12h7"/><path d="M8 9l3 3-3 3"/>',
  edit: '<path d="M11 4H4v16h16v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  fill: '<path d="M6 3h12v18H6z"/><path d="M9 8.5l1.5 1.5L13 7.5"/><path d="M15 9h2"/><path d="M9 14h8"/><path d="M9 17h5"/>',
  pngToPdf: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15l4-4 3 3 4-4 7 7"/><path d="M8 8h.01"/>',
  pdfToPng: '<path d="M8 3h5l5 5v13H8z"/><path d="M13 3v5h5"/><rect x="3" y="13" width="8" height="6" rx="1"/>',
  text: '<path d="M8 3h5l5 5v13H8z"/><path d="M13 3v5h5"/><path d="M11 12h5"/><path d="M11 15h5"/><path d="M11 18h3"/>',
  repair: '<path d="M14.7 6.3a4.6 4.6 0 0 1 6-.6l-3.2 3.2 1.6 1.6L22.3 7a4.6 4.6 0 0 1-6.3 5.9L8 21a2 2 0 0 1-3-3l8.1-8a4.6 4.6 0 0 1 1.6-3.7z"/>',
};

type ToolDef = Pick<ToolMeta, 'slug' | 'category' | 'phase' | 'icon' | 'accept' | 'multiple' | 'minFiles' | 'related'>;
const PDF = '.pdf,application/pdf';
const DOCX = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
// 占位工具（首页灰显、没有页面）这样写：{ slug, category, icon, ...SOON }，名字放在字典的 soon 里
export const SOON = { phase: 2 as Phase, accept: '', multiple: false, related: [] };

const DEFS: ToolDef[] = [
  // ---------- Organize & edit（一期） ----------
  { slug: 'merge-pdf', category: 'edit', phase: 1, icon: ICONS.merge, accept: PDF, multiple: true, minFiles: 2, related: ['split-pdf', 'organize-pdf', 'compress-pdf', 'jpg-to-pdf'] },
  { slug: 'split-pdf', category: 'edit', phase: 1, icon: ICONS.split, accept: PDF, multiple: false, related: ['merge-pdf', 'organize-pdf', 'rotate-pdf', 'pdf-to-jpg'] },
  { slug: 'rotate-pdf', category: 'edit', phase: 1, icon: ICONS.rotate, accept: PDF, multiple: false, related: ['organize-pdf', 'split-pdf', 'merge-pdf', 'compress-pdf'] },
  { slug: 'organize-pdf', category: 'edit', phase: 1, icon: ICONS.organize, accept: PDF, multiple: false, related: ['split-pdf', 'rotate-pdf', 'merge-pdf', 'add-page-numbers'] },
  { slug: 'add-page-numbers', category: 'edit', phase: 1, icon: ICONS.pageNumbers, accept: PDF, multiple: false, related: ['add-watermark', 'organize-pdf', 'merge-pdf', 'rotate-pdf'] },
  { slug: 'add-watermark', category: 'edit', phase: 1, icon: ICONS.watermark, accept: PDF, multiple: false, related: ['add-page-numbers', 'merge-pdf', 'compress-pdf', 'unlock-pdf'] },
  { slug: 'crop-pdf', category: 'edit', phase: 1, icon: ICONS.crop, accept: PDF, multiple: false, related: ['organize-pdf', 'rotate-pdf', 'edit-pdf', 'split-pdf'] },
  { slug: 'delete-pages', category: 'edit', phase: 1, icon: ICONS.deletePages, accept: PDF, multiple: false, related: ['extract-pages', 'organize-pdf', 'split-pdf', 'merge-pdf'] },
  { slug: 'extract-pages', category: 'edit', phase: 1, icon: ICONS.extractPages, accept: PDF, multiple: false, related: ['delete-pages', 'split-pdf', 'merge-pdf', 'organize-pdf'] },
  { slug: 'edit-pdf', category: 'edit', phase: 1, icon: ICONS.edit, accept: PDF, multiple: false, related: ['sign-pdf', 'fill-pdf', 'add-watermark', 'organize-pdf'] },
  { slug: 'fill-pdf', category: 'edit', phase: 1, icon: ICONS.fill, accept: PDF, multiple: false, related: ['sign-pdf', 'edit-pdf', 'protect-pdf', 'pdf-to-word'] },
  // ---------- Convert ----------
  { slug: 'jpg-to-pdf', category: 'convert', phase: 1, icon: ICONS.image, accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp', multiple: true, minFiles: 1, related: ['pdf-to-jpg', 'ocr-pdf', 'merge-pdf', 'compress-pdf'] },
  { slug: 'pdf-to-jpg', category: 'convert', phase: 1, icon: ICONS.pdfToImage, accept: PDF, multiple: false, related: ['jpg-to-pdf', 'split-pdf', 'compress-pdf', 'rotate-pdf'] },
  { slug: 'pdf-to-word', category: 'convert', phase: 1, icon: ICONS.pdfToWord, accept: PDF, multiple: false, related: ['word-to-pdf', 'ocr-pdf', 'pdf-to-jpg', 'compress-pdf'] },
  { slug: 'word-to-pdf', category: 'convert', phase: 1, icon: ICONS.word, accept: DOCX, multiple: false, related: ['pdf-to-word', 'merge-pdf', 'compress-pdf', 'protect-pdf'] },
  { slug: 'png-to-pdf', category: 'convert', phase: 1, icon: ICONS.pngToPdf, accept: 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp', multiple: true, minFiles: 1, related: ['pdf-to-png', 'jpg-to-pdf', 'merge-pdf', 'compress-pdf'] },
  { slug: 'pdf-to-png', category: 'convert', phase: 1, icon: ICONS.pdfToPng, accept: PDF, multiple: false, related: ['png-to-pdf', 'pdf-to-jpg', 'split-pdf', 'pdf-to-text'] },
  { slug: 'pdf-to-text', category: 'convert', phase: 1, icon: ICONS.text, accept: PDF, multiple: false, related: ['pdf-to-word', 'ocr-pdf', 'pdf-to-jpg', 'split-pdf'] },
  // ---------- Optimize ----------
  { slug: 'compress-pdf', category: 'optimize', phase: 1, icon: ICONS.compress, accept: PDF, multiple: false, related: ['merge-pdf', 'pdf-to-jpg', 'split-pdf', 'organize-pdf'] },
  { slug: 'ocr-pdf', category: 'optimize', phase: 1, icon: ICONS.ocr, accept: PDF, multiple: false, related: ['pdf-to-word', 'pdf-to-text', 'jpg-to-pdf', 'compress-pdf'] },
  { slug: 'repair-pdf', category: 'optimize', phase: 1, icon: ICONS.repair, accept: PDF, multiple: false, related: ['compress-pdf', 'unlock-pdf', 'organize-pdf', 'merge-pdf'] },
  // ---------- Security ----------
  { slug: 'unlock-pdf', category: 'security', phase: 1, icon: ICONS.unlock, accept: PDF, multiple: false, related: ['protect-pdf', 'sign-pdf', 'merge-pdf', 'compress-pdf'] },
  { slug: 'protect-pdf', category: 'security', phase: 1, icon: ICONS.lock, accept: PDF, multiple: false, related: ['unlock-pdf', 'sign-pdf', 'add-watermark', 'compress-pdf'] },
  { slug: 'sign-pdf', category: 'security', phase: 1, icon: ICONS.sign, accept: PDF, multiple: false, related: ['protect-pdf', 'add-watermark', 'merge-pdf', 'compress-pdf'] },
];

/** 某个语言下的完整工具列表（元数据 + 文案） */
export function getTools(locale: Locale): ToolMeta[] {
  const d = getDict(locale);
  return DEFS.map((def) => {
    const text = (d.tools as Record<string, Omit<ToolMeta, keyof ToolDef>>)[def.slug];
    if (text) return { ...def, ...text };
    const name = (d.soon as Record<string, string>)[def.slug];
    if (!name) throw new Error(`No ${locale} text for tool "${def.slug}"`);
    return { ...def, name, short: d.ui.tool.comingSoon, description: '', button: '', steps: [], faq: [] };
  });
}

export const LIVE_SLUGS = DEFS.filter((t) => t.phase === 1).map((t) => t.slug);
export const toolIcon = (slug: string) => DEFS.find((t) => t.slug === slug)?.icon;
export const liveTools = (locale: Locale) => getTools(locale).filter((t) => t.phase === 1);
export const toolBySlug = (slug: string, locale: Locale) => getTools(locale).find((t) => t.slug === slug);
export const toolsByCategory = (c: Category, locale: Locale) => getTools(locale).filter((t) => t.category === c);
