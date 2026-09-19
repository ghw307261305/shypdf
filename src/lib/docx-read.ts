// .docx 解析：zip 里的 WordprocessingML → 排版引擎（lib/docx-layout.ts）用的文档模型。
// 这里负责把 Word 的「层层继承」摊平：文档默认值 → 表格样式 → 段落样式链 → 字符样式链 → 直接格式；编号（列表）也在这里算成文字。
// 不支持的东西（图表、SmartArt、修订里的删除内容、批注）直接跳过；文本框里的文字降级成普通段落，免得丢字。
// 长度单位统一换成 pt。元素按 localName 匹配、属性按 localName 读取，不依赖 w: 前缀。
import type JSZipType from 'jszip';

export interface RunProps {
  font?: string; eastAsia?: string; size?: number; bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean;
  color?: string; highlight?: string; vertAlign?: 'superscript' | 'subscript'; caps?: boolean; smallCaps?: boolean; hidden?: boolean;
}
export interface Border { width: number; color: string; }
export type Edges<T> = { top?: T; bottom?: T; left?: T; right?: T };
export interface TabStop { pos: number; kind: 'left' | 'right' | 'center'; leader?: string; }
export interface ParaProps {
  styleId?: string; align?: 'left' | 'center' | 'right' | 'both';
  indLeft?: number; indRight?: number; firstLine?: number; // firstLine < 0 = 悬挂缩进
  spaceBefore?: number; spaceAfter?: number; line?: number; lineRule?: 'auto' | 'exact' | 'atLeast';
  keepNext?: boolean; pageBreakBefore?: boolean; contextualSpacing?: boolean;
  shading?: string; borders?: Edges<Border>; tabs?: TabStop[]; numId?: string; ilvl?: number;
}
export type Inline =
  | { type: 'text'; text: string; props: RunProps; link?: string }
  | { type: 'tab'; props: RunProps }
  | { type: 'break'; kind: 'line' | 'page' }
  | { type: 'field'; kind: 'PAGE' | 'NUMPAGES'; props: RunProps }
  | { type: 'image'; image: ImageRef };
export interface ImageRef {
  path: string; width: number; height: number;
  /** 浮动图片：inline = 当成行内；block = 独占一行；absolute = 按页面坐标摆放，不占位置 */
  float?: { mode: 'block' | 'absolute'; align?: 'left' | 'center' | 'right'; x?: number; y?: number; relX?: string; relY?: string; behind?: boolean };
}
export interface Paragraph { type: 'p'; props: ParaProps; inlines: Inline[]; marker?: { text: string; props: RunProps; suffix: 'tab' | 'space' | 'nothing' }; sectionEnd?: Section; }
export interface Cell { blocks: Block[]; span: number; vMerge?: 'restart' | 'continue'; shading?: string; borders: Edges<Border | null>; margins: Required<Edges<number>>; vAlign?: 'top' | 'center' | 'bottom'; }
export interface Row { cells: Cell[]; height?: number; exact?: boolean; header?: boolean; }
export interface Table { type: 'tbl'; grid: number[]; rows: Row[]; indent: number; align?: 'left' | 'center' | 'right'; widthPct?: number; }
export type Block = Paragraph | Table;
export interface Section {
  width: number; height: number; margin: Required<Edges<number>> & { header: number; footer: number };
  header?: Block[]; footer?: Block[]; firstHeader?: Block[]; firstFooter?: Block[]; titlePage: boolean; continuous: boolean;
}
export interface DocModel { blocks: Block[]; lastSection: Section; footnotes: { mark: string; blocks: Block[] }[]; media: Map<string, Uint8Array>; defaultTab: number; }

// ---------- XML 小工具 ----------
type El = Element;
const kids = (el: El | null | undefined, name?: string): El[] => {
  const out: El[] = [];
  for (let n = el?.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && (!name || (n as El).localName === name)) out.push(n as El);
  return out;
};
const kid = (el: El | null | undefined, name: string): El | undefined => kids(el, name)[0];
const path = (el: El | null | undefined, ...names: string[]) => names.reduce<El | undefined>((e, n) => kid(e, n), el ?? undefined);
function attr(el: El | null | undefined, name: string): string | undefined {
  if (!el) return undefined;
  for (let i = 0; i < el.attributes.length; i++) { const a = el.attributes[i]; if (a.localName === name) return a.value; }
  return undefined;
}
const num = (el: El | null | undefined, name: string) => { const v = attr(el, name); const n = v == null ? NaN : parseFloat(v); return Number.isFinite(n) ? n : undefined; };
const twips = (el: El | null | undefined, name: string) => { const n = num(el, name); return n == null ? undefined : n / 20; };
const onOff = (el: El | undefined) => (el ? !['0', 'false', 'off', 'none'].includes(attr(el, 'val') ?? '1') : undefined);
function descend(el: El, name: string, out: El[] = []): El[] {
  for (const k of kids(el)) { if (k.localName === name) out.push(k); descend(k, name, out); }
  return out;
}
const defined = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
const EMU = 12700;

const HIGHLIGHTS: Record<string, string> = { yellow: 'FFFF00', green: '00FF00', cyan: '00FFFF', magenta: 'FF00FF', blue: '0000FF', red: 'FF0000', darkBlue: '000080', darkCyan: '008080', darkGreen: '008000', darkMagenta: '800080', darkRed: '800000', darkYellow: '808000', darkGray: '808080', lightGray: 'C0C0C0', black: '000000' };
const hex = (v?: string) => (v && /^[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : undefined);

// ---------- 解析 ----------
export async function readDocx(data: ArrayBuffer | Uint8Array): Promise<DocModel> {
  const { default: JSZip } = await import('jszip');
  let zip: JSZipType;
  try { zip = await JSZip.loadAsync(data); } catch { throw new DocxError('not-docx'); }
  const text = async (p: string) => zip.file(p)?.async('string');
  const parse = (xml?: string) => (xml ? new DOMParser().parseFromString(xml, 'application/xml').documentElement : undefined);

  const docEl = parse(await text('word/document.xml'));
  if (!docEl) throw new DocxError('not-docx');
  const readRels = async (part: string) => {
    const dir = part.slice(0, part.lastIndexOf('/') + 1), file = part.slice(dir.length);
    const map = new Map<string, { target: string; external: boolean }>();
    for (const r of kids(parse(await text(`${dir}_rels/${file}.rels`)), 'Relationship')) {
      const target = attr(r, 'Target') ?? '', external = attr(r, 'TargetMode') === 'External';
      map.set(attr(r, 'Id') ?? '', { external, target: external ? target : target.startsWith('/') ? target.slice(1) : normalize(dir + target) });
    }
    return map;
  };

  // ---- 主题字体、样式 ----
  const theme = parse(await text('word/theme/theme1.xml'));
  const fontScheme = theme ? descend(theme, 'fontScheme')[0] : undefined;
  const themeFont = (key?: string) => (key ? attr(path(fontScheme, key.startsWith('major') ? 'majorFont' : 'minorFont', 'latin'), 'typeface') : undefined);

  const readRPr = (el?: El): RunProps => {
    if (!el) return {};
    const fonts = kid(el, 'rFonts'), color = attr(kid(el, 'color'), 'val'), u = kid(el, 'u'), va = attr(kid(el, 'vertAlign'), 'val');
    const hl = attr(kid(el, 'highlight'), 'val'), shd = hex(attr(kid(el, 'shd'), 'fill'));
    return defined<RunProps>({
      font: attr(fonts, 'ascii') ?? attr(fonts, 'hAnsi') ?? themeFont(attr(fonts, 'asciiTheme') ?? attr(fonts, 'hAnsiTheme')),
      eastAsia: attr(fonts, 'eastAsia'),
      size: num(kid(el, 'sz'), 'val') != null ? num(kid(el, 'sz'), 'val')! / 2 : undefined,
      bold: onOff(kid(el, 'b')), italic: onOff(kid(el, 'i')), strike: onOff(kid(el, 'strike')) ?? onOff(kid(el, 'dstrike')),
      underline: u ? attr(u, 'val') !== 'none' : undefined,
      color: color === 'auto' ? '000000' : hex(color),
      highlight: hl ? (hl === 'none' ? '' : HIGHLIGHTS[hl]) : shd,
      vertAlign: va === 'superscript' || va === 'subscript' ? va : undefined,
      caps: onOff(kid(el, 'caps')), smallCaps: onOff(kid(el, 'smallCaps')), hidden: onOff(kid(el, 'vanish')),
    });
  };
  const readBorder = (el?: El): Border | null | undefined => {
    if (!el) return undefined;
    const val = attr(el, 'val');
    if (!val || val === 'nil' || val === 'none') return null;
    return { width: Math.max(0.25, (num(el, 'sz') ?? 4) / 8) * (val === 'double' ? 1.5 : 1), color: hex(attr(el, 'color')) ?? '000000' };
  };
  const readEdges = (el?: El): Edges<Border | null> & { insideH?: Border | null; insideV?: Border | null } => defined({
    top: readBorder(kid(el, 'top')), bottom: readBorder(kid(el, 'bottom')), left: readBorder(kid(el, 'left') ?? kid(el, 'start')), right: readBorder(kid(el, 'right') ?? kid(el, 'end')),
    insideH: readBorder(kid(el, 'insideH')), insideV: readBorder(kid(el, 'insideV')),
  });
  const readPPr = (el?: El): ParaProps => {
    if (!el) return {};
    const sp = kid(el, 'spacing'), ind = kid(el, 'ind'), jc = attr(kid(el, 'jc'), 'val'), numPr = kid(el, 'numPr');
    const hanging = twips(ind, 'hanging'), first = twips(ind, 'firstLine');
    const rule = attr(sp, 'lineRule');
    const lineRaw = num(sp, 'line');
    const borders = readEdges(kid(el, 'pBdr'));
    const tabs = kids(kid(el, 'tabs'), 'tab').filter((t) => attr(t, 'val') !== 'clear').map((t): TabStop => {
      const v = attr(t, 'val'), leader = attr(t, 'leader');
      return { pos: twips(t, 'pos') ?? 0, kind: v === 'right' || v === 'end' ? 'right' : v === 'center' ? 'center' : 'left', leader: leader === 'dot' ? '.' : leader === 'hyphen' ? '-' : leader === 'underscore' ? '_' : undefined };
    });
    return defined<ParaProps>({
      styleId: attr(kid(el, 'pStyle'), 'val'),
      align: jc === 'center' ? 'center' : jc === 'right' || jc === 'end' ? 'right' : jc === 'both' || jc === 'distribute' ? 'both' : jc ? 'left' : undefined,
      indLeft: twips(ind, 'left') ?? twips(ind, 'start'), indRight: twips(ind, 'right') ?? twips(ind, 'end'),
      firstLine: hanging != null ? -hanging : first,
      spaceBefore: attr(sp, 'beforeAutospacing') === '1' ? 14 : twips(sp, 'before'), spaceAfter: attr(sp, 'afterAutospacing') === '1' ? 14 : twips(sp, 'after'),
      // auto：240 = 单倍；exact / atLeast：twip
      line: lineRaw == null ? undefined : rule === 'exact' || rule === 'atLeast' ? lineRaw / 20 : lineRaw / 240,
      lineRule: lineRaw == null ? undefined : rule === 'exact' ? 'exact' : rule === 'atLeast' ? 'atLeast' : 'auto',
      keepNext: onOff(kid(el, 'keepNext')), pageBreakBefore: onOff(kid(el, 'pageBreakBefore')), contextualSpacing: onOff(kid(el, 'contextualSpacing')),
      shading: hex(attr(kid(el, 'shd'), 'fill')),
      borders: Object.keys(borders).length ? (borders as Edges<Border>) : undefined,
      tabs: tabs.length ? tabs : undefined,
      numId: attr(kid(numPr, 'numId'), 'val'), ilvl: num(kid(numPr, 'ilvl'), 'val'),
    });
  };

  interface TableLook { borders: ReturnType<typeof readEdges>; margins: Edges<number>; cellShading?: string; rPr: RunProps; pPr: ParaProps; }
  interface Style { basedOn?: string; pPr: ParaProps; rPr: RunProps; table?: TableLook; cond: Record<string, TableLook>; }
  const readTableLook = (tblPr?: El, tcPr?: El, rPr?: El, pPr?: El): TableLook => {
    const mar = kid(tblPr, 'tblCellMar');
    return {
      borders: { ...readEdges(kid(tblPr, 'tblBorders')), ...readEdges(kid(tcPr, 'tcBorders')) },
      margins: defined({ top: twips(kid(mar, 'top'), 'w'), bottom: twips(kid(mar, 'bottom'), 'w'), left: twips(kid(mar, 'left') ?? kid(mar, 'start'), 'w'), right: twips(kid(mar, 'right') ?? kid(mar, 'end'), 'w') }),
      cellShading: hex(attr(kid(tcPr, 'shd'), 'fill')), rPr: readRPr(rPr), pPr: readPPr(pPr),
    };
  };
  const stylesEl = parse(await text('word/styles.xml'));
  const styles = new Map<string, Style>();
  let defaultPara: string | undefined;
  for (const s of kids(stylesEl, 'style')) {
    const id = attr(s, 'styleId') ?? '';
    if (attr(s, 'type') === 'paragraph' && attr(s, 'default') === '1') defaultPara = id;
    const cond: Record<string, TableLook> = {};
    for (const c of kids(s, 'tblStylePr')) cond[attr(c, 'type') ?? ''] = readTableLook(kid(c, 'tblPr'), kid(c, 'tcPr'), kid(c, 'rPr'), kid(c, 'pPr'));
    styles.set(id, {
      basedOn: attr(kid(s, 'basedOn'), 'val'), pPr: readPPr(kid(s, 'pPr')), rPr: readRPr(kid(s, 'rPr')), cond,
      table: attr(s, 'type') === 'table' ? readTableLook(kid(s, 'tblPr'), kid(s, 'tcPr')) : undefined,
    });
  }
  const chain = (id?: string): Style[] => {
    const out: Style[] = [];
    for (let s = id ? styles.get(id) : undefined, guard = 0; s && guard < 20; s = s.basedOn ? styles.get(s.basedOn) : undefined, guard++) out.unshift(s);
    return out;
  };
  const docDefaults = kid(stylesEl, 'docDefaults');
  const baseR: RunProps = { font: 'Calibri', size: 10, ...readRPr(path(docDefaults, 'rPrDefault', 'rPr')) };
  const baseP: ParaProps = readPPr(path(docDefaults, 'pPrDefault', 'pPr'));
  const mergeP = (...ps: ParaProps[]): ParaProps => Object.assign({}, ...ps);

  // ---- 编号 ----
  interface Level { start: number; fmt: string; text: string; suffix: 'tab' | 'space' | 'nothing'; pPr: ParaProps; rPr: RunProps; }
  const numbering = parse(await text('word/numbering.xml'));
  const readLevel = (l: El): Level => {
    const suff = attr(kid(l, 'suff'), 'val');
    return { start: num(kid(l, 'start'), 'val') ?? 1, fmt: attr(kid(l, 'numFmt'), 'val') ?? 'decimal', text: attr(kid(l, 'lvlText'), 'val') ?? '', suffix: suff === 'space' ? 'space' : suff === 'nothing' ? 'nothing' : 'tab', pPr: readPPr(kid(l, 'pPr')), rPr: readRPr(kid(l, 'rPr')) };
  };
  const abstracts = new Map<string, Map<number, Level>>();
  for (const a of kids(numbering, 'abstractNum')) abstracts.set(attr(a, 'abstractNumId') ?? '', new Map(kids(a, 'lvl').map((l) => [num(l, 'ilvl') ?? 0, readLevel(l)])));
  const nums = new Map<string, { abs: string; levels: Map<number, Level>; restart: Map<number, number> }>();
  for (const n of kids(numbering, 'num')) {
    const abs = attr(kid(n, 'abstractNumId'), 'val') ?? '';
    const levels = new Map(abstracts.get(abs) ?? []), restart = new Map<number, number>();
    for (const o of kids(n, 'lvlOverride')) {
      const il = num(o, 'ilvl') ?? 0;
      if (kid(o, 'lvl')) levels.set(il, readLevel(kid(o, 'lvl')!));
      const so = num(kid(o, 'startOverride'), 'val');
      if (so != null) restart.set(il, so);
    }
    nums.set(attr(n, 'numId') ?? '', { abs, levels, restart });
  }
  const counters = new Map<string, number[]>(); // 按 abstractNum 计数：同一个列表定义的多个 num 连续编号
  const seenNum = new Set<string>();
  const formatNumber = (n: number, fmt: string): string => {
    const alpha = (k: number) => { let s = ''; for (; k > 0; k = Math.floor((k - 1) / 26)) s = String.fromCharCode(97 + ((k - 1) % 26)) + s; return s; };
    const roman = (k: number) => [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']].reduce((s, [v, r]) => { while (k >= (v as number)) { s += r; k -= v as number; } return s; }, '');
    switch (fmt) {
      case 'lowerLetter': return alpha(n); case 'upperLetter': return alpha(n).toUpperCase();
      case 'lowerRoman': return roman(n); case 'upperRoman': return roman(n).toUpperCase();
      case 'decimalZero': return n < 10 ? `0${n}` : String(n); case 'none': return '';
      default: return String(n);
    }
  };
  // 项目符号常用 Symbol / Wingdings 的私有区字符，换成普通字体里有的
  const bulletChar = (s: string) => s.replace(/[\uf000-\uf0ff]/g, (c) => ({ '\uf0b7': '•', '\uf0a7': '▪', '\uf0d8': '➢', '\uf0fc': '✓', '\uf0a8': '◆', '\uf076': '❖' }[c] ?? '•')).replace(/^o$/, '◦');
  const marker = (numId: string, ilvl: number): { level: Level; text: string } | undefined => {
    const def = nums.get(numId), level = def?.levels.get(ilvl);
    if (!def || !level || numId === '0') return undefined;
    const c = counters.get(def.abs) ?? [];
    counters.set(def.abs, c);
    if (!seenNum.has(numId)) { seenNum.add(numId); for (const [il, v] of def.restart) c[il] = v - 1; }
    c[ilvl] = (c[ilvl] ?? level.start - 1) + 1;
    for (let d = ilvl + 1; d < 9; d++) delete c[d];
    for (let d = 0; d < ilvl; d++) if (c[d] == null) c[d] = def.levels.get(d)?.start ?? 1;
    if (level.fmt === 'bullet') return { level, text: bulletChar(level.text) };
    return { level, text: level.text.replace(/%(\d)/g, (_, d) => { const il = Number(d) - 1; return formatNumber(c[il] ?? 1, il === ilvl ? level.fmt : def.levels.get(il)?.fmt ?? 'decimal'); }) };
  };

  // ---- 正文 ----
  const media = new Map<string, Uint8Array>();
  const loadMedia = async (p: string) => { if (!media.has(p)) { const f = zip.file(p); if (f) media.set(p, await f.async('uint8array')); } return media.has(p); };
  const footnoteMarks = new Map<string, string>();

  interface Ctx { rels: Map<string, { target: string; external: boolean }>; tableR?: RunProps; tableP?: ParaProps; }

  async function readImage(drawing: El, ctx: Ctx): Promise<ImageRef | undefined> {
    const box = kid(drawing, 'inline') ?? kid(drawing, 'anchor');
    const blip = box ? descend(box, 'blip')[0] : undefined;
    const rel = ctx.rels.get(attr(blip, 'embed') ?? '');
    const ext = kid(box, 'extent');
    if (!box || !rel || rel.external || !(await loadMedia(rel.target))) return undefined;
    const image: ImageRef = { path: rel.target, width: (num(ext, 'cx') ?? 0) / EMU, height: (num(ext, 'cy') ?? 0) / EMU };
    if (box.localName === 'anchor') {
      const posH = kid(box, 'positionH'), posV = kid(box, 'positionV');
      const hAlign = kid(posH, 'align')?.textContent ?? undefined;
      if (kid(box, 'wrapNone')) {
        image.float = { mode: 'absolute', behind: attr(box, 'behindDoc') === '1', relX: attr(posH, 'relativeFrom'), relY: attr(posV, 'relativeFrom'),
          x: Number(kid(posH, 'posOffset')?.textContent ?? 0) / EMU, y: Number(kid(posV, 'posOffset')?.textContent ?? 0) / EMU, align: hAlign as any };
      } else image.float = { mode: 'block', align: hAlign === 'center' || hAlign === 'right' ? hAlign : Number(kid(posH, 'posOffset')?.textContent ?? 0) / EMU > 200 ? 'right' : 'left' };
    }
    return image;
  }

  async function readParagraph(p: El, ctx: Ctx, extra: Block[]): Promise<Paragraph> {
    const pPrEl = kid(p, 'pPr');
    const direct = readPPr(pPrEl);
    const styleChain = chain(direct.styleId ?? defaultPara);
    let props = mergeP(baseP, ctx.tableP ?? {}, ...styleChain.map((s) => s.pPr), direct);
    const paraR: RunProps = Object.assign({}, baseR, ctx.tableR ?? {}, ...styleChain.map((s) => s.rPr));

    let mark: Paragraph['marker'];
    if (props.numId != null) {
      const m = marker(props.numId, props.ilvl ?? 0);
      if (m) {
        // 缩进的优先级：编号写在段落上时，直接格式 > 编号级别 > 样式；编号来自样式（如 List Bullet）时，样式自己的缩进说了算
        const levelP = defined({ indLeft: m.level.pPr.indLeft, firstLine: m.level.pPr.firstLine, tabs: m.level.pPr.tabs });
        const stylesP = styleChain.map((s) => s.pPr);
        props = direct.numId != null ? mergeP(baseP, ctx.tableP ?? {}, ...stylesP, levelP, direct) : mergeP(baseP, ctx.tableP ?? {}, levelP, ...stylesP, direct);
        const bulletFont = m.level.fmt === 'bullet' ? { font: undefined } : {};
        if (m.text) mark = { text: m.text, suffix: m.level.suffix, props: defined({ ...paraR, ...readRPr(kid(pPrEl, 'rPr')), ...m.level.rPr, ...bulletFont, underline: false }) as RunProps };
        if (mark && !mark.props.font) mark.props.font = paraR.font;
      }
    }

    const inlines: Inline[] = [];
    let field: { instr: string; result: boolean } | null = null;
    const runProps = (r: El): RunProps => {
      const direct = readRPr(kid(r, 'rPr'));
      const charStyle = attr(path(r, 'rPr', 'rStyle'), 'val');
      return Object.assign({}, paraR, ...chain(charStyle).map((s) => s.rPr), direct);
    };
    const pushText = (t: string, props: RunProps, link?: string) => { if (t && !props.hidden) inlines.push({ type: 'text', text: t, props, link }); };

    const walk = async (parent: El, link?: string) => {
      for (const c of kids(parent)) {
        switch (c.localName) {
          case 'r': {
            const props = runProps(c);
            for (const e of kids(c)) {
              if (e.localName === 'fldChar') {
                const type = attr(e, 'fldCharType');
                if (type === 'begin') field = { instr: '', result: false };
                else if (type === 'separate' && field) {
                  field.result = true;
                  const kind = /^\s*(PAGE|NUMPAGES)\b/.exec(field.instr)?.[1] as 'PAGE' | 'NUMPAGES' | undefined;
                  if (kind) { inlines.push({ type: 'field', kind, props }); field.instr = 'SKIP'; }
                } else if (type === 'end') field = null;
                continue;
              }
              if (e.localName === 'instrText') { if (field && !field.result) field.instr += e.textContent ?? ''; continue; }
              if (field && (!field.result || field.instr === 'SKIP')) continue; // 域代码本身不显示；页码域的旧结果用实时页码代替
              switch (e.localName) {
                case 't': pushText(e.textContent ?? '', props, link); break;
                case 'tab': inlines.push({ type: 'tab', props }); break;
                case 'br': case 'cr': inlines.push({ type: 'break', kind: attr(e, 'type') === 'page' ? 'page' : 'line' }); break;
                case 'noBreakHyphen': pushText('-', props, link); break;
                case 'sym': pushText(bulletChar(String.fromCharCode(parseInt(attr(e, 'char') ?? 'F0B7', 16))), props, link); break;
                case 'footnoteReference': { const id = attr(e, 'id') ?? ''; if (!footnoteMarks.has(id)) footnoteMarks.set(id, String(footnoteMarks.size + 1)); pushText(footnoteMarks.get(id)!, { ...props, vertAlign: 'superscript' }); break; }
                case 'drawing': { const im = await readImage(e, ctx); if (im) inlines.push({ type: 'image', image: im }); await readTextBoxes(e, ctx, extra); break; }
                case 'AlternateContent': {
                  const choice = kid(e, 'Choice'), fallback = kid(e, 'Fallback');
                  const drawing = choice ? descend(choice, 'drawing')[0] : undefined;
                  const im = drawing ? await readImage(drawing, ctx) : undefined;
                  if (im) inlines.push({ type: 'image', image: im });
                  await readTextBoxes(choice ?? fallback ?? e, ctx, extra);
                  break;
                }
                case 'pict': await readTextBoxes(e, ctx, extra); break;
              }
            }
            break;
          }
          case 'hyperlink': { const rel = ctx.rels.get(attr(c, 'id') ?? ''); await walk(c, rel?.external ? rel.target : undefined); break; }
          case 'fldSimple': {
            const kind = /^\s*(PAGE|NUMPAGES)\b/.exec(attr(c, 'instr') ?? '')?.[1] as 'PAGE' | 'NUMPAGES' | undefined;
            if (kind) inlines.push({ type: 'field', kind, props: kid(c, 'r') ? runProps(kid(c, 'r')!) : paraR }); else await walk(c, link);
            break;
          }
          case 'ins': case 'smartTag': case 'moveTo': await walk(c, link); break;
          case 'sdt': if (kid(c, 'sdtContent')) await walk(kid(c, 'sdtContent')!, link); break;
        }
      }
    };
    await walk(p);

    const para: Paragraph = { type: 'p', props, inlines, marker: mark };
    // 空段落的高度取段落标记的字号
    if (!inlines.length) para.inlines.push({ type: 'text', text: '', props: Object.assign({}, paraR, readRPr(kid(pPrEl, 'rPr'))) });
    const sect = kid(pPrEl, 'sectPr');
    if (sect) para.sectionEnd = await readSection(sect, ctx);
    return para;
  }

  /** 文本框 / 形状里的文字：降级成跟在当前段落后面的普通段落 */
  async function readTextBoxes(el: El, ctx: Ctx, extra: Block[]) {
    for (const box of descend(el, 'txbxContent')) extra.push(...(await readBlocks(box, ctx)));
  }

  async function readTable(tbl: El, ctx: Ctx): Promise<Table> {
    const tblPr = kid(tbl, 'tblPr');
    const styleChain = chain(attr(kid(tblPr, 'tblStyle'), 'val'));
    const look = attr(kid(tblPr, 'tblLook'), 'val');
    const lookBits = look ? parseInt(look, 16) : 0x04a0;
    const lookOn = (name: string, bit: number, dflt: boolean) => { const v = attr(kid(tblPr, 'tblLook'), name); return v != null ? v === '1' : look ? !!(lookBits & bit) : dflt; };
    const useFirstRow = lookOn('firstRow', 0x20, true), useBands = !lookOn('noHBand', 0x200, false), useFirstCol = lookOn('firstColumn', 0x80, false), useLastRow = lookOn('lastRow', 0x40, false);
    const own = readTableLook(tblPr);
    const base: TableLook = { borders: {}, margins: { left: 5.4, right: 5.4, top: 0, bottom: 0 }, rPr: {}, pPr: {} };
    for (const s of styleChain) if (s.table) { Object.assign(base.borders, s.table.borders); Object.assign(base.margins, s.table.margins); base.cellShading = s.table.cellShading ?? base.cellShading; }
    Object.assign(base.borders, own.borders); Object.assign(base.margins, own.margins);
    const styleR: RunProps = Object.assign({}, ...styleChain.map((s) => s.rPr)), styleP: ParaProps = mergeP(...styleChain.map((s) => s.pPr));
    const condOf = (type: string) => styleChain.map((s) => s.cond[type]).filter(Boolean) as TableLook[];

    let grid = kids(kid(tbl, 'tblGrid'), 'gridCol').map((g) => twips(g, 'w') ?? 0);
    const trs = kids(tbl, 'tr');
    const rows: Row[] = [];
    for (let ri = 0; ri < trs.length; ri++) {
      const tr = trs[ri], trPr = kid(tr, 'trPr'), h = kid(trPr, 'trHeight');
      const conds = [
        ...(useBands ? condOf((ri - (useFirstRow ? 1 : 0)) % 2 === 0 ? 'band1Horz' : 'band2Horz') : []),
        ...(useFirstRow && ri === 0 ? condOf('firstRow') : []), ...(useLastRow && ri === trs.length - 1 && ri > 0 ? condOf('lastRow') : []),
      ];
      const cells: Cell[] = [];
      const tcs = kids(tr, 'tc');
      let col = num(kid(trPr, 'gridBefore'), 'val') ?? 0;
      if (col) cells.push({ blocks: [], span: col, borders: { top: null, bottom: null, left: null, right: null }, margins: { top: 0, bottom: 0, left: 0, right: 0 } });
      for (let ci = 0; ci < tcs.length; ci++) {
        const tc = tcs[ci], tcPr = kid(tc, 'tcPr');
        const span = num(kid(tcPr, 'gridSpan'), 'val') ?? 1;
        const cellConds = [...conds, ...(useFirstCol && ci === 0 ? condOf('firstCol') : [])];
        const vm = kid(tcPr, 'vMerge');
        const direct = readEdges(kid(tcPr, 'tcBorders'));
        const lastCol = ci === tcs.length - 1, lastRow = ri === trs.length - 1;
        // 单元格四条边：直接格式 > 条件格式 > 表格边框（外框 / 内部线）
        const tb = Object.assign({}, base.borders, ...cellConds.map((c) => c.borders));
        const pick = (side: 'top' | 'bottom' | 'left' | 'right', outer: boolean, inner: 'insideH' | 'insideV') => (direct[side] !== undefined ? direct[side] : outer ? tb[side] : tb[inner]) ?? null;
        const mar = kid(tcPr, 'tcMar');
        const va = attr(kid(tcPr, 'vAlign'), 'val');
        const condR: RunProps = Object.assign({}, ...cellConds.map((c) => c.rPr)), condP: ParaProps = mergeP(...cellConds.map((c) => c.pPr));
        cells.push({
          span, vMerge: vm ? (attr(vm, 'val') === 'restart' ? 'restart' : 'continue') : undefined,
          shading: hex(attr(kid(tcPr, 'shd'), 'fill')) ?? cellConds.map((c) => c.cellShading).filter(Boolean).pop() ?? base.cellShading,
          borders: { top: pick('top', ri === 0, 'insideH'), bottom: pick('bottom', lastRow, 'insideH'), left: pick('left', ci === 0 && !col, 'insideV'), right: pick('right', lastCol, 'insideV') },
          margins: { top: twips(kid(mar, 'top'), 'w') ?? base.margins.top ?? 0, bottom: twips(kid(mar, 'bottom'), 'w') ?? base.margins.bottom ?? 0, left: twips(kid(mar, 'left') ?? kid(mar, 'start'), 'w') ?? base.margins.left ?? 5.4, right: twips(kid(mar, 'right') ?? kid(mar, 'end'), 'w') ?? base.margins.right ?? 5.4 },
          vAlign: va === 'center' ? 'center' : va === 'bottom' ? 'bottom' : 'top',
          blocks: await readBlocks(tc, { ...ctx, tableR: { ...ctx.tableR, ...styleR, ...condR }, tableP: mergeP(ctx.tableP ?? {}, styleP, condP) }),
        });
        col += span;
      }
      if (!grid.length) grid = new Array(col).fill(0);
      rows.push({ cells, height: twips(h, 'val'), exact: attr(h, 'hRule') === 'exact', header: onOff(kid(trPr, 'tblHeader')) });
    }
    // 没有 tblGrid 宽度时，用第一行的 tcW 兜底
    if (grid.every((g) => !g) && trs[0]) {
      const ws = kids(trs[0], 'tc').flatMap((tc) => { const span = num(path(tc, 'tcPr', 'gridSpan'), 'val') ?? 1, w = (twips(path(tc, 'tcPr', 'tcW'), 'w') ?? 0) / span; return new Array(span).fill(w); });
      grid = grid.map((_, i) => ws[i] ?? 0);
    }
    const tblW = kid(tblPr, 'tblW'), jc = attr(kid(tblPr, 'jc'), 'val');
    return { type: 'tbl', grid, rows, indent: twips(kid(tblPr, 'tblInd'), 'w') ?? 0, align: jc === 'center' ? 'center' : jc === 'right' || jc === 'end' ? 'right' : 'left', widthPct: attr(tblW, 'type') === 'pct' ? (num(tblW, 'w') ?? 5000) / 5000 : undefined };
  }

  async function readBlocks(parent: El, ctx: Ctx): Promise<Block[]> {
    const out: Block[] = [];
    for (const c of kids(parent)) {
      if (c.localName === 'p') { const extra: Block[] = []; out.push(await readParagraph(c, ctx, extra), ...extra); }
      else if (c.localName === 'tbl') out.push(await readTable(c, ctx));
      else if (c.localName === 'sdt' && kid(c, 'sdtContent')) out.push(...(await readBlocks(kid(c, 'sdtContent')!, ctx)));
      else if (c.localName === 'ins' || c.localName === 'moveTo' || c.localName === 'customXml') out.push(...(await readBlocks(c, ctx)));
    }
    return out;
  }

  async function readSection(sect: El, ctx: Ctx): Promise<Section> {
    const sz = kid(sect, 'pgSz'), mar = kid(sect, 'pgMar');
    const section: Section = {
      width: twips(sz, 'w') ?? 612, height: twips(sz, 'h') ?? 792,
      margin: { top: Math.abs(twips(mar, 'top') ?? 72), bottom: Math.abs(twips(mar, 'bottom') ?? 72), left: twips(mar, 'left') ?? 72, right: twips(mar, 'right') ?? 72, header: twips(mar, 'header') ?? 36, footer: twips(mar, 'footer') ?? 36 },
      titlePage: !!kid(sect, 'titlePg'), continuous: attr(kid(sect, 'type'), 'val') === 'continuous',
    };
    for (const ref of [...kids(sect, 'headerReference'), ...kids(sect, 'footerReference')]) {
      const rel = ctx.rels.get(attr(ref, 'id') ?? ''), type = attr(ref, 'type') ?? 'default';
      if (!rel || type === 'even') continue;
      const root = parse(await text(rel.target));
      if (!root) continue;
      const blocks = await readBlocks(root, { rels: await readRels(rel.target) });
      const isHeader = ref.localName === 'headerReference';
      if (type === 'first') section[isHeader ? 'firstHeader' : 'firstFooter'] = blocks; else section[isHeader ? 'header' : 'footer'] = blocks;
    }
    return section;
  }

  const body = kid(docEl, 'body');
  const ctx: Ctx = { rels: await readRels('word/document.xml') };
  const blocks = await readBlocks(body!, ctx);
  const lastSect = kid(body, 'sectPr');
  const lastSection = lastSect ? await readSection(lastSect, ctx) : await readSection(docEl, ctx);

  // 脚注：正文里只留上标编号，内容统一放到文档末尾
  const footnotes: DocModel['footnotes'] = [];
  if (footnoteMarks.size) {
    const fnCtx: Ctx = { rels: await readRels('word/footnotes.xml') };
    for (const fn of kids(parse(await text('word/footnotes.xml')), 'footnote')) {
      const mark = footnoteMarks.get(attr(fn, 'id') ?? '');
      if (mark) footnotes.push({ mark, blocks: await readBlocks(fn, fnCtx) });
    }
    footnotes.sort((a, b) => Number(a.mark) - Number(b.mark));
  }
  const settings = parse(await text('word/settings.xml'));
  return { blocks, lastSection, footnotes, media, defaultTab: twips(kid(settings, 'defaultTabStop'), 'val') || 36 };
}

function normalize(p: string): string {
  const out: string[] = [];
  for (const part of p.split('/')) { if (part === '..') out.pop(); else if (part && part !== '.') out.push(part); }
  return out.join('/');
}

export class DocxError extends Error {
  constructor(public code: 'not-docx' | 'legacy-doc') { super(code); }
}
