# ShyPDF

**PDF tools that run entirely in your browser. Your files are never uploaded.**

→ **[shypdf.com](https://shypdf.com)** · 23 tools · 8 languages · free, no sign-up

Most online PDF tools upload your file to a server, process it there and send it back. ShyPDF sends the *code* to you instead: merging, compressing, OCR, encryption, even Word ↔ PDF conversion all happen inside the browser tab, on your own device. It is a static site — there is no backend that could receive a file.

## Don't trust us — verify

"We don't upload your files" is easy to say, so here is how to check it.

1. **Watch the network.** Open your browser's developer tools, switch to the **Network** tab and run any tool. You will see the page fetch its own scripts, WebAssembly and fonts. You will not see a request that carries your file.
2. **Read the response header.** Every page is served with a Content-Security-Policy that includes `connect-src 'self'` and `form-action 'self'`, so the browser itself refuses to let the page send data to any other origin:
   ```bash
   curl -sI https://shypdf.com/ | grep -i content-security-policy
   ```
   The policy lives in [`public/_headers`](public/_headers).
3. **Read the code.** Each tool is one file in [`src/tools/`](src/tools/).

**The one exception:** when a tool crashes, the page sends an automatic error report to `/api/error-report` on the same origin, handled by the small Worker in [`worker/`](worker/). It contains the tool name, the error message and stack, the build commit, UI language, browser, device memory, the file's *extension and size*, and the non-text options you picked. It never contains file contents, file names, passwords or anything you typed. The exact fields are in [`src/lib/report.ts`](src/lib/report.ts), and the [privacy policy](https://shypdf.com/privacy/) says the same thing.

## Tools

| | |
|---|---|
| **Organize & edit** | Merge · Split · Organize (reorder / rotate / delete) · Extract pages · Delete pages · Crop · Add page numbers · Add watermark · Edit (text, highlight, white-out) · Fill forms · Sign |
| **Convert** | PDF → Word · Word → PDF · JPG → PDF · PNG → PDF · PDF → JPG · PDF → PNG · PDF → Text |
| **Optimize** | Compress · OCR (9 languages) · Repair |
| **Security** | Protect (AES-256) · Unlock |

## How the harder ones work

- **Word → PDF without a server.** There is no LibreOffice behind this. [`src/lib/docx-read.ts`](src/lib/docx-read.ts) parses the .docx and [`src/lib/docx-layout.ts`](src/lib/docx-layout.ts) is a small layout engine that breaks lines and pages itself, so the output is real, selectable text. Calibri, Arial, Times New Roman and Courier New are replaced with metric-compatible open fonts (Carlito, Arimo, Tinos, Cousine) — identical glyph widths, so line and page breaks land where Word puts them. Fonts are subset with HarfBuzz compiled to WebAssembly before embedding.
- **PDF → Word is heuristic.** A PDF has no concept of a paragraph. [`src/lib/pdf-layout.ts`](src/lib/pdf-layout.ts) reconstructs paragraphs, headings, alignment, tables and two-column layouts from glyph positions, and a hand-written writer produces the .docx. It works well on documents exported from Word or Google Docs; scans need OCR first.
- **OCR keeps the original page.** Tesseract (WebAssembly) outputs only an invisible text layer, which is laid over the untouched page — the approach OCRmyPDF takes — so quality and file size barely change.
- **Encryption, decryption and repair** use [qpdf](https://github.com/qpdf/qpdf) compiled to WebAssembly — the unmodified [`@jspawn/qpdf-wasm`](https://www.npmjs.com/package/@jspawn/qpdf-wasm) build, pinned in `package-lock.json`. No binaries are checked into this repository.

## Limits, honestly

- 50 MB per file and 20 files at a time. The real ceiling is your device's memory; a huge scan on an old phone can run out.
- Word → PDF does not support columns, text wrapping around images, charts / SmartArt, right-to-left text or legacy `.doc`.
- Signatures are image signatures, not certificate-based digital signatures.
- Unlock PDF needs the password. It removes protection from files you are entitled to open; it does not crack anything.
- OCR and Word → PDF download their engine, language data and fonts on first use (a few MB; 5–10 MB for CJK fonts).

## Run it locally

```bash
npm install
npm run dev      # http://localhost:4321
npm test         # dictionary consistency, PDF tools, converters, OCR, qpdf
npm run build    # static site in dist/
```

Requires Node 22.12 or newer (Astro’s minimum). `npm run dev` / `build` / `test` first copy the large runtime assets (qpdf, Tesseract, fonts, HarfBuzz — about 60 MB) from `node_modules` into `public/vendor/` via [`scripts/vendor.mjs`](scripts/vendor.mjs).

## Host it yourself

`dist/` is a plain static site; any static host works.

- `public/_headers` (the CSP and cache headers) is in Cloudflare / Netlify format. On another host, set the same headers in its own configuration — the CSP is what makes "no upload" enforceable, so don't skip it.
- The error-report Worker is optional. Without it the reports fail silently and nothing else changes.
- Set your own domain in [`src/config/site.ts`](src/config/site.ts), and please use your own name and logo (see License).

## Project layout

```
src/tools/<slug>.ts      one module per tool (implements ToolModule in src/lib/types.ts)
src/scripts/tool-app.ts  the shared tool-page UI: pick files → options → result
src/lib/                 pdf.js / qpdf glue, docx reader + layout engine, PDF layout analysis, OCR, font subsetting
src/data/tools.ts        tool registry: slug, category, icon, related tools
src/i18n/                dictionaries for 8 languages (en is the source)
src/pages/               Astro pages; [...locale]/ is rendered once per language
public/_headers          CSP and cache headers
worker/                  the only server-side code: the error-report endpoint
test/                    Node tests + browser acceptance suites
```

## Translations

English is the source. Spanish, Portuguese, French, German, Japanese, Simplified and Traditional Chinese are machine-translated and have not been reviewed by native speakers — corrections are very welcome. Dictionaries are in [`src/i18n/locales/`](src/i18n/locales/); `npm test` checks that every language has the same keys and placeholders as English.

## License

The source code is licensed under [AGPL-3.0](LICENSE).

Not covered by that license: the ShyPDF name and logo, the guide articles in `src/pages/guides/`, and the tool-page articles in `src/i18n/content/`. If you deploy your own copy, give it a different name and logo and write your own articles. The UI dictionaries in `src/i18n/locales/` *are* covered, so a self-hosted copy works in all eight languages.

Third-party libraries and fonts keep their own licenses, listed at [shypdf.com/licenses](https://shypdf.com/licenses/) with the full texts in [`public/licenses/`](public/licenses/).
