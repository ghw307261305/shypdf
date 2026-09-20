// pdf.js 懒加载封装：只在需要渲染缩略图 / 转图片时才加载。
import type { PDFDocumentProxy } from 'pdfjs-dist';

let lib: typeof import('pdfjs-dist') | null = null;

// WebKit（也就是 iOS 上的所有浏览器）至今没实现 ReadableStream 的异步迭代，
// 而 pdf.js 6 的 getTextContent 里正是 `for await (const v of stream)`，
// 于是 iPhone 上一取文字就抛 "undefined is not a function"。补一个最小实现。
export function installStreamAsyncIterator() {
  if (typeof ReadableStream === 'undefined' || Symbol.asyncIterator in ReadableStream.prototype) return false;
  const values = function (this: ReadableStream, { preventCancel = false } = {}) {
    const reader = this.getReader();
    return {
      async next() {
        try {
          const r = await reader.read();
          if (r.done) reader.releaseLock();
          return r;
        } catch (err) {
          reader.releaseLock();
          throw err;
        }
      },
      async return(value?: unknown) {
        if (!preventCancel) await reader.cancel(value);
        reader.releaseLock();
        return { done: true, value };
      },
      [Symbol.asyncIterator]() { return this; },
    };
  };
  const desc = { value: values, writable: true, configurable: true };
  Object.defineProperty(ReadableStream.prototype, Symbol.asyncIterator, desc);
  Object.defineProperty(ReadableStream.prototype, 'values', desc);
  return true;
}
installStreamAsyncIterator();

/** Node 测试用：注入 pdfjs-dist 的 legacy 构建 */
export function setPdfjs(l: typeof import('pdfjs-dist')) { lib = l; }

export async function getPdfjs() {
  if (lib) return lib;
  lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  return lib;
}

export async function openWithPdfjs(file: File, password?: string): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({ data, password }).promise;
}

/** 渲染某页为 canvas。scale 相对于 72dpi；返回 canvas 供调用方导出。 */
export async function renderPage(doc: PDFDocumentProxy, pageIndex: number, opts: { scale?: number; maxWidth?: number } = {}) {
  const page = await doc.getPage(pageIndex + 1);
  let viewport = page.getViewport({ scale: opts.scale ?? 1 });
  if (opts.maxWidth && viewport.width > opts.maxWidth) {
    viewport = page.getViewport({ scale: (opts.scale ?? 1) * (opts.maxWidth / viewport.width) });
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
  page.cleanup();
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/jpeg' | 'image/png', quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob failed'))), type, quality);
  });
}
