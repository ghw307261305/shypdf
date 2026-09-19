// PDF → 可编辑结构：把 pdf.js 给的「一堆带坐标的文字片段」还原成段落、表格和图片，供 lib/docx-write.ts 写成 Word。
// PDF 里没有「段落」这个概念，这里全是启发式：按基线聚成行 → 大间隙切成片段 → 识别双栏 → 识别表格 → 按行距 / 缩进 / 行尾留白切段落。
// 坐标一律用「看到的页面」：原点在左上，y 向下，单位 pt（已应用页面旋转和 CropBox）。
import type { PDFPageProxy } from 'pdfjs-dist';

export interface Style { family: string; bold: boolean; italic: boolean; size: number; }
export interface Run { text: string; style: Style; }
export type Align = 'left' | 'center' | 'right' | 'both';

export interface ParaBlock {
  type: 'para'; runs: Run[]; align: Align;
  /** 左缩进、首行缩进（负数 = 悬挂缩进），相对页边距，pt */
  indent: number; firstLine: number;
  /** 段前距 pt；行距（基线间距 / 字号），单行段落为 null */
  spaceBefore: number; leading: number | null;
  size: number; heading?: 1 | 2 | 3;
}
export interface TableBlock { type: 'table'; x0: number; widths: number[]; rows: { runs: Run[]; align: Align }[][]; spaceBefore: number; }
export interface ImageBlock { type: 'image'; index: number; width: number; height: number; align: Align; spaceBefore: number; }
export type Block = ParaBlock | TableBlock | ImageBlock;

export interface PageImage { x: number; y: number; width: number; height: number; index: number; }
export interface PageModel {
  width: number; height: number; blocks: Block[];
  /** 文字和图片的包围盒，用来推页边距；空白页为 null */
  bounds: { x0: number; y0: number; x1: number; y1: number } | null;
  chars: number;
}

interface Item { str: string; x: number; y: number; w: number; size: number; style: Style; }
interface Seg { x0: number; x1: number; items: Item[]; }
/** segs：按「制表位级」的大间隙切的片段，段落里用来还原制表符；fine：按略大于词间距的间隙切的片段，只用来找表格的列 */
interface Line { y: number; size: number; segs: Seg[]; fine: Seg[]; x0: number; x1: number; image?: PageImage; }

const CJK = /[\u3000-\u30ff\u3400-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/;
const LIST_MARK = /^(?:[•◦▪■□●○◆▶➤✓✔·\-–—*]|\(?\d{1,3}[.)]|\(?[a-zA-Z][.)]|[ivxIVX]{1,5}[.)])\s/;

/** "ABCDEF+TimesNewRomanPS-BoldItalicMT" → Word 里的字体名 + 粗斜体 */
export function fontStyle(name: string, generic: string, flags: { bold?: boolean; italic?: boolean } = {}): Omit<Style, 'size'> {
  const raw = name.replace(/^[A-Z]{6}\+/, '');
  const bold = !!flags.bold || /bold|black|heavy|semibold|demi(?![a-z])/i.test(raw);
  const italic = !!flags.italic || /italic|oblique/i.test(raw);
  const n = raw.toLowerCase().replace(/[^a-z]/g, '');
  const known: [RegExp, string][] = [
    [/calibri|carlito/, 'Calibri'], [/cambria|caladea/, 'Cambria'], [/arial|arimo|helvetica|liberationsans/, 'Arial'],
    [/timesnewroman|times|tinos|liberationserif|nimbusrom/, 'Times New Roman'], [/couriernew|courier|cousine|liberationmono/, 'Courier New'],
    [/georgia/, 'Georgia'], [/verdana/, 'Verdana'], [/tahoma/, 'Tahoma'], [/trebuchet/, 'Trebuchet MS'], [/garamond/, 'Garamond'],
    [/consolas/, 'Consolas'], [/segoeui/, 'Segoe UI'], [/palatino|bookantiqua/, 'Palatino Linotype'], [/centurygothic/, 'Century Gothic'],
    [/yugothic/, 'Yu Gothic'], [/yumin/, 'Yu Mincho'], [/msgothic/, 'MS Gothic'], [/msmincho/, 'MS Mincho'], [/meiryo/, 'Meiryo'],
    [/simsun/, 'SimSun'], [/simhei/, 'SimHei'], [/yahei/, 'Microsoft YaHei'], [/malgun/, 'Malgun Gothic'],
  ];
  const hit = known.find(([re]) => re.test(n));
  const family = hit ? hit[1] : generic === 'serif' ? 'Times New Roman' : generic === 'monospace' ? 'Courier New' : 'Arial';
  return { family, bold, italic };
}

const sameStyle = (a: Style, b: Style) => a.family === b.family && a.bold === b.bold && a.italic === b.italic && Math.abs(a.size - b.size) < 0.26;
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const roundHalf = (n: number) => Math.round(n * 2) / 2;

/** 一个片段里的文字，按样式合并成 run；片段之间缺空格时补上 */
function segRuns(items: Item[]): Run[] {
  const runs: Run[] = [];
  let prev: Item | null = null;
  for (const it of items) {
    let text = it.str;
    if (prev) {
      const gap = it.x - (prev.x + prev.w);
      const glued = /\s$/.test(prev.str) || /^\s/.test(text) || (CJK.test(prev.str.slice(-1)) && CJK.test(text[0] ?? ''));
      if (gap > 0.18 * it.size && !glued) text = ' ' + text;
    }
    const last = runs[runs.length - 1];
    if (last && sameStyle(last.style, it.style)) last.text += text; else runs.push({ text, style: it.style });
    prev = it;
  }
  return runs;
}
const runsText = (runs: Run[]) => runs.map((r) => r.text).join('');
const lineRuns = (l: Line) => l.segs.flatMap((s, i) => { const r = segRuns(s.items); if (i && r.length) r[0] = { ...r[0], text: '\t' + r[0].text }; return r; });

function appendRuns(target: Run[], more: Run[], joiner: string) {
  more = more.map((r) => ({ ...r }));
  if (joiner && more.length) more[0].text = joiner + more[0].text;
  for (const r of more) {
    const last = target[target.length - 1];
    if (last && sameStyle(last.style, r.style)) last.text += r.text; else target.push(r);
  }
}

// ---------- 1. 片段 → 行 ----------
function buildLines(items: Item[]): Line[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: Item[][] = [];
  for (const it of sorted) {
    const row = rows[rows.length - 1];
    // 上下标的基线会偏三分之一个字号左右，也算同一行
    if (row && Math.abs(it.y - row[0].y) <= 0.4 * Math.max(it.size, row[0].size)) row.push(it); else rows.push([it]);
  }
  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x);
    const size = Math.max(...row.filter((i) => i.str.trim()).map((i) => i.size), 0) || row[0].size;
    const cut = (maxGap: number) => {
      const segs: Seg[] = [];
      for (const it of row) {
        if (!it.str.trim() && !segs.length) continue;
        const seg = segs[segs.length - 1];
        if (seg && it.x - seg.x1 <= maxGap) { seg.items.push(it); if (it.str.trim()) seg.x1 = Math.max(seg.x1, it.x + it.w); }
        else if (it.str.trim()) segs.push({ x0: it.x, x1: it.x + it.w, items: [it] });
      }
      return segs;
    };
    const segs = cut(Math.max(1.8 * size, 14)), fine = cut(Math.max(0.7 * size, 5));
    // 基线取这一行里正文字号的那些片段（上标不算）
    const y = median(row.filter((i) => i.size >= size * 0.9).map((i) => i.y));
    return { y, size, segs, fine, x0: segs[0]?.x0 ?? 0, x1: segs[segs.length - 1]?.x1 ?? 0 };
  }).filter((l) => l.segs.length);
}

// ---------- 2. 双栏 ----------
/** 找一条把页面分成左右两栏的竖直空白带；没有则返回 null。两列的表格不算：分栏的左栏行大多会顶到空白带。 */
function findGutter(lines: Line[], pageWidth: number): number | null {
  if (lines.length < 16) return null;
  let best: { x: number; cross: number } | null = null;
  for (let x = pageWidth * 0.3; x <= pageWidth * 0.7; x += 3) {
    let cross = 0, left = 0, right = 0;
    const leftEnds: number[] = [];
    for (const l of lines) {
      if (l.segs.some((s) => s.x0 < x - 1 && s.x1 > x + 1)) { cross++; continue; }
      const ls = l.segs.filter((s) => s.x1 <= x), rs = l.segs.filter((s) => s.x0 >= x);
      if (ls.length) { left++; leftEnds.push(ls[ls.length - 1].x1); }
      if (rs.length) right++;
    }
    if (left < 8 || right < 8 || cross > lines.length * 0.15) continue;
    const colLeft = Math.min(...lines.map((l) => l.x0));
    if (median(leftEnds) - colLeft < (x - colLeft) * 0.72) continue;
    if (!best || cross < best.cross) best = { x, cross };
  }
  return best?.x ?? null;
}

function partLine(l: Line, segs: Seg[]): Line { const x0 = segs[0].x0, x1 = segs[segs.length - 1].x1; return { ...l, segs, fine: l.fine.filter((f) => f.x0 >= x0 - 1 && f.x1 <= x1 + 1), x0, x1 }; }

/** 按阅读顺序排好的若干「区域」：通栏区域，或者一段双栏里的左栏 / 右栏 */
function regions(lines: Line[], pageWidth: number): Line[][] {
  const gutter = findGutter(lines.filter((l) => !l.image), pageWidth);
  if (gutter == null) return [lines];
  const out: Line[][] = [];
  let full: Line[] = [], left: Line[] = [], right: Line[] = [];
  const flushCols = () => { if (left.length) out.push(left); if (right.length) out.push(right); left = []; right = []; };
  const flushFull = () => { if (full.length) out.push(full); full = []; };
  for (const l of lines) {
    if (l.segs.some((s) => s.x0 < gutter - 1 && s.x1 > gutter + 1)) { flushCols(); full.push(l); continue; }
    flushFull();
    const ls = l.segs.filter((s) => s.x1 <= gutter + 1), rs = l.segs.filter((s) => s.x0 >= gutter - 1);
    if (ls.length) left.push(partLine(l, ls));
    if (rs.length) right.push(partLine(l, rs));
  }
  flushCols(); flushFull();
  return out;
}

// ---------- 3. 表格 ----------
// 判据：连续几行里，有一条（或几条）竖直的空白带从头贯穿到尾。两端对齐的正文里偶尔也有很宽的词间距，但它们不会逐行对齐，
// 所以把各行片段的 x 区间并起来之后，正文只会剩下一列，表格才会剩下多列。
interface Col { x0: number; x1: number; }
function columnsOf(lines: Line[]): Col[] {
  const spans = lines.flatMap((l) => l.fine.map((s) => ({ x0: s.x0, x1: s.x1 }))).sort((a, b) => a.x0 - b.x0);
  const cols: Col[] = [];
  for (const s of spans) {
    const c = cols[cols.length - 1];
    if (c && s.x0 < c.x1 + 2) c.x1 = Math.max(c.x1, s.x1); else cols.push({ ...s });
  }
  return cols;
}
const colIndex = (cols: Col[], s: Seg) => cols.findIndex((c) => s.x0 >= c.x0 - 1 && s.x1 <= c.x1 + 1);
const colsUsed = (cols: Col[], l: Line) => new Set(l.fine.map((s) => colIndex(cols, s))).size;

function tryTable(lines: Line[], start: number): { block: TableBlock; next: number } | null {
  if (lines[start].fine.length < 2 || lines[start].image) return null;
  let end = start + 1;
  while (end < lines.length && !lines[end].image && lines[end].y - lines[end - 1].y < 3.2 * Math.max(lines[end].size, lines[end - 1].size)) end++;
  // 从可能的最长范围往回缩，直到剩下的行共享同一组列
  for (; end - start >= 2; end--) {
    const slice = lines.slice(start, end);
    const cols = columnsOf(slice);
    const multi = slice.filter((l) => colsUsed(cols, l) > 1).length;
    // 只有两行时证据太弱，要求是「制表位级」的大间隙
    if (cols.length < 2 || colsUsed(cols, slice[0]) < 2 || multi < 2 || (multi < 3 && slice.filter((l) => l.segs.length > 1).length < 2)) continue;
    // 「符号 + 文字」的两列其实是列表，不是表格
    if (cols.length === 2 && slice.every((l) => l.fine.filter((f) => colIndex(cols, f) === 0).every((f) => LIST_MARK.test(f.items.map((i) => i.str).join('').trim() + ' ')))) return null;
    // 末尾只占一列的行：紧贴上一行的是单元格里的折行，隔得远的多半是表格下面的正文
    const tail = slice[slice.length - 1];
    if (colsUsed(cols, tail) < 2 && tail.y - slice[slice.length - 2].y > 1.45 * tail.size) continue;

    // 列的对齐方式：右边缘比左边缘整齐 → 右对齐（金额、数量）
    const aligns: Align[] = cols.map((_, ci) => {
      const segs = slice.flatMap((l) => l.fine.filter((s) => colIndex(cols, s) === ci));
      if (segs.length < 2) return 'left';
      const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
      return spread(segs.map((s) => s.x1)) + 1 < spread(segs.map((s) => s.x0)) ? 'right' : 'left';
    });
    // 行：单元格里的文字会折行，这时表格里有两种行距 —— 小的是折行，大的才是新的一行
    const gaps = slice.slice(1).map((l, i) => l.y - slice[i].y);
    const tight = Math.min(...gaps), wraps = Math.max(...gaps) > tight * 1.25 + 0.5;
    const rows: TableBlock['rows'] = [];
    slice.forEach((l, li) => {
      const cells = cols.map((_, ci) => ({ runs: [] as Run[], align: aligns[ci] }));
      for (const s of l.fine) { const cell = cells[colIndex(cols, s)]; appendRuns(cell.runs, segRuns(s.items), cell.runs.length ? ' ' : ''); }
      const last = rows[rows.length - 1];
      const sameRow = last && (wraps ? gaps[li - 1] <= tight * 1.25 + 0.5 : !cells[0].runs.length && gaps[li - 1] < 1.4 * l.size);
      if (sameRow) cells.forEach((c, ci) => { if (c.runs.length) { const tail = runsText(last[ci].runs); appendRuns(last[ci].runs, c.runs, !tail || (CJK.test(tail.slice(-1)) && CJK.test(runsText(c.runs)[0] ?? '')) ? '' : ' '); } });
      else rows.push(cells);
    });
    // 列宽：相邻两列之间的空白对半分
    const edges = cols.map((c, i) => (i === 0 ? c.x0 : (cols[i - 1].x1 + c.x0) / 2));
    edges.push(cols[cols.length - 1].x1 + 4);
    return { block: { type: 'table', x0: cols[0].x0, widths: cols.map((_, i) => edges[i + 1] - edges[i]), rows, spaceBefore: 0 }, next: end };
  }
  return null;
}

// ---------- 4. 段落 ----------
function buildParagraphs(lines: Line[], box: { x0: number; x1: number }, pageMid: number): ParaBlock[] {
  const width = box.x1 - box.x0;
  // 正文行距：相邻行基线间距 / 字号 的众数
  const ratios = lines.slice(1).map((l, i) => (l.y - lines[i].y) / Math.max(l.size, lines[i].size)).filter((r) => r > 0.8 && r < 3);
  const body = ratios.length ? median(ratios) : 1.2;
  const firstWordWidth = (l: Line) => {
    const it = l.segs[0].items.find((i) => i.str.trim());
    if (!it) return 0;
    const word = it.str.trim().split(/\s+/)[0];
    return CJK.test(word) ? it.size : it.w * (word.length / Math.max(it.str.length, 1));
  };
  const isBold = (l: Line) => l.segs.every((s) => s.items.every((i) => !i.str.trim() || i.style.bold));

  const groups: Line[][] = [];
  for (const l of lines) {
    const g = groups[groups.length - 1];
    const prev = g?.[g.length - 1];
    let join = !!prev;
    if (prev) {
      const ratio = (l.y - prev.y) / Math.max(l.size, prev.size);
      const text = runsText(lineRuns(l)).trimStart();
      if (ratio > body * 1.28 + 0.05 || ratio < 0.5) join = false;                       // 段间距
      else if (Math.abs(l.size - prev.size) > 0.6) join = false;                           // 字号变了
      else if (isBold(l) !== isBold(prev)) join = false;                                   // 标题 ↔ 正文
      else if (LIST_MARK.test(text)) join = false;                                         // 列表项
      else if (prev.segs.length > 1 || l.segs.length > 1) join = false;                    // 带制表位的行各自成段
      else if (prev.x1 + firstWordWidth(l) + prev.size * 0.3 < box.x1 - width * 0.03 && !isCentered(prev, box, pageMid)) join = false; // 上一行没写满：段落结束
      else if (l.x0 > g[g.length - 1].x0 + l.size * 0.9 && g.length > 1 && Math.abs(g[g.length - 1].x0 - g[g.length - 2].x0) < 2) join = false; // 首行缩进开始了新段
    }
    if (join) g.push(l); else groups.push([l]);
  }

  return groups.map((g, gi) => {
    const runs: Run[] = [];
    g.forEach((l, i) => {
      const next = lineRuns(l);
      if (!i) { appendRuns(runs, next, ''); return; }
      const tail = runsText(runs), head = runsText(next);
      // 行尾连字符 + 小写开头：断词，接回去；CJK 行之间不加空格
      if (/[a-zà-ÿ]-$/i.test(tail) && /^[a-zà-ÿ]/.test(head)) { runs[runs.length - 1].text = runs[runs.length - 1].text.slice(0, -1); appendRuns(runs, next, ''); }
      else appendRuns(runs, next, CJK.test(tail.slice(-1)) && CJK.test(head[0] ?? '') ? '' : /\s$/.test(tail) ? '' : ' ');
    });
    const size = roundHalf(median(g.map((l) => l.size)));
    const rest = g.slice(1);
    const restX = rest.length ? Math.min(...rest.map((l) => l.x0)) : g[0].x0;
    let align: Align = 'left';
    if (g.every((l) => isCentered(l, box, pageMid))) align = 'center';
    else if (g.every((l) => Math.abs(l.x1 - box.x1) < 2.5 && l.x0 - box.x0 > width * 0.25)) align = 'right';
    else if (g.length > 2 && g.slice(0, -1).every((l) => Math.abs(l.x1 - box.x1) < 2.5)) align = 'both';
    const flush = align === 'center' || align === 'right';
    const prevLast = gi ? groups[gi - 1][groups[gi - 1].length - 1] : null;
    const gap = prevLast ? g[0].y - prevLast.y - body * Math.max(g[0].size, prevLast.size) : 0;
    const leadings = rest.map((l, i) => (l.y - g[i].y) / size);
    return {
      type: 'para', runs, align, size,
      indent: flush ? 0 : Math.max(0, restX - box.x0),
      firstLine: flush || !rest.length ? 0 : g[0].x0 - restX,
      spaceBefore: Math.max(0, Math.min(gap, 48)),
      leading: leadings.length ? median(leadings) : null,
    };
  });
}

function isCentered(l: Line, box: { x0: number; x1: number }, pageMid: number) {
  const mid = (l.x0 + l.x1) / 2, boxMid = (box.x0 + box.x1) / 2;
  const inset = Math.min(l.x0 - box.x0, box.x1 - l.x1);
  return inset > (box.x1 - box.x0) * 0.06 && (Math.abs(mid - boxMid) < 3 || Math.abs(mid - pageMid) < 3);
}

// ---------- 入口 ----------
export function analyzePage(items: Item[], images: PageImage[], width: number, height: number): PageModel {
  const textLines = buildLines(items);
  const chars = items.reduce((n, i) => n + i.str.replace(/\s/g, '').length, 0);
  // 铺满整页的图是扫描件的底图：有文字层时丢掉它，只要文字
  const kept = images.filter((im) => !(chars > 40 && im.width * im.height > width * height * 0.7));
  const imageLines: Line[] = kept.map((im) => { const seg = { x0: im.x, x1: im.x + im.width, items: [] }; return { y: im.y + im.height, size: 12, segs: [seg], fine: [seg], x0: im.x, x1: im.x + im.width, image: im }; });
  const lines = [...textLines, ...imageLines].sort((a, b) => a.y - b.y);
  if (!lines.length) return { width, height, blocks: [], bounds: null, chars };

  const bounds = {
    x0: Math.min(...lines.map((l) => l.x0)), x1: Math.max(...lines.map((l) => l.x1)),
    y0: Math.min(...lines.map((l) => (l.image ? l.image.y : l.y - l.size))), y1: Math.max(...lines.map((l) => l.y)),
  };
  const blocks: Block[] = [];
  for (const region of regions(lines, width)) {
    const box = { x0: Math.min(...region.map((l) => l.x0)), x1: Math.max(...region.map((l) => l.x1)) };
    let pending: Line[] = [];
    let lastY = region[0].image ? region[0].image.y : region[0].y - region[0].size;
    const flush = () => {
      if (!pending.length) return;
      const paras = buildParagraphs(pending, box, width / 2);
      for (const p of paras) { p.indent += box.x0 - bounds.x0; blocks.push(p); }
      pending = [];
    };
    for (let i = 0; i < region.length;) {
      const l = region[i];
      if (l.image) {
        flush();
        const im = l.image, mid = im.x + im.width / 2;
        const align: Align = Math.abs(mid - width / 2) < width * 0.08 ? 'center' : mid > width * 0.6 ? 'right' : 'left';
        blocks.push({ type: 'image', index: im.index, width: im.width, height: im.height, align, spaceBefore: Math.max(0, Math.min(im.y - lastY, 36)) });
        lastY = l.y; i++; continue;
      }
      const table = tryTable(region, i);
      if (table) {
        flush();
        table.block.spaceBefore = Math.max(0, Math.min(l.y - l.size - lastY, 36));
        table.block.x0 -= bounds.x0;
        blocks.push(table.block);
        lastY = region[table.next - 1].y; i = table.next; continue;
      }
      pending.push(l); lastY = l.y; i++;
    }
    flush();
  }
  return { width, height, blocks, bounds, chars };
}

/** 全文的正文字号 = 字符数最多的字号；明显更大的短段落标成标题（Word 的导航窗格能用上） */
export function markHeadings(pages: PageModel[]) {
  const weight = new Map<number, number>();
  const paras = pages.flatMap((p) => p.blocks).filter((b): b is ParaBlock => b.type === 'para');
  for (const p of paras) weight.set(p.size, (weight.get(p.size) ?? 0) + runsText(p.runs).length);
  const bodySize = [...weight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 11;
  const bigger = [...new Set(paras.filter((p) => p.size >= bodySize * 1.18 && runsText(p.runs).length < 160).map((p) => p.size))].sort((a, b) => b - a);
  for (const p of paras) {
    const rank = bigger.indexOf(p.size);
    if (rank >= 0 && runsText(p.runs).length < 160) p.heading = (Math.min(rank, 2) + 1) as 1 | 2 | 3;
  }
}

/** 读一页：文字片段 + 图片位置。images 只记位置，位图由调用方按 index 去取（浏览器里才有 canvas）。 */
export async function readPage(pdfjs: typeof import('pdfjs-dist'), page: PDFPageProxy, wantImages: boolean) {
  const viewport = page.getViewport({ scale: 1 });
  const ops = await page.getOperatorList(); // 同时把字体对象装进 commonObjs，下面取真实字体名要用
  const tc = await page.getTextContent();
  const styles = new Map<string, Omit<Style, 'size'>>();
  const styleOf = (fontName: string) => {
    let s = styles.get(fontName);
    if (!s) {
      let font: any = null;
      try { font = page.commonObjs.get(fontName); } catch { /* 字体没解析出来：按通用族处理 */ }
      s = fontStyle(font?.name ?? '', (tc.styles as any)[fontName]?.fontFamily ?? 'sans-serif', { bold: font?.bold, italic: font?.italic });
      styles.set(fontName, s);
    }
    return s;
  };
  const items: Item[] = [];
  for (const it of tc.items as any[]) {
    if (typeof it.str !== 'string' || !it.str) continue;
    const m = pdfjs.Util.transform(viewport.transform, it.transform);
    if (Math.abs(m[1]) > 0.3 * Math.abs(m[0]) || m[0] <= 0) continue; // 竖排、倒置、斜着的水印：不进正文
    const size = Math.hypot(m[2], m[3]);
    if (size < 2) continue;
    items.push({ str: it.str, x: m[4], y: m[5], w: it.width, size, style: { ...styleOf(it.fontName), size: roundHalf(size) } });
  }

  const images: (PageImage & { objId: string })[] = [];
  if (wantImages) {
    const { OPS } = pdfjs;
    let ctm = [1, 0, 0, 1, 0, 0];
    const stack: number[][] = [];
    ops.fnArray.forEach((fn, i) => {
      const args = ops.argsArray[i];
      if (fn === OPS.save) stack.push(ctm);
      else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
      else if (fn === OPS.transform) ctm = pdfjs.Util.transform(ctm, args as number[]);
      // Form XObject 自带一层 save / restore 和自己的矩阵
      else if (fn === OPS.paintFormXObjectBegin) { stack.push(ctm); if (Array.isArray(args?.[0])) ctm = pdfjs.Util.transform(ctm, args[0] as number[]); }
      else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() ?? ctm;
      else if (fn === OPS.paintImageXObject) {
        // 图片画在单位正方形里，CTM 决定它在页面上的位置和大小
        const m = pdfjs.Util.transform(viewport.transform, ctm);
        const xs = [m[4], m[4] + m[0], m[4] + m[2], m[4] + m[0] + m[2]], ys = [m[5], m[5] + m[1], m[5] + m[3], m[5] + m[1] + m[3]];
        const x = Math.min(...xs), y = Math.min(...ys), w = Math.max(...xs) - x, h = Math.max(...ys) - y;
        if (w >= 12 && h >= 12 && x < viewport.width && y < viewport.height) images.push({ x, y, width: w, height: h, index: -1, objId: args[0] as string });
      }
    });
  }
  return { items, images, width: viewport.width, height: viewport.height };
}
