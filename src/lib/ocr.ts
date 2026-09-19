// OCR 封装（tesseract.js）。引擎、WASM 核心和语言包都在 public/vendor/tesseract/（scripts/vendor.mjs 拷贝），同源加载，不走 CDN。
// 做法和 OCRmyPDF 一样：让 Tesseract 只输出「隐形文字层」的单页 PDF（textonly_pdf），再叠到原页面上。
// 原页面的内容一个字节都不改，所以画质不变、文件只大一点点；文字层自带 Tesseract 的 glyphless 字体，任何语言都能选中和搜索。
import type { PDFDocument, PDFPage } from 'pdf-lib';
import type { Worker } from 'tesseract.js';
import { VENDOR_BASE } from './vendor';
import { pageView } from './pdfview';

export interface OcrEngineOptions {
  /** Node 测试用：整个替换掉传给 tesseract.js 的选项（浏览器的路径在 Node 里没有意义） */
  workerOptions?: Record<string, unknown>;
}

export interface OcrPageResult { text: string; pdf: Uint8Array | null; confidence: number; }

export interface OcrEngine {
  /** image：PNG / JPEG 字节、Blob 或 canvas；dpi：这张图的渲染分辨率，决定文字层的页面尺寸 */
  recognize: (image: unknown, dpi: number, wantPdf: boolean) => Promise<OcrPageResult>;
  terminate: () => Promise<void>;
}

/** langs 如 ['jpn', 'eng']。workers > 1 时并行识别多页。 */
export async function createOcrEngine(langs: string[], workers = 1, opts: OcrEngineOptions = {}): Promise<OcrEngine> {
  const { createWorker } = await import('tesseract.js');
  const base = VENDOR_BASE + 'tesseract/';
  const make = () => createWorker(langs, 1, opts.workerOptions ?? {
    workerPath: base + 'worker.min.js',
    corePath: base + 'core',
    langPath: base + 'lang',
    gzip: true,
    // 不让 tesseract.js 把语言包另存一份到 IndexedDB：隐私政策写了本站不用本地存储；重复访问靠浏览器的 HTTP 缓存（/vendor/* 缓存 7 天）
    cacheMethod: 'none',
    // 默认会把 worker 包成 blob: URL 再 importScripts；直接用同源脚本更简单，也不依赖 CSP 对 blob 的放行
    workerBlobURL: false,
  });
  const pool: Worker[] = [];
  try {
    // 第一个 worker 先起：它会下载并缓存语言包，后面的直接读缓存
    pool.push(await make());
    for (let i = 1; i < workers; i++) pool.push(await make());
    for (const w of pool) await w.setParameters({ textonly_pdf: '1' } as any);
  } catch (e) {
    await Promise.all(pool.map((w) => w.terminate()));
    throw e;
  }
  const idle = [...pool];
  const waiting: ((w: Worker) => void)[] = [];
  const acquire = () => new Promise<Worker>((res) => { const w = idle.pop(); w ? res(w) : waiting.push(res); });
  const release = (w: Worker) => { const next = waiting.shift(); next ? next(w) : idle.push(w); };

  return {
    async recognize(image, dpi, wantPdf) {
      const w = await acquire();
      try {
        await w.setParameters({ user_defined_dpi: String(Math.round(dpi)) });
        const { data } = await w.recognize(image as any, { pdfTitle: 'OCR' }, { text: true, pdf: wantPdf });
        return { text: data.text ?? '', pdf: data.pdf ? new Uint8Array(data.pdf) : null, confidence: data.confidence };
      } finally { release(w); }
    },
    terminate: async () => { await Promise.all(pool.map((w) => w.terminate())); },
  };
}

/**
 * 把 Tesseract 输出的单页「纯文字层」PDF 叠到 page 上，铺满页面的可见区域。
 * 渲染图是按页面「显示方向」（已应用 /Rotate）出的，而 pdf-lib 的坐标系是未旋转的，所以旋转过的页面要把文字层转回去。
 */
export async function addTextLayer(doc: PDFDocument, page: PDFPage, textPdf: Uint8Array) {
  const [layer] = await doc.embedPdf(textPdf, [0]);
  const view = pageView(page);
  page.drawPage(layer, { ...view.toUser(0, 0), rotate: view.rotate, xScale: view.width / layer.width, yScale: view.height / layer.height });
}

/** Tesseract 在 CJK 字符之间会插空格；导出纯文本时去掉 */
export function tidyOcrText(text: string): string {
  const cjk = '\\u3000-\\u30ff\\u3400-\\u9fff\\uf900-\\ufaff\\uff00-\\uffef';
  return text.replace(new RegExp(`([${cjk}]) +(?=[${cjk}])`, 'g'), '$1').replace(/[ \t]+\n/g, '\n').trim();
}
