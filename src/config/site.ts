// 站点级配置：改这一处即可。标语、简介等文案在 src/i18n/locales/*.ts 的 site 里；语言列表在 src/i18n/config.ts。
export const SITE = {
  name: 'ShyPDF',
  url: 'https://shypdf.com',  // 用于 canonical / sitemap
  // 免费版限制（前端提示用；真正的限制由浏览器内存决定）
  limits: { maxFileMB: 50, maxFiles: 20 },
  // 广告开关：审核通过后改为 true，并在 components/AdSlot.astro 里贴代码
  ads: false,
  contactEmail: 'hello@shypdf.com', // TODO: 上线前确认这个邮箱能收信（Cloudflare Email Routing 可免费转发）
  // 隐私政策 / 使用条款的「Last updated」
  legalUpdated: 'September 19, 2026',
};
