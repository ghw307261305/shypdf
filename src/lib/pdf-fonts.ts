// Word 转 PDF 的字体：文档里写的是 Calibri / Arial / Times New Roman，这些字体我们不能分发，
// 用「度量兼容」的开源字体代替（每个字的宽度一样，所以换行位置、页数和 Word 里基本一致）：
//   Calibri → Carlito，Arial → Arimo，Times New Roman → Tinos，Courier New → Cousine；中日韩用 Noto Sans JP / SC / KR。
// 字体文件在 public/vendor/fonts/（scripts/vendor.mjs），用到哪个下载哪个；写进 PDF 前用 HarfBuzz 裁成只含用到的字。
import type { PDFDocument, PDFFont } from 'pdf-lib';
import { loadVendor } from './vendor';
import { subsetFont } from './hb-subset';

export type Family = 'Carlito' | 'Arimo' | 'Tinos' | 'Cousine';

const SERIF = /times|georgia|garamond|cambria|palatino|book antiqua|bookman|century|baskerville|didot|constantia|minion|serif|mincho|明朝|simsun|宋体|songti|batang|roman/i;
const MONO = /courier|consolas|mono|menlo|lucida console|source code/i;
const ARIAL = /arial|helvetica|verdana|tahoma|segoe|trebuchet|gothic|ゴシック|meiryo|メイリオ|yahei|雅黑|simhei|黑体|heiti|malgun|dotum|gulim|liberation sans|roboto|open sans|inter/i;

export function mapFamily(name?: string): Family {
  if (!name) return 'Carlito';
  if (MONO.test(name)) return 'Cousine';
  if (/sans/i.test(name) && !/comic/i.test(name)) return /calibri|carlito/i.test(name) ? 'Carlito' : 'Arimo';
  if (SERIF.test(name)) return 'Tinos';
  if (ARIAL.test(name)) return 'Arimo';
  return 'Carlito';
}

const CJK_FACES = { jp: 'NotoSansJP-400Regular', sc: 'NotoSansSC-400Regular', kr: 'NotoSansKR-400Regular' } as const;
const FALLBACK_LATIN = 'Arimo-400Regular';

const isKana = (cp: number) => cp >= 0x3040 && cp <= 0x30ff;
const isHangul = (cp: number) => (cp >= 0xac00 && cp <= 0xd7af) || (cp >= 0x1100 && cp <= 0x11ff) || (cp >= 0x3130 && cp <= 0x318f);
export const isCjk = (cp: number) => (cp >= 0x2e80 && cp <= 0x9fff) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xff00 && cp <= 0xffef) || (cp >= 0x20000 && cp <= 0x2ffff) || isHangul(cp);
const isSymbol = (cp: number) => cp >= 0x2000 && cp <= 0x2bff;

export class Face {
  readonly used = new Set<number>();
  private advances = new Map<number, number>();
  readonly ascent: number; readonly descent: number; readonly lineGap: number;
  constructor(readonly key: string, readonly bytes: Uint8Array, private font: any) {
    const upm = font.unitsPerEm;
    this.ascent = font.ascent / upm; this.descent = -font.descent / upm; this.lineGap = Math.max(0, font.lineGap / upm);
  }
  has(cp: number): boolean { return this.font.hasGlyphForCodePoint(cp); }
  /** 单个字的前进宽度（字号 1）。不做连字和字距调整：写 PDF 时也是逐字写，量和画完全一致。 */
  advance(cp: number): number {
    let a = this.advances.get(cp);
    if (a == null) { a = this.font.glyphForCodePoint(cp).advanceWidth / this.font.unitsPerEm; this.advances.set(cp, a!); }
    return a!;
  }
}

export interface Picked { face: Face; cp: number; synthBold: boolean; synthItalic: boolean; }

export class FontSet {
  private faces = new Map<string, Face>();
  private fallback = new Map<number, string | null>();
  private hasKana = false;

  private async load(key: string): Promise<Face> {
    let f = this.faces.get(key);
    if (!f) {
      const bytes = await loadVendor(`fonts/${key}.ttf`);
      const { default: fontkit } = await import('@pdf-lib/fontkit');
      f = new Face(key, bytes, (fontkit as any).create(bytes));
      this.faces.set(key, f);
    }
    return f;
  }

  static key(family: Family, bold?: boolean, italic?: boolean) { return `${family}-${bold ? '700Bold' : '400Regular'}${italic ? '_Italic' : ''}`; }

  /** 排版前调用：把文档用到的字体都下载好，并为主字体里没有的字找好替补。之后的 pick() 是同步的。 */
  async prepare(uses: { family: Family; bold?: boolean; italic?: boolean; text: string }[]) {
    this.hasKana = uses.some((u) => /[\u3040-\u30ff]/.test(u.text));
    for (const u of uses) {
      const face = await this.load(FontSet.key(u.family, u.bold, u.italic));
      for (const ch of u.text) {
        const cp = ch.codePointAt(0)!;
        if (cp < 0x20 || face.has(cp) || this.fallback.has(cp)) continue;
        let found: string | null = null;
        for (const key of this.candidates(cp)) if ((await this.load(key)).has(cp)) { found = key; break; }
        this.fallback.set(cp, found);
      }
    }
  }

  private candidates(cp: number): string[] {
    if (isHangul(cp)) return [CJK_FACES.kr];
    if (isKana(cp)) return [CJK_FACES.jp];
    // 汉字：文档里有假名就当日文，否则用简体中文字体（覆盖面最大）
    if (isCjk(cp)) return this.hasKana ? [CJK_FACES.jp, CJK_FACES.sc] : [CJK_FACES.sc, CJK_FACES.jp];
    return isSymbol(cp) ? [FALLBACK_LATIN, this.hasKana ? CJK_FACES.jp : CJK_FACES.sc] : [FALLBACK_LATIN];
  }

  /** 这个字该用哪个字体文件画。哪个字体都没有的字（emoji 等）换成 '?'。 */
  pick(family: Family, bold: boolean, italic: boolean, cp: number): Picked {
    const primary = this.faces.get(FontSet.key(family, bold, italic))!;
    if (primary.has(cp)) return { face: primary, cp, synthBold: false, synthItalic: false };
    const key = this.fallback.get(cp);
    const face = key ? this.faces.get(key) : undefined;
    if (!face) return { face: primary, cp: 0x3f, synthBold: false, synthItalic: false };
    // 替补字体只有常规体：粗体用描边、斜体用倾斜来模拟
    return { face, cp, synthBold: bold, synthItalic: italic };
  }

  canShow(family: Family, bold: boolean, italic: boolean, cp: number) { return this.pick(family, bold, italic, cp).cp === cp; }

  /** 把用到的字裁出来嵌进 PDF。返回每个字体的「字 → 4 位十六进制字形号」编码函数。 */
  async embed(doc: PDFDocument): Promise<Map<string, { font: PDFFont; hex: (cp: number) => string }>> {
    const { default: fontkit } = await import('@pdf-lib/fontkit');
    doc.registerFontkit(fontkit as any);
    const out = new Map<string, { font: PDFFont; hex: (cp: number) => string }>();
    for (const face of this.faces.values()) {
      if (!face.used.size) continue;
      const font = await doc.embedFont(await subsetFont(face.bytes, face.used), { subset: false });
      const cache = new Map<number, string>();
      out.set(face.key, { font, hex: (cp) => {
        let h = cache.get(cp);
        if (h == null) { h = font.encodeText(String.fromCodePoint(cp)).toString().slice(1, -1); cache.set(cp, h); }
        return h;
      } });
    }
    return out;
  }
}
