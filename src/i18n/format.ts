// 服务端和客户端共用：把 "Up to {mb} MB" 里的 {占位符} 换成值。
export function fmt(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
