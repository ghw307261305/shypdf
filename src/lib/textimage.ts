// 用浏览器 canvas 把任意文字（含中文）渲染成 PNG，再嵌入 PDF。
// 这样不用打包 CJK 字体文件（pdf-lib 内置字体只有拉丁字符）。

export interface TextImage { png: Uint8Array; width: number; height: number; }

export async function renderTextToPng(text: string, opts: {
  fontSizePx: number; color: string; fontFamily?: string; bold?: boolean; scale?: number;
}): Promise<TextImage> {
  const scale = opts.scale ?? 2;
  const font = `${opts.bold ? '700' : '400'} ${opts.fontSizePx * scale}px ${opts.fontFamily ?? '"Inter Variable",system-ui,"PingFang SC","Microsoft YaHei","Hiragino Sans GB",sans-serif'}`;
  try { await document.fonts.load(font, text); } catch { /* 字体没加载到就用系统字体 */ }
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  const m = measure.measureText(text);
  const ascent = m.actualBoundingBoxAscent || opts.fontSizePx * scale * 0.8;
  const descent = m.actualBoundingBoxDescent || opts.fontSizePx * scale * 0.25;
  const w = Math.ceil(m.width) + 4;
  const h = Math.ceil(ascent + descent) + 4;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  ctx.fillStyle = opts.color;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, 2, ascent + 2);
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
  return { png: new Uint8Array(await blob.arrayBuffer()), width: w / scale, height: h / scale };
}
