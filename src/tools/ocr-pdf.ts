import { PDFDocument } from 'pdf-lib';
import type { ToolModule } from '@/lib/types';
import { stripExt } from '@/lib/files';
import { openWithPdfjs, renderPage, canvasToBlob } from '@/lib/pdfjs';
import { createOcrEngine, addTextLayer, tidyOcrText, type OcrEngine } from '@/lib/ocr';
import { t, th } from '@/lib/i18n-client';
import { UserError } from '@/lib/errors';

// 语言包在 public/vendor/tesseract/lang/（scripts/vendor.mjs 的 OCR_LANGS 要和这里一致）。
// 语言名用各自的写法，不用翻译。
const LANGS: { code: string; label: string; locale: string }[] = [
  { code: 'eng', label: 'English', locale: 'en' },
  { code: 'spa', label: 'Español', locale: 'es' },
  { code: 'por', label: 'Português', locale: 'pt' },
  { code: 'fra', label: 'Français', locale: 'fr' },
  { code: 'deu', label: 'Deutsch', locale: 'de' },
  { code: 'ita', label: 'Italiano', locale: 'it' },
  { code: 'jpn', label: '日本語', locale: 'ja' },
  { code: 'chi_sim', label: '简体中文', locale: 'zh' },
  { code: 'chi_tra', label: '繁體中文', locale: 'zh-tw' },
];

const DPI = 200;          // 识别用的渲染分辨率：再高收益很小，耗时和内存却线性涨
const MAX_SIDE = 4200;    // 超大页面（海报、图纸）按这个上限缩，避免手机上 canvas 爆内存
const HAS_TEXT = 25;      // 一页已有这么多可选中的字符，就当它不是扫描页

const mod: ToolModule = {
  mode: 'files',
  optionsHtml: () => {
    // 认站点语言（data-locale：'zh' / 'zh-tw'）而不是 html lang —— lang 是 zh-Hans / zh-Hant，截两位分不出简繁
    const siteLocale = typeof document !== 'undefined' ? document.documentElement.dataset.locale || 'en' : 'en';
    const preferred = LANGS.find((l) => l.locale === siteLocale)?.code ?? 'eng';
    return `
    <div class="opt-group">
      <label for="opt-lang">${th('ocr-pdf.language')}</label>
      <select id="opt-lang" name="lang">${LANGS.map((l) => `<option value="${l.code}"${l.code === preferred ? ' selected' : ''}>${l.label}</option>`).join('')}</select>
      <label class="check" data-show-when="lang!=eng"><input type="checkbox" name="english" checked> ${th('ocr-pdf.alsoEnglish')}</label>
    </div>
    <fieldset class="opt-group">
      <legend>${th('ocr-pdf.output')}</legend>
      <label class="check check-top"><input type="radio" name="output" value="pdf" checked> ${th('ocr-pdf.outPdf')}</label>
      <label class="check"><input type="radio" name="output" value="txt"> ${th('ocr-pdf.outTxt')}</label>
    </fieldset>
    <div class="opt-group">
      <label class="check check-top"><input type="checkbox" name="skipText" checked> ${th('ocr-pdf.skipText')}</label>
      <p class="hint">${th('ocr-pdf.hint')}</p>
    </div>`;
  },
  async run(files, options, ctx) {
    const file = files[0];
    const lang = String(options.get('lang') || 'eng');
    const langs = options.get('english') && lang !== 'eng' ? [lang, 'eng'] : [lang];
    const wantPdf = options.get('output') !== 'txt';
    const skipText = !!options.get('skipText');

    const view = await openWithPdfjs(file);
    let engine: OcrEngine | null = null;
    try {
      const n = view.numPages;
      const texts: string[] = new Array(n).fill('');
      const layers: (Uint8Array | null)[] = new Array(n).fill(null);

      // 先找出真正需要识别的页
      const todo: number[] = [];
      for (let i = 0; i < n; i++) {
        if (skipText) {
          const page = await view.getPage(i + 1);
          const existing = (await page.getTextContent()).items.map((it: any) => ('str' in it ? it.str + (it.hasEOL ? '\n' : '') : '')).join('');
          page.cleanup();
          if (existing.replace(/\s/g, '').length >= HAS_TEXT) { texts[i] = existing; continue; }
        }
        todo.push(i);
      }
      if (!todo.length) throw new UserError(t('ocr-pdf.nothingToDo'));

      ctx.progress(t('ocr-pdf.loading'), 0.03);
      const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
      const workers = Math.max(1, Math.min(3, Math.floor(cores / 2), todo.length));
      engine = await createOcrEngine(langs, workers);

      // 渲染在主线程串行做（pdf.js），识别在 worker 里并行；同时在飞的页数不超过 worker 数，内存才可控
      let done = 0;
      const report = () => ctx.progress(t('ocr-pdf.recognizing', { i: Math.min(done + 1, todo.length), n: todo.length }), 0.05 + 0.9 * (done / todo.length));
      report();
      const jobs: Promise<void>[] = [];
      const inflight = new Set<Promise<void>>();
      for (const i of todo) {
        const page = await view.getPage(i + 1);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(DPI / 72, MAX_SIDE / Math.max(base.width, base.height));
        const canvas = await renderPage(view, i, { scale });
        const image = await canvasToBlob(canvas, 'image/png');
        canvas.width = canvas.height = 0; // 立刻释放位图
        const job = engine.recognize(image, scale * 72, wantPdf).then((r) => {
          texts[i] = tidyOcrText(r.text);
          layers[i] = r.pdf;
          done++;
          report();
        });
        jobs.push(job);
        inflight.add(job);
        job.then(() => inflight.delete(job), () => inflight.delete(job));
        if (inflight.size > workers) await Promise.race(inflight);
      }
      await Promise.all(jobs);

      if (!wantPdf) {
        const body = texts.map((s, i) => (n > 1 ? `--- ${t('app.page', { n: i + 1 })} ---\n` : '') + s.trim()).join('\n\n');
        return [{ name: `${stripExt(file.name)}.txt`, blob: new Blob(['\ufeff' + body + '\n'], { type: 'text/plain;charset=utf-8' }) }];
      }

      ctx.progress(t('ocr-pdf.writing'), 0.97);
      const doc = await PDFDocument.load(await file.arrayBuffer());
      const pages = doc.getPages();
      for (const i of todo) if (layers[i]) await addTextLayer(doc, pages[i], layers[i]!);
      const bytes = await doc.save({ useObjectStreams: true });
      return [{ name: `${stripExt(file.name)}_ocr.pdf`, blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }) }];
    } finally {
      await engine?.terminate();
      view.loadingTask.destroy();
    }
  },
};
export default mod;
