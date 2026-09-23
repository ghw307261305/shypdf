// 站点级配置：改这一处即可。标语、简介等文案在 src/i18n/locales/*.ts 的 site 里；语言列表在 src/i18n/config.ts。
export const SITE = {
  name: 'ShyPDF',
  url: 'https://shypdf.com',  // 用于 canonical / sitemap
  // 免费版限制（前端提示用；真正的限制由浏览器内存决定）
  limits: { maxFileMB: 50, maxFiles: 20 },
  // 广告开关：审核通过后改为 true，并在 components/AdSlot.astro 里贴代码
  ads: false,
  contactEmail: 'hello@shypdf.com', // TODO: 上线前确认这个邮箱能收信（Cloudflare Email Routing 可免费转发）
  // 隐私政策 / 使用条款的「Last updated」。ISO 日期：页面上由 formatDate 显示成 “September 19, 2026”，
  // sitemap.xml 直接拿它当这几页的 <lastmod>。
  legalUpdated: '2026-09-19',
  // 工具页 / 首页 / 关于页的正文最后一次实质改动（sitemap.xml 的 <lastmod>）。
  // 只在改了文案、加了工具、换了译文时才动它 —— 每次构建都刷新的 lastmod 会被搜索引擎忽略。
  contentUpdated: '2026-09-20',
  // 个别页面比 contentUpdated 更晚改过时单独记在这里（key 是不带语言前缀的路径），免得把没动的页面也标成刚改过。
  // 下次整体更新 contentUpdated 时，把早于它的条目删掉。
  contentUpdatedOverrides: { '/': '2026-09-21', '/about/': '2026-09-21', '/licenses/': '2026-09-21' } as Record<string, string>,
  // 源码仓库（页脚、About、开源许可页的链接，以及首页结构化数据的 sameAs）。
  // live 是总开关：仓库如果改回 private，要先把它关掉 —— 私有仓库的链接对访客是 404。
  repo: { url: 'https://github.com/ghw307261305/shypdf', license: 'AGPL-3.0', live: true },
  // 姐妹站互链（页脚 About 栏）。站点下线时把 live 改回 false
  sibling: { name: 'ShyPic', url: 'https://shypic.com', live: true },
};

// '2026-09-19' → 'September 19, 2026'。法律页只有英文版，固定用 en-US；
// 按 UTC 解析和格式化，免得本地时区把日期推前一天。
export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
