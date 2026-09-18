// 工具注册表：新增一个工具 = 在这里加一条 + 在 src/tools/ 下写一个模块。
// slug 即 URL（/merge-pdf/），也是 src/tools/<slug>.ts 的文件名。

export type Category = 'edit' | 'convert' | 'optimize' | 'security';
export type Phase = 1 | 2 | 3;

export interface ToolMeta {
  slug: string;
  name: string;            // 页面 H1 / 卡片标题
  short: string;           // 卡片一句话
  description: string;     // 页面副标题，也用于 <meta description>
  category: Category;
  phase: Phase;            // 1 = 已实现；2/3 = 首页灰显占位，无独立页面
  icon: string;            // 内联 SVG 的 path 内容（24x24 viewBox）
  accept: string;          // <input type=file accept>
  multiple: boolean;       // 是否允许多文件
  minFiles?: number;
  button: string;          // 主按钮文案，如 "Merge PDF"
  steps: [string, string, string];
  faq: { q: string; a: string }[];
  related: string[];       // 相关工具 slug
}

export const CATEGORIES: Record<Category, { name: string; note: string; tint: string; ink: string }> = {
  edit:     { name: 'Organize & edit', note: '', tint: '#fbeae6', ink: '#c8412f' },
  convert:  { name: 'Convert',         note: '', tint: '#e6eef6', ink: '#2f5c8a' },
  optimize: { name: 'Optimize',        note: '', tint: '#e8f1e9', ink: '#1f7a4d' },
  security: { name: 'Security',        note: '', tint: '#f0ebf7', ink: '#5b3e8f' },
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
  ocr: '<path d="M4 8V4h4"/><path d="M20 8V4h-4"/><path d="M4 16v4h4"/><path d="M20 16v4h-4"/><path d="M8 12h8"/>',
  sign: '<path d="M4 18c4-6 6-8 8-8s2 6 4 6 3-4 4-4"/><path d="M4 21h16"/>',
};

const PRIVACY_FAQ = {
  q: 'Are my files uploaded to a server?',
  a: 'No. Everything runs inside your browser, so your files never leave your device. Close the tab and nothing is left behind.',
};
const LOCAL = 'Runs in your browser — your files are never uploaded.';
const SOON = { short: 'Coming soon', description: '', accept: '', multiple: false, button: '', steps: ['', '', ''] as [string, string, string], faq: [], related: [] };

export const TOOLS: ToolMeta[] = [
  // ---------- Organize & edit（一期） ----------
  {
    slug: 'merge-pdf', name: 'Merge PDF', short: 'Combine PDFs in any order',
    description: `Combine several PDFs into one file, in the order you choose. ${LOCAL}`,
    category: 'edit', phase: 1, icon: ICONS.merge, accept: '.pdf,application/pdf', multiple: true, minFiles: 2,
    button: 'Merge PDF',
    steps: ['Click the button or drop your PDFs in. You can pick several at once.', 'Drag the cards into order and remove any file you don’t need with ×.', 'Click “Merge PDF”. Your file downloads a second or two later.'],
    faq: [PRIVACY_FAQ,
      { q: 'Can I merge password-protected PDFs?', a: 'Files that need a password to open must go through Unlock PDF first. Files that only restrict printing or copying can be merged as they are.' },
      { q: 'Are bookmarks kept?', a: 'ShyPDF adds one top-level bookmark per source file so you can jump between them. Bookmarks inside the original files are not carried over yet.' },
      { q: 'Is there a limit on file count or size?', a: 'Up to 20 files and 50 MB per file. The real ceiling is your device’s memory.' }],
    related: ['split-pdf', 'organize-pdf', 'compress-pdf', 'jpg-to-pdf'],
  },
  {
    slug: 'split-pdf', name: 'Split PDF', short: 'Pull out pages or ranges',
    description: `Extract the pages you need by range, or split every page into its own file. ${LOCAL}`,
    category: 'edit', phase: 1, icon: ICONS.split, accept: '.pdf,application/pdf', multiple: false,
    button: 'Split PDF',
    steps: ['Choose a PDF.', 'Type the page ranges, e.g. 1-3, 5, 8-10 — or pick “One file per page”.', 'Click “Split PDF”. Multiple files download together as a zip.'],
    faq: [PRIVACY_FAQ,
      { q: 'How do I write page ranges?', a: 'Separate parts with commas and use a hyphen for a span: 1-3, 5, 8-10. Each comma-separated part becomes its own file.' },
      { q: 'Can I extract only odd or even pages?', a: 'Yes. Choose “Odd pages only” or “Even pages only” in the options.' }],
    related: ['merge-pdf', 'organize-pdf', 'rotate-pdf', 'pdf-to-jpg'],
  },
  {
    slug: 'rotate-pdf', name: 'Rotate PDF', short: 'Turn pages 90° or 180°',
    description: `Rotate a whole PDF, or just the pages you pick, by 90°, 180° or 270°. ${LOCAL}`,
    category: 'edit', phase: 1, icon: ICONS.rotate, accept: '.pdf,application/pdf', multiple: false,
    button: 'Rotate PDF',
    steps: ['Choose a PDF.', 'Pick the angle and whether it applies to all pages or selected ones.', 'Click “Rotate PDF” and download the result.'],
    faq: [PRIVACY_FAQ,
      { q: 'Does rotating reduce quality?', a: 'No. Rotation only changes each page’s orientation flag; the content is not re-compressed.' }],
    related: ['organize-pdf', 'split-pdf', 'merge-pdf', 'compress-pdf'],
  },
  {
    slug: 'organize-pdf', name: 'Organize PDF', short: 'Reorder, rotate, delete pages',
    description: `Preview every page, drag thumbnails into a new order, and delete the pages you don’t need. ${LOCAL}`,
    category: 'edit', phase: 1, icon: ICONS.organize, accept: '.pdf,application/pdf', multiple: false,
    button: 'Save PDF',
    steps: ['Choose a PDF. Its pages appear as thumbnails.', 'Drag thumbnails to reorder them; click × to delete a page.', 'Click “Save PDF” and download the result.'],
    faq: [PRIVACY_FAQ,
      { q: 'Thumbnails load slowly on a long document. Is that normal?', a: 'Thumbnails are rendered on demand. Files with hundreds of pages work fine; the first render just takes a few seconds.' }],
    related: ['split-pdf', 'rotate-pdf', 'merge-pdf', 'add-page-numbers'],
  },
  {
    slug: 'add-page-numbers', name: 'Add page numbers', short: 'Position, start, format',
    description: `Number the pages of a PDF. Choose the position, the first number and the format. ${LOCAL}`,
    category: 'edit', phase: 1, icon: ICONS.pageNumbers, accept: '.pdf,application/pdf', multiple: false,
    button: 'Add page numbers',
    steps: ['Choose a PDF.', 'Pick a position (bottom center, bottom right…), the first number and a format.', 'Click “Add page numbers” and download the result.'],
    faq: [PRIVACY_FAQ,
      { q: 'Can numbering start on page 3?', a: 'Yes. Set “Start on page” and “First number” in the options — handy for skipping a cover and a table of contents.' },
      { q: 'Which formats are available?', a: '1, 1 / 10, - 1 -, Page 1, plus Chinese formats such as 第 1 页.' }],
    related: ['add-watermark', 'organize-pdf', 'merge-pdf', 'rotate-pdf'],
  },
  {
    slug: 'add-watermark', name: 'Add watermark', short: 'Text stamp, any angle',
    description: `Stamp a text watermark on every page. Adjust opacity, angle, size and layout. ${LOCAL}`,
    category: 'edit', phase: 1, icon: ICONS.watermark, accept: '.pdf,application/pdf', multiple: false,
    button: 'Add watermark',
    steps: ['Choose a PDF.', 'Type the watermark text, then adjust opacity, angle and size.', 'Click “Add watermark” and download the result.'],
    faq: [PRIVACY_FAQ,
      { q: 'Does it work with non-Latin text?', a: 'Yes. The text is drawn with the fonts on your device, so any script your system can display — Chinese, Arabic, Cyrillic, emoji — will work.' },
      { q: 'Can the watermark be removed?', a: 'It is drawn into the page content, so ordinary PDF readers can’t simply delete it. It is a deterrent, though, not an anti-forgery measure.' }],
    related: ['add-page-numbers', 'merge-pdf', 'compress-pdf', 'unlock-pdf'],
  },
  // ---------- Convert ----------
  {
    slug: 'jpg-to-pdf', name: 'JPG to PDF', short: 'Images into one PDF',
    description: `Turn JPG, PNG and WebP images into a single PDF, one image per page, with your choice of page size and orientation. ${LOCAL}`,
    category: 'convert', phase: 1, icon: ICONS.image, accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp', multiple: true, minFiles: 1,
    button: 'Convert to PDF',
    steps: ['Choose one or more images.', 'Drag the cards into order and pick a page size (same as image, A4 or Letter).', 'Click “Convert to PDF” and download the result.'],
    faq: [PRIVACY_FAQ,
      { q: 'Which image formats are supported?', a: 'JPG, PNG and WebP. Convert HEIC photos to JPG first.' },
      { q: 'Are my images compressed?', a: 'By default they are embedded at original quality. Tick “Compress images” to shrink the PDF.' }],
    related: ['pdf-to-jpg', 'merge-pdf', 'compress-pdf', 'organize-pdf'],
  },
  {
    slug: 'pdf-to-jpg', name: 'PDF to JPG', short: 'Save pages as images',
    description: `Export each page of a PDF as a JPG or PNG image at the resolution you choose. ${LOCAL}`,
    category: 'convert', phase: 1, icon: ICONS.pdfToImage, accept: '.pdf,application/pdf', multiple: false,
    button: 'Convert to images',
    steps: ['Choose a PDF.', 'Pick the output format (JPG or PNG) and the resolution.', 'Click “Convert to images”. Multiple pages download together as a zip.'],
    faq: [PRIVACY_FAQ,
      { q: 'Which resolution should I pick?', a: 'Standard (150 dpi) is right for screens. High (300 dpi) is better for print but makes larger files and takes longer.' }],
    related: ['jpg-to-pdf', 'split-pdf', 'compress-pdf', 'rotate-pdf'],
  },
  { slug: 'pdf-to-word', name: 'PDF to Word', category: 'convert', phase: 2, icon: ICONS.word, ...SOON },
  { slug: 'word-to-pdf', name: 'Word to PDF', category: 'convert', phase: 2, icon: ICONS.word, ...SOON },
  // ---------- Optimize ----------
  {
    slug: 'compress-pdf', name: 'Compress PDF', short: 'Smaller files for email',
    description: `Make a PDF smaller. Light mode keeps text selectable and searchable; Strong mode turns pages into images for the smallest file. ${LOCAL}`,
    category: 'optimize', phase: 1, icon: ICONS.compress, accept: '.pdf,application/pdf', multiple: false,
    button: 'Compress PDF',
    steps: ['Choose a PDF.', 'Pick a mode: Light (keeps text) or Strong (pages become images).', 'Click “Compress PDF”, then compare the before and after sizes.'],
    faq: [PRIVACY_FAQ,
      { q: 'What is the difference between Light and Strong?', a: 'Light rebuilds the file structure and drops redundant data. Text stays selectable and searchable, and files usually shrink by 5–30%. Strong renders each page as an image, which can cut size by 50% or more, but text is no longer selectable. Strong works best on scanned documents.' },
      { q: 'Why did my file barely shrink?', a: 'It was probably optimized already, or most of its size comes from embedded fonts. Light mode can’t do much in that case — try Strong.' }],
    related: ['merge-pdf', 'pdf-to-jpg', 'split-pdf', 'organize-pdf'],
  },
  { slug: 'ocr-pdf', name: 'OCR PDF', category: 'optimize', phase: 2, icon: ICONS.ocr, ...SOON },
  // ---------- Security ----------
  {
    slug: 'unlock-pdf', name: 'Unlock PDF', short: 'Remove PDF restrictions',
    description: `Remove the password or the printing, copying and editing restrictions from a PDF you own or are authorized to edit. ${LOCAL}`,
    category: 'security', phase: 1, icon: ICONS.unlock, accept: '.pdf,application/pdf', multiple: false,
    button: 'Unlock PDF',
    steps: ['Choose a protected PDF that you own or have permission to edit.', 'If the file needs a password to open, enter it.', 'Confirm you have the right to unlock it, click “Unlock PDF”, and download an unprotected copy.'],
    faq: [PRIVACY_FAQ,
      { q: 'Can it remove a password I don’t know?', a: 'No. ShyPDF does not crack or guess passwords. If a file needs a password to open, you have to enter it; you then get a copy that no longer asks for it.' },
      { q: 'Is it legal to unlock a PDF?', a: 'That depends on the file, not the tool. Unlocking your own documents, or documents whose owner has given you permission, is generally fine. Removing protection from someone else’s copyrighted work without permission may be unlawful where you live. Only use this tool on files you have the right to modify; you are responsible for how you use it.' }],
    related: ['protect-pdf', 'merge-pdf', 'compress-pdf', 'add-watermark'],
  },
  {
    slug: 'protect-pdf', name: 'Protect PDF', short: 'Password & permissions',
    description: `Add an open password to a PDF, or restrict printing, copying and editing, using AES-256 encryption. ${LOCAL}`,
    category: 'security', phase: 1, icon: ICONS.lock, accept: '.pdf,application/pdf', multiple: false,
    button: 'Protect PDF',
    steps: ['Choose a PDF.', 'Enter an open password and tick the actions you want to restrict.', 'Click “Protect PDF” and download the encrypted copy.'],
    faq: [PRIVACY_FAQ,
      { q: 'What encryption is used?', a: 'AES-256, as defined by the PDF 2.0 standard. All mainstream PDF readers support it.' },
      { q: 'What if I forget the password?', a: 'There is no way to recover it. Keep it somewhere safe, such as a password manager.' }],
    related: ['unlock-pdf', 'add-watermark', 'merge-pdf', 'compress-pdf'],
  },
  { slug: 'sign-pdf', name: 'Sign PDF', category: 'security', phase: 2, icon: ICONS.sign, ...SOON },
];

export const liveTools = () => TOOLS.filter((t) => t.phase === 1);
export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);
export const toolsByCategory = (c: Category) => TOOLS.filter((t) => t.category === c);
