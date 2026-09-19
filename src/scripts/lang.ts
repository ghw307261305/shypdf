// 语言相关的小交互（每个页面都加载）：
// 1. 记住用户在语言菜单里的选择；
// 2. 浏览器首选语言有对应译文、且用户没选过语言时，在页面顶部提示「用 xx 语言查看」—— 只提示，不自动跳转（自动跳转对 SEO 和分享链接都不友好）；
// 3. 点菜单外面 / 按 Esc 收起语言菜单。
const KEY = 'lang';
const current = document.documentElement.dataset.locale || 'en';
const menu = document.querySelector<HTMLDetailsElement>('.lang-menu');
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[data-locale]'));

const store = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* 隐私模式下写不了，忽略 */ } },
};

for (const a of links) a.addEventListener('click', () => store.set(a.dataset.locale!));

if (!store.get()) {
  const supported = new Map(links.filter((a) => a.dataset.suggest).map((a) => [a.dataset.locale!, a]));
  // navigator.languages 形如 ['pt-BR', 'en-US']：取第一个我们支持的主语言。
  // 中文要看变体：繁体（zh-TW / zh-HK / zh-MO / zh-Hant*）→ zh-tw，其余中文 → zh
  const toLocale = (tag: string) => {
    const t = tag.toLowerCase();
    if (t.startsWith('zh')) return /^zh-(tw|hk|mo|hant)/.test(t) ? 'zh-tw' : 'zh';
    return t.split('-')[0];
  };
  const preferred = (navigator.languages ?? [navigator.language]).map(toLocale).find((l) => supported.has(l));
  const target = preferred && preferred !== current ? supported.get(preferred) : undefined;
  const bar = document.getElementById('lang-suggest');
  if (target && bar) {
    const link = bar.querySelector('a')!;
    link.href = target.href;
    link.lang = target.lang;
    link.textContent = target.dataset.suggest!;
    link.addEventListener('click', () => store.set(preferred!));
    bar.querySelector('button')!.addEventListener('click', () => { store.set(current); bar.classList.add('is-hidden'); });
    bar.classList.remove('is-hidden');
  }
}

if (menu) {
  document.addEventListener('click', (e) => { if (menu.open && !menu.contains(e.target as Node)) menu.open = false; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.open = false; });
}
