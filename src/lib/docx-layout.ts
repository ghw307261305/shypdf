// Word → PDF 的排版引擎：lib/docx-read.ts 的文档模型 → 断行 → 分页 → 用 pdf-lib 画出来。
// 思路：所有内容先排成一条条不可再分的「横条」（段落的一行、表格的一行），分页器只管把横条往页面里放。
// 坐标：原点在页面左上角，y 向下，单位 pt；写 PDF 时再翻成左下角原点。
// 做了的：样式继承后的字体 / 字号 / 颜色 / 粗斜体 / 下划线 / 高亮、对齐、缩进、行距、段距、制表位（含右对齐和前导符）、列表编号、
//         表格（合并单元格、边框、底纹、表头行跨页重复）、图片、分页符、分节（纸张和页边距）、页眉页脚和页码、超链接、孤行控制。
// 没做的：分栏、文字环绕、图表 / SmartArt、从右到左的文字。
import {
  PDFDocument, PDFName, PDFString, PDFHexString, TextRenderingMode, type PDFPage, type PDFImage, type PDFOperator,
  pushGraphicsState, popGraphicsState, beginText, endText, setFontAndSize, setTextMatrix, showText, setTextRenderingMode,
  setFillingRgbColor, setStrokingRgbColor, setLineWidth, moveTo, lineTo, stroke, rectangle, fill,
} from 'pdf-lib';
import type { DocModel, Block, Paragraph, Table, Section, RunProps, Inline, ImageRef, Border, TabStop } from './docx-read';
import { FontSet, mapFamily, isCjk, type Face, type Family } from './pdf-fonts';

// ---------- 图元 ----------
type Prim =
  | { t: 'text'; x: number; y: number; w: number; cps: number[]; face: Face; size: number; color: string; bold: boolean; italic: boolean }
  | { t: 'rect'; x: number; y: number; w: number; h: number; color: string }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; width: number; color: string }
  | { t: 'image'; x: number; y: number; w: number; h: number; path: string }
  | { t: 'link'; x: number; y: number; w: number; h: number; url: string };

interface Floating { image: ImageRef; }
interface Strip {
  height: number; prims: Prim[]; before: number; after: number;
  keepWithNext?: boolean; pageBreakBefore?: boolean; floats?: Floating[];
  /** 表格行：同一张表的行共享 table；表头行在跨页时重复 */
  table?: object; headerRow?: boolean;
}
interface Fields { PAGE: string; NUMPAGES: string; }
interface Ctx { fonts: FontSet; defaultTab: number; fields: Fields; maxImageHeight: number; }

const shift = (p: Prim, dx: number, dy: number): Prim =>
  p.t === 'line' ? { ...p, x1: p.x1 + dx, x2: p.x2 + dx, y1: p.y1 + dy, y2: p.y2 + dy } : { ...p, x: p.x + dx, y: p.y + dy };

// ---------- 段落 ----------
interface Style { family: Family; bold: boolean; italic: boolean; size: number; color: string; underline: boolean; strike: boolean; highlight?: string; rise: number; link?: string; }
interface Frag { style: Style; face: Face; synthBold: boolean; synthItalic: boolean; cps: number[]; width: number; }
type Atom =
  | { kind: 'word'; frags: Frag[]; width: number; breakBefore: boolean }
  | { kind: 'space'; frags: Frag[]; width: number }
  | { kind: 'tab'; style: Style }
  | { kind: 'break'; page: boolean }
  | { kind: 'image'; image: ImageRef; width: number; height: number };

function styleOf(p: RunProps, link?: string): Style {
  const base = p.size ?? 11;
  const small = p.vertAlign ? base * 0.65 : base;
  return {
    family: mapFamily(p.font), bold: !!p.bold, italic: !!p.italic, size: small, color: p.color ?? '000000', underline: !!p.underline, strike: !!p.strike,
    highlight: p.highlight || undefined, rise: p.vertAlign === 'superscript' ? base * 0.35 : p.vertAlign === 'subscript' ? -base * 0.14 : 0, link,
  };
}

// 行首禁则：这些标点不能出现在行首，宁可让它挂在上一行末尾
const NO_LINE_START = new Set(Array.from('、。，．,.:;!?)]}」』】〕〉》！？：；）％'));
const isSpace = (cp: number) => cp === 0x20 || cp === 0x09 || cp === 0x0a || cp === 0x0d;

/** 带样式的字符流 → 原子（词、空格、制表符、换行、图片）。一个词可以跨多个 run，所以先摊平成字符再切。 */
function atomsOf(para: Paragraph, width: number, ctx: Ctx): { atoms: Atom[]; strut: Style; floats: Floating[]; blockImages: ImageRef[] } {
  const atoms: Atom[] = [], floats: Floating[] = [], blockImages: ImageRef[] = [];
  let word: Frag[] = [], wordBreak = true, prevWasText = false;
  const flush = () => { if (word.length) { atoms.push({ kind: 'word', frags: word, width: word.reduce((s, f) => s + f.width, 0), breakBefore: wordBreak }); word = []; } wordBreak = true; };
  const put = (list: Frag[], style: Style, cp: number) => {
    const pick = ctx.fonts.pick(style.family, style.bold, style.italic, cp);
    pick.face.used.add(pick.cp);
    const w = pick.face.advance(pick.cp) * style.size;
    const last = list[list.length - 1];
    if (last && last.style === style && last.face === pick.face) { last.cps.push(pick.cp); last.width += w; }
    else list.push({ style, face: pick.face, synthBold: pick.synthBold, synthItalic: pick.synthItalic, cps: [pick.cp], width: w });
  };
  const addText = (text: string, style: Style, smallCaps: boolean) => {
    const small = smallCaps ? { ...style, size: style.size * 0.8 } : style;
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      if (isSpace(cp)) { flush(); const frags: Frag[] = []; put(frags, style, 0x20); atoms.push({ kind: 'space', frags, width: frags[0].width }); prevWasText = false; continue; }
      if (cp < 0x20) continue;
      if (isCjk(cp)) { flush(); wordBreak = !NO_LINE_START.has(ch); put(word, style, cp); flush(); prevWasText = true; continue; }
      if (!word.length) wordBreak = !prevWasText || !NO_LINE_START.has(ch);
      if (smallCaps && ch !== ch.toUpperCase()) put(word, small, ch.toUpperCase().codePointAt(0)!); else put(word, style, cp);
      prevWasText = true;
      if ((ch === '-' || ch === '/') && word.reduce((n, f) => n + f.cps.length, 0) > 1) flush(); // 连字符后可以断行
    }
  };

  let strut: Style | undefined;
  if (para.marker) {
    const ms = styleOf(para.marker.props);
    let text = para.marker.text;
    // 项目符号在哪个字体里都找不到时退回圆点
    if ([...text].some((c) => !ctx.fonts.canShow(ms.family, ms.bold, ms.italic, c.codePointAt(0)!))) text = '•';
    addText(text, ms, false); flush();
    if (para.marker.suffix === 'tab') atoms.push({ kind: 'tab', style: ms }); else if (para.marker.suffix === 'space') addText(' ', ms, false);
  }
  for (const inl of para.inlines) {
    switch (inl.type) {
      case 'text': { const s = styleOf(inl.props, inl.link); strut ??= s; addText(inl.props.caps ? inl.text.toUpperCase() : inl.text, s, !!inl.props.smallCaps && !inl.props.caps); break; }
      case 'field': { const s = styleOf(inl.props); strut ??= s; addText(ctx.fields[inl.kind], s, false); break; }
      case 'tab': flush(); strut ??= styleOf(inl.props); atoms.push({ kind: 'tab', style: styleOf(inl.props) }); prevWasText = false; break;
      case 'break': flush(); atoms.push({ kind: 'break', page: inl.kind === 'page' }); prevWasText = false; break;
      case 'image': {
        if (inl.image.float?.mode === 'absolute') { floats.push({ image: inl.image }); break; }
        if (inl.image.float?.mode === 'block') { blockImages.push(inl.image); break; }
        flush();
        const k = Math.min(1, width / Math.max(inl.image.width, 1), ctx.maxImageHeight / Math.max(inl.image.height, 1));
        atoms.push({ kind: 'image', image: inl.image, width: inl.image.width * k, height: inl.image.height * k });
        prevWasText = false;
        break;
      }
    }
  }
  flush();
  return { atoms, strut: strut ?? styleOf({}), floats, blockImages };
}

interface Placed { x: number; atom: Atom; extra?: number; leader?: Frag; leaderFrom?: number; }
interface Line { items: Placed[]; width: number; start: number; hardBreak: boolean; pageBreakAfter: boolean; }

function breakLines(atoms: Atom[], para: Paragraph, width: number, ctx: Ctx): Line[] {
  const pp = para.props;
  const left = pp.indLeft ?? 0, right = width - (pp.indRight ?? 0), first = left + (pp.firstLine ?? 0);
  const stops: TabStop[] = [...(pp.tabs ?? [])].sort((a, b) => a.pos - b.pos);
  const nextStop = (x: number): TabStop => {
    const custom = stops.find((s) => s.pos > x + 0.5);
    if ((pp.firstLine ?? 0) < 0 && x < left - 0.5 && (!custom || custom.pos > left)) return { pos: left, kind: 'left' }; // 悬挂缩进的位置本身是一个制表位
    if (custom) return custom;
    return { pos: (Math.floor((x + 0.5) / ctx.defaultTab) + 1) * ctx.defaultTab, kind: 'left' };
  };
  const lines: Line[] = [];
  let line: Line = { items: [], width: 0, start: first, hardBreak: false, pageBreakAfter: false };
  let x = first;
  const newLine = () => { lines.push(line); line = { items: [], width: 0, start: left, hardBreak: false, pageBreakAfter: false }; x = left; };

  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i];
    if (a.kind === 'break') { line.hardBreak = true; line.pageBreakAfter = a.page; newLine(); continue; }
    if (a.kind === 'tab') {
      const stop = nextStop(x);
      let target = Math.min(stop.pos, Math.max(right, x));
      if (stop.kind !== 'left') {
        // 右对齐 / 居中制表位：先量出后面那段文字（到下一个制表符或行尾为止）有多宽
        let w = 0;
        for (let j = i + 1; j < atoms.length && atoms[j].kind !== 'tab' && atoms[j].kind !== 'break'; j++) w += (atoms[j] as any).width ?? 0;
        target = Math.max(x, stop.pos - (stop.kind === 'right' ? w : w / 2));
      }
      const placed: Placed = { x, atom: a };
      if (stop.leader && target - x > 2) {
        const frags: Frag[] = [];
        const cp = stop.leader.codePointAt(0)!, pick = ctx.fonts.pick(a.style.family, a.style.bold, a.style.italic, cp);
        pick.face.used.add(pick.cp);
        const cw = pick.face.advance(pick.cp) * a.style.size, n = Math.floor((target - x - 1) / cw);
        if (n > 0) { frags.push({ style: a.style, face: pick.face, synthBold: false, synthItalic: false, cps: new Array(n).fill(pick.cp), width: n * cw }); placed.leader = frags[0]; placed.leaderFrom = target - n * cw; }
      }
      line.items.push(placed);
      x = target;
      continue;
    }
    if (a.kind === 'space') { line.items.push({ x, atom: a }); x += a.width; continue; }
    // 词 / 图片：放不下就换行。行首禁则的标点（breakBefore = false）跟着前一个词走
    const fits = x + a.width <= right + 0.01;
    const canBreak = a.kind === 'image' || a.breakBefore;
    if (!fits && canBreak && line.items.some((it) => it.atom.kind === 'word' || it.atom.kind === 'image')) newLine();
    if (a.kind === 'word' && x <= line.start + 0.01 && a.width > right - line.start + 0.01 && a.frags.reduce((n, f) => n + f.cps.length, 0) > 1) {
      // 比一整行还长的词（长网址）：按字符硬拆
      for (const f of a.frags) for (const cp of f.cps) {
        const w = f.face.advance(cp) * f.style.size;
        if (x + w > right + 0.01 && x > line.start) newLine();
        line.items.push({ x, atom: { kind: 'word', frags: [{ ...f, cps: [cp], width: w }], width: w, breakBefore: true } });
        x += w;
      }
      continue;
    }
    line.items.push({ x, atom: a });
    x += a.width;
  }
  lines.push(line);
  for (const l of lines) { const last = l.items[l.items.length - 1]; l.width = last ? last.x + ((last.atom as any).width ?? 0) - l.start : 0; }
  // 去掉行尾空格的宽度（对齐时不算）
  for (const l of lines) { let w = 0; for (let i = l.items.length - 1; i >= 0 && l.items[i].atom.kind === 'space'; i--) w += (l.items[i].atom as any).width; l.width -= w; }

  // 对齐
  lines.forEach((l, li) => {
    const avail = right - l.start, slack = avail - l.width;
    if (slack <= 0.01) return;
    const align = pp.align ?? 'left';
    if (align === 'center' || align === 'right') { const dx = align === 'center' ? slack / 2 : slack; for (const it of l.items) { it.x += dx; if (it.leaderFrom != null) it.leaderFrom += dx; } l.start += dx; }
    else if (align === 'both' && li < lines.length - 1 && !l.hardBreak) {
      // 两端对齐：把多出来的宽度摊到最后一个制表符之后的空格上（没有空格的中文行摊到字间）
      const from = Math.max(0, ...l.items.map((it, i) => (it.atom.kind === 'tab' ? i + 1 : 0)));
      let end = l.items.length; while (end > from && l.items[end - 1].atom.kind === 'space') end--;
      const body = l.items.slice(from, end);
      let gaps = body.filter((it) => it.atom.kind === 'space').length;
      const bySpace = gaps > 0;
      if (!bySpace) gaps = body.length - 1;
      if (gaps <= 0 || slack > avail * 0.4) return;
      let acc = 0;
      body.forEach((it, i) => { it.x += acc; if (bySpace ? it.atom.kind === 'space' : i < body.length - 1) acc += slack / gaps; });
    }
  });
  return lines;
}

function borderLine(b: Border, x1: number, y1: number, x2: number, y2: number): Prim { return { t: 'line', x1, y1, x2, y2, width: b.width, color: b.color }; }

function layoutParagraph(para: Paragraph, width: number, ctx: Ctx): Strip[] {
  const pp = para.props;
  const { atoms, strut, floats, blockImages } = atomsOf(para, width - (pp.indLeft ?? 0) - (pp.indRight ?? 0), ctx);
  const lines = breakLines(atoms, para, width, ctx);
  const strutFace = ctx.fonts.pick(strut.family, strut.bold, strut.italic, 0x20).face;
  const strips: Strip[] = [];

  // 「上下型 / 四周型」环绕的浮动图片：降级成独占一行
  for (const im of blockImages) {
    const k = Math.min(1, width / Math.max(im.width, 1), ctx.maxImageHeight / Math.max(im.height, 1));
    const w = im.width * k, h = im.height * k, x = im.float?.align === 'center' ? (width - w) / 2 : im.float?.align === 'right' ? width - w : 0;
    strips.push({ height: h, prims: [{ t: 'image', x, y: 0, w, h, path: im.path }], before: 4, after: 4 });
  }

  lines.forEach((l, li) => {
    let asc = 0, desc = 0, gap = 0, imgH = 0;
    const measure = (face: Face, size: number) => { asc = Math.max(asc, face.ascent * size); desc = Math.max(desc, face.descent * size); gap = Math.max(gap, face.lineGap * size); };
    for (const it of l.items) {
      if (it.atom.kind === 'word' || it.atom.kind === 'space') for (const f of it.atom.frags) measure(f.face, f.style.rise ? f.style.size / 0.65 : f.style.size);
      else if (it.atom.kind === 'image') imgH = Math.max(imgH, it.atom.height);
    }
    if (!asc) measure(strutFace, strut.size);
    asc = Math.max(asc, imgH);
    const natural = asc + desc + gap;
    let height = natural, baseline = asc + gap / 2;
    if (pp.lineRule === 'exact' && pp.line) { height = pp.line; baseline = height - desc - Math.max(0, (height - natural) * 0.2); if (imgH > height) { height = imgH + desc; baseline = imgH; } }
    else if (pp.lineRule === 'atLeast' && pp.line) { height = Math.max(natural, pp.line); baseline = height - desc - gap / 2; }
    else if (pp.line) height = natural * pp.line; // 多倍行距：多出来的部分加在行的下方

    const prims: Prim[] = [];
    const emit = (f: Frag, x: number) => {
      const s = f.style, y = baseline - s.rise;
      if (s.highlight) prims.push({ t: 'rect', x, y: baseline - asc, w: f.width, h: asc + desc, color: s.highlight });
      const prev = prims[prims.length - 1];
      // 同样式、首尾相接的片段并成一条文字指令
      if (prev?.t === 'text' && prev.face === f.face && prev.size === s.size && prev.color === s.color && prev.bold === f.synthBold && prev.italic === f.synthItalic && Math.abs(prev.x + prev.w - x) < 0.01 && prev.y === y) { prev.cps.push(...f.cps); prev.w += f.width; }
      else prims.push({ t: 'text', x, y, w: f.width, cps: [...f.cps], face: f.face, size: s.size, color: s.color, bold: f.synthBold, italic: f.synthItalic });
      if (s.underline) prims.push({ t: 'line', x1: x, y1: y + s.size * 0.11, x2: x + f.width, y2: y + s.size * 0.11, width: Math.max(0.5, s.size / 16), color: s.color });
      if (s.strike) prims.push({ t: 'line', x1: x, y1: y - s.size * 0.28, x2: x + f.width, y2: y - s.size * 0.28, width: Math.max(0.5, s.size / 16), color: s.color });
      if (s.link) prims.push({ t: 'link', x, y: baseline - asc, w: f.width, h: asc + desc, url: s.link });
    };
    l.items.forEach((it, ii) => {
      const a = it.atom;
      if (a.kind === 'word' || a.kind === 'space') {
        // 行尾的空格不画（否则下划线会伸出去）
        if (a.kind === 'space' && l.items.slice(ii).every((r) => r.atom.kind === 'space')) return;
        let x = it.x; for (const f of a.frags) { emit(f, x); x += f.width; }
      } else if (a.kind === 'tab' && it.leader) emit(it.leader, it.leaderFrom!);
      else if (a.kind === 'image') prims.push({ t: 'image', x: it.x, y: baseline - a.height, w: a.width, h: a.height, path: a.image.path });
    });

    // 段落底纹和边框：每一行画自己那一段，拼起来就是整段
    const bx1 = (pp.indLeft ?? 0) + Math.min(0, pp.firstLine ?? 0), bx2 = width - (pp.indRight ?? 0);
    if (pp.shading) prims.unshift({ t: 'rect', x: bx1, y: 0, w: bx2 - bx1, h: height, color: pp.shading });
    const b = pp.borders;
    if (b?.left) prims.push(borderLine(b.left, bx1 - 3, 0, bx1 - 3, height));
    if (b?.right) prims.push(borderLine(b.right, bx2 + 3, 0, bx2 + 3, height));
    if (b?.top && li === 0) prims.push(borderLine(b.top, bx1, 0, bx2, 0));
    if (b?.bottom && li === lines.length - 1) prims.push(borderLine(b.bottom, bx1, height + 1, bx2, height + 1));

    strips.push({
      height, prims, before: li === 0 ? pp.spaceBefore ?? 0 : 0, after: li === lines.length - 1 ? pp.spaceAfter ?? 0 : 0,
      // 与下段同页；孤行控制：段首、段尾都不留单独一行
      keepWithNext: (pp.keepNext && true) || (lines.length > 1 && (li === 0 || li === lines.length - 2)) || undefined,
      pageBreakBefore: (li === 0 && pp.pageBreakBefore) || (li > 0 && lines[li - 1].pageBreakAfter) || undefined,
      floats: li === 0 && floats.length ? floats : undefined,
    });
  });
  if (lines[lines.length - 1].pageBreakAfter) strips.push({ height: 0, prims: [], before: 0, after: 0, pageBreakBefore: true });
  return strips;
}

// ---------- 表格 ----------
function layoutTable(tbl: Table, width: number, ctx: Ctx): Strip[] {
  let grid = tbl.grid.length ? [...tbl.grid] : [width];
  if (grid.every((g) => !g)) grid = grid.map(() => width / grid.length);
  let total = grid.reduce((a, b) => a + b, 0);
  const target = tbl.widthPct ? width * tbl.widthPct : total > width - Math.min(0, tbl.indent) + 1 ? width : total;
  if (Math.abs(target - total) > 0.5) { grid = grid.map((g) => (g * target) / total); total = target; }
  const x0 = tbl.align === 'center' ? (width - total) / 2 : tbl.align === 'right' ? width - total : Math.max(tbl.indent, -12);
  const colX = (i: number) => x0 + grid.slice(0, i).reduce((a, b) => a + b, 0);

  // 先排每个单元格的内容，定下每行的高度
  interface Box { col: number; x: number; w: number; strips: Strip[]; contentH: number; rows: number; }
  const boxes: (Box | null)[][] = [];
  const heights: number[] = [];
  tbl.rows.forEach((row, ri) => {
    let col = 0, h = row.height ?? 0;
    boxes.push(row.cells.map((cell) => {
      const x = colX(col), w = grid.slice(col, col + cell.span).reduce((a, b) => a + b, 0);
      const c0 = col; col += cell.span;
      if (cell.vMerge === 'continue') return null;
      const strips = layoutBlocks(cell.blocks, Math.max(10, w - cell.margins.left - cell.margins.right), ctx);
      const contentH = stackHeight(strips) + cell.margins.top + cell.margins.bottom;
      if (!cell.vMerge && !row.exact) h = Math.max(h, contentH);
      return { col: c0, x, w, strips, contentH, rows: 1 };
    }));
    heights[ri] = row.exact && row.height ? row.height : Math.max(h, 4);
  });
  // 纵向合并的单元格：内容比它跨的那几行高时，把差额补到最后一行
  tbl.rows.forEach((row, ri) => row.cells.forEach((cell, ci) => {
    const box = boxes[ri][ci];
    if (!box || cell.vMerge !== 'restart') return;
    let end = ri;
    while (end + 1 < tbl.rows.length) {
      let c = 0; const below = tbl.rows[end + 1].cells.find((k) => { const hit = c === box.col; c += k.span; return hit; });
      if (below?.vMerge !== 'continue') break;
      end++;
    }
    box.rows = end - ri + 1;
    const spanH = heights.slice(ri, end + 1).reduce((a, b) => a + b, 0);
    if (box.contentH > spanH) heights[end] += box.contentH - spanH;
  }));

  return tbl.rows.map((row, ri): Strip => {
    const prims: Prim[] = [], lines: Prim[] = [];
    row.cells.forEach((cell, ci) => {
      const box = boxes[ri][ci];
      if (!box) return;
      const h = heights.slice(ri, ri + box.rows).reduce((a, b) => a + b, 0);
      if (cell.shading) prims.push({ t: 'rect', x: box.x, y: 0, w: box.w, h, color: cell.shading });
      const free = h - box.contentH;
      let y = cell.margins.top + (cell.vAlign === 'center' ? free / 2 : cell.vAlign === 'bottom' ? free : 0);
      let prevAfter = 0;
      box.strips.forEach((s, si) => { y += si ? Math.max(prevAfter, s.before) : s.before; prims.push(...s.prims.map((p) => shift(p, box.x + cell.margins.left, y))); y += s.height; prevAfter = s.after; });
      const bd = cell.borders;
      if (bd.top) lines.push(borderLine(bd.top, box.x, 0, box.x + box.w, 0));
      if (bd.bottom) lines.push(borderLine(bd.bottom, box.x, h, box.x + box.w, h));
      if (bd.left) lines.push(borderLine(bd.left, box.x, 0, box.x, h));
      if (bd.right) lines.push(borderLine(bd.right, box.x + box.w, 0, box.x + box.w, h));
    });
    // 这一行里有向下合并的单元格时，和下一行留在同一页
    const spans = boxes[ri].some((b) => b && b.rows > 1);
    return { height: heights[ri], prims: [...prims, ...lines], before: 0, after: 0, table: tbl, headerRow: row.header && ri < 3, keepWithNext: spans || (row.header && ri < 3) || undefined };
  });
}

// ---------- 块 ----------
const stackHeight = (strips: Strip[]) => strips.reduce((h, s, i) => h + s.height + (i ? Math.max(strips[i - 1].after, s.before) : s.before), 0) + (strips[strips.length - 1]?.after ?? 0);

function layoutBlocks(blocks: Block[], width: number, ctx: Ctx): Strip[] {
  const out: Strip[] = [];
  blocks.forEach((b, i) => {
    const strips = b.type === 'p' ? layoutParagraph(b, width, ctx) : layoutTable(b, width, ctx);
    // 「相同样式的段落之间不加间距」（列表段落常用）
    const prev = blocks[i - 1];
    if (b.type === 'p' && prev?.type === 'p' && b.props.contextualSpacing && prev.props.styleId === b.props.styleId && strips.length) { strips[0].before = 0; if (out.length && prev.props.contextualSpacing) out[out.length - 1].after = 0; }
    out.push(...strips);
  });
  return out;
}

// ---------- 分页 ----------
interface PageOut { section: Section; firstOfSection: boolean; back: Prim[]; prims: Prim[]; }

function sectionsOf(doc: DocModel): { section: Section; blocks: Block[] }[] {
  const out: { section: Section; blocks: Block[] }[] = [];
  let cur: Block[] = [];
  for (const b of doc.blocks) {
    cur.push(b);
    if (b.type === 'p' && b.sectionEnd) { out.push({ section: b.sectionEnd, blocks: cur }); cur = []; }
  }
  out.push({ section: doc.lastSection, blocks: cur });
  // 没有自己页眉页脚的节沿用上一节的
  for (let i = 1; i < out.length; i++) for (const k of ['header', 'footer', 'firstHeader', 'firstFooter'] as const) out[i].section[k] ??= out[i - 1].section[k];
  return out.filter((s, i, all) => s.blocks.length || i === all.length - 1);
}

function paginate(doc: DocModel, ctx: Ctx): PageOut[] {
  const pages: PageOut[] = [];
  const sections = sectionsOf(doc);
  if (doc.footnotes.length) {
    const last = sections[sections.length - 1];
    const rule: Paragraph = { type: 'p', props: { spaceBefore: 18, spaceAfter: 4, borders: { top: { width: 0.5, color: '000000' } }, indRight: Math.max(0, last.section.width - last.section.margin.left - last.section.margin.right - 144) }, inlines: [{ type: 'text', text: '', props: { size: 4 } }] };
    last.blocks.push(rule);
    for (const fn of doc.footnotes) {
      const blocks = fn.blocks.map((b) => ({ ...b }));
      const firstP = blocks.find((b): b is Paragraph => b.type === 'p');
      if (firstP) { const props = (firstP.inlines.find((i) => i.type === 'text') as any)?.props ?? {}; firstP.inlines = [{ type: 'text', text: fn.mark + ' ', props: { ...props, vertAlign: 'superscript' } }, ...firstP.inlines]; }
      last.blocks.push(...blocks);
    }
  }

  let y = 0, top = 0, bottom = 0, prevAfter = 0, atTop = true;
  let page: PageOut | null = null;
  sections.forEach(({ section, blocks }, si) => {
    const m = section.margin, width = section.width - m.left - m.right;
    // 页眉 / 页脚比页边距高时，正文要让出位置
    const probe = { ...ctx, fields: { PAGE: '1', NUMPAGES: '1' } };
    const headH = Math.max(stackHeight(layoutBlocks(section.header ?? [], width, probe)), stackHeight(layoutBlocks(section.firstHeader ?? [], width, probe)));
    const footH = Math.max(stackHeight(layoutBlocks(section.footer ?? [], width, probe)), stackHeight(layoutBlocks(section.firstFooter ?? [], width, probe)));
    const secTop = Math.max(m.top, headH ? m.header + headH + 4 : 0), secBottom = section.height - Math.max(m.bottom, footH ? m.footer + footH + 4 : 0);
    let firstOfSection = true;
    const newPage = () => { page = { section, firstOfSection, back: [], prims: [] }; firstOfSection = false; pages.push(page); top = secTop; bottom = secBottom; y = top; prevAfter = 0; atTop = true; };
    if (!page || !(section.continuous && si > 0)) newPage();

    const strips = layoutBlocks(blocks, width, { ...ctx, maxImageHeight: secBottom - secTop - 2 });
    const place = (s: Strip, gap: number) => {
      const py = y + gap;
      page!.prims.push(...s.prims.map((p) => shift(p, m.left, py)));
      for (const f of s.floats ?? []) {
        const fl = f.image.float!, im = f.image;
        const fx = fl.align === 'center' ? (fl.relX === 'page' ? (section.width - im.width) / 2 : m.left + (width - im.width) / 2) : fl.align === 'right' ? (fl.relX === 'page' ? section.width - im.width : m.left + width - im.width) : (fl.relX === 'page' ? 0 : m.left) + (fl.x ?? 0);
        const fy = (fl.relY === 'page' ? 0 : fl.relY === 'margin' ? m.top : py) + (fl.y ?? 0);
        (fl.behind ? page!.back : page!.prims).push({ t: 'image', x: fx, y: fy, w: im.width, h: im.height, path: im.path });
      }
      y = py + s.height; prevAfter = s.after; atTop = false;
    };
    strips.forEach((s, i) => {
      if (s.pageBreakBefore && !atTop) newPage();
      let gap = atTop ? (pages.length === 1 || s.pageBreakBefore ? s.before : 0) : Math.max(prevAfter, s.before);
      // 要和后面的横条留在同一页的，一起算高度（最多看 6 条，且不超过半页，免得死循环式地整页整页往后推）
      let need = s.height, j = i;
      while (strips[j].keepWithNext && j + 1 < strips.length && j - i < 6) { j++; need += Math.max(strips[j - 1].after, strips[j].before) + strips[j].height; }
      if (need > (bottom - top) * 0.5) need = s.height;
      if (y + gap + need > bottom + 0.5 && !atTop) {
        newPage();
        gap = 0;
        // 表格跨页：重复表头行
        if (s.table && !s.headerRow) for (const h of strips.filter((k) => k.table === s.table && k.headerRow)) place(h, 0);
      }
      place(s, gap);
    });
  });
  return pages;
}

// ---------- 输出 PDF ----------
const rgb = (hex: string) => [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255] as const;

async function embedImages(pdf: PDFDocument, doc: DocModel, used: Set<string>): Promise<Map<string, PDFImage>> {
  const out = new Map<string, PDFImage>();
  for (const path of used) {
    const bytes = doc.media.get(path);
    if (!bytes) continue;
    try {
      if (bytes[0] === 0x89 && bytes[1] === 0x50) out.set(path, await pdf.embedPng(bytes));
      else if (bytes[0] === 0xff && bytes[1] === 0xd8) out.set(path, await pdf.embedJpg(bytes));
      else if (typeof document !== 'undefined' && !/\.(emf|wmf)$/i.test(path)) {
        // GIF / BMP / WebP / SVG：让浏览器解码，转成 PNG 再嵌入
        const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]));
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width; canvas.height = bitmap.height;
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
        const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
        out.set(path, await pdf.embedPng(new Uint8Array(await blob.arrayBuffer())));
      }
    } catch { /* 解不出来的图片（EMF / WMF、损坏的文件）跳过，不影响其余内容 */ }
  }
  return out;
}

export interface ConvertResult { pdf: Uint8Array; pages: number; skippedImages: number; }

export async function docxToPdf(doc: DocModel, opts: { title?: string; progress?: (ratio: number) => void } = {}): Promise<ConvertResult> {
  // 1. 收集文档里出现的「字体 × 文字」，把字体准备好
  const fonts = new FontSet();
  const uses = new Map<string, { family: Family; bold: boolean; italic: boolean; text: string[] }>();
  const note = (p: RunProps, text: string) => {
    const family = mapFamily(p.font), key = FontSet.key(family, p.bold, p.italic);
    let u = uses.get(key); if (!u) uses.set(key, (u = { family, bold: !!p.bold, italic: !!p.italic, text: [] }));
    u.text.push(p.caps || p.smallCaps ? text.toUpperCase() + text : text);
  };
  const scan = (blocks: Block[]) => {
    for (const b of blocks) {
      if (b.type === 'tbl') { for (const r of b.rows) for (const c of r.cells) scan(c.blocks); continue; }
      if (b.marker) note(b.marker.props, b.marker.text + ' •');
      for (const tab of b.props.tabs ?? []) if (tab.leader) note((b.inlines.find((i) => 'props' in i) as any)?.props ?? {}, tab.leader);
      for (const i of b.inlines as Inline[]) { if (i.type === 'text') note(i.props, i.text + ' '); else if (i.type === 'field') note(i.props, '0123456789 '); else if (i.type === 'tab') note(i.props, ' ._-'); }
    }
  };
  const allSections = [doc.lastSection, ...doc.blocks.flatMap((b) => (b.type === 'p' && b.sectionEnd ? [b.sectionEnd] : []))];
  scan(doc.blocks);
  for (const s of allSections) for (const hf of [s.header, s.footer, s.firstHeader, s.firstFooter]) if (hf) scan(hf);
  for (const fn of doc.footnotes) { scan(fn.blocks); note({ vertAlign: 'superscript' }, '0123456789 '); }
  note({}, ' ?•');
  await fonts.prepare([...uses.values()].map((u) => ({ ...u, text: u.text.join('') })));
  opts.progress?.(0.35);

  // 2. 排版、分页
  const ctx: Ctx = { fonts, defaultTab: doc.defaultTab, fields: { PAGE: '1', NUMPAGES: '1' }, maxImageHeight: 600 };
  const pages = paginate(doc, ctx);
  // 页眉页脚要等总页数出来再排（里面有页码）
  pages.forEach((page, pi) => {
    const s = page.section, m = s.margin, width = s.width - m.left - m.right;
    const hctx = { ...ctx, fields: { PAGE: String(pi + 1), NUMPAGES: String(pages.length) } };
    const header = s.titlePage && page.firstOfSection ? s.firstHeader : s.header, footer = s.titlePage && page.firstOfSection ? s.firstFooter : s.footer;
    const draw = (blocks: Block[] | undefined, yOf: (h: number) => number) => {
      if (!blocks?.length) return;
      const strips = layoutBlocks(blocks, width, hctx);
      let y = yOf(stackHeight(strips)), prevAfter = 0;
      strips.forEach((st, i) => { y += i ? Math.max(prevAfter, st.before) : st.before; page.prims.push(...st.prims.map((p) => shift(p, m.left, y))); y += st.height; prevAfter = st.after; });
    };
    draw(header, () => m.header);
    draw(footer, (h) => s.height - m.footer - h);
  });
  opts.progress?.(0.6);

  // 3. 写 PDF
  const pdf = await PDFDocument.create();
  if (opts.title) pdf.setTitle(opts.title);
  pdf.setProducer('ShyPDF'); pdf.setCreator('ShyPDF');
  const embedded = await fonts.embed(pdf);
  const usedImages = new Set<string>();
  for (const p of pages) for (const pr of [...p.back, ...p.prims]) if (pr.t === 'image') usedImages.add(pr.path);
  const images = await embedImages(pdf, doc, usedImages);

  pages.forEach((page, pi) => {
    const H = page.section.height;
    const out: PDFPage = pdf.addPage([page.section.width, H]);
    const fontKeys = new Map<string, PDFName>();
    const ops: PDFOperator[] = [];
    for (const p of [...page.back, ...page.prims]) {
      if (p.t === 'text') {
        const e = embedded.get(p.face.key);
        if (!e || !p.cps.length) continue;
        let key = fontKeys.get(p.face.key);
        if (!key) fontKeys.set(p.face.key, (key = out.node.newFontDictionary(e.font.name, e.font.ref)));
        const [r, g, b] = rgb(p.color);
        ops.push(pushGraphicsState(), beginText(), setFillingRgbColor(r, g, b), setFontAndSize(key, p.size));
        if (p.bold) ops.push(setTextRenderingMode(TextRenderingMode.FillAndOutline), setStrokingRgbColor(r, g, b), setLineWidth(p.size * 0.035));
        ops.push(setTextMatrix(1, 0, p.italic ? 0.21 : 0, 1, p.x, H - p.y), showText(PDFHexString.of(p.cps.map(e.hex).join(''))), endText(), popGraphicsState());
      } else if (p.t === 'rect') {
        const [r, g, b] = rgb(p.color);
        ops.push(pushGraphicsState(), setFillingRgbColor(r, g, b), rectangle(p.x, H - p.y - p.h, p.w, p.h), fill(), popGraphicsState());
      } else if (p.t === 'line') {
        const [r, g, b] = rgb(p.color);
        ops.push(pushGraphicsState(), setStrokingRgbColor(r, g, b), setLineWidth(p.width), moveTo(p.x1, H - p.y1), lineTo(p.x2, H - p.y2), stroke(), popGraphicsState());
      } else if (p.t === 'image') {
        const im = images.get(p.path);
        if (!im) continue;
        out.pushOperators(...ops.splice(0)); // 保持绘制顺序：图片走 pdf-lib 的高层接口
        out.drawImage(im, { x: p.x, y: H - p.y - p.h, width: p.w, height: p.h });
      } else if (p.t === 'link') {
        const annot = pdf.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [p.x, H - p.y - p.h, p.x + p.w, H - p.y], Border: [0, 0, 0], A: { Type: 'Action', S: 'URI', URI: PDFString.of(p.url) } });
        out.node.addAnnot(pdf.context.register(annot));
      }
    }
    out.pushOperators(...ops);
    if (pi % 10 === 0) opts.progress?.(0.6 + 0.35 * (pi / pages.length));
  });
  const bytes = await pdf.save({ useObjectStreams: true });
  return { pdf: bytes, pages: pages.length, skippedImages: [...usedImages].filter((p) => !images.has(p)).length };
}
