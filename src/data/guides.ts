// 指南文章注册表。新增一篇 = 这里加一条 + src/pages/guides/<slug>.astro。
// tools：在哪些工具页底部显示这篇指南的链接（内链）。

export interface GuideMeta {
  slug: string;
  title: string;          // H1 和 <title>
  description: string;    // meta description + 列表页摘要
  published: string;      // ISO 日期
  updated?: string;
  tools: string[];
}

export const GUIDES: GuideMeta[] = [
  {
    slug: 'check-if-pdf-tool-uploads-files',
    title: 'How to check whether an online PDF tool uploads your files',
    description: 'Verify a “no upload” claim yourself: a 30-second test in your browser’s developer tools, what that test cannot tell you, and the response header that rules out third parties for good.',
    published: '2026-09-19',
    tools: ['merge-pdf', 'compress-pdf', 'protect-pdf', 'unlock-pdf', 'jpg-to-pdf'],
  },
  {
    slug: 'compress-pdf-for-email',
    title: 'How to make a PDF small enough to email',
    description: 'Attachment limits for Gmail, Outlook and company mail servers, why some PDFs are huge, and how to shrink one without uploading it anywhere.',
    published: '2026-09-19',
    tools: ['compress-pdf', 'split-pdf', 'pdf-to-jpg'],
  },
  {
    slug: 'merge-pdf-without-uploading',
    title: 'How to merge PDFs without uploading them',
    description: 'Every way to combine PDF files while keeping them on your own device: in the browser, with the tools built into Mac and iPhone, and what to do on Windows and Chromebooks.',
    published: '2026-09-19',
    tools: ['merge-pdf', 'organize-pdf', 'split-pdf'],
  },
  {
    slug: 'remove-password-from-pdf-statement',
    title: 'How to remove the password from a PDF statement you own',
    description: 'Bank and payroll PDFs that ask for a password every time are tedious to archive. Three ways to save an unprotected copy when you know the password — without sending the file to anyone.',
    published: '2026-09-19',
    tools: ['unlock-pdf', 'protect-pdf'],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
export const guidesForTool = (toolSlug: string) => GUIDES.filter((g) => g.tools.includes(toolSlug));
