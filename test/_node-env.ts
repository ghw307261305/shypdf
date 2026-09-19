// Node 测试的公共环境：浏览器里由页面提供的东西（字典、DOMParser、public/vendor 的 fetch、pdf.js）在这里换成 Node 版本。
import { readFile } from 'node:fs/promises';
import { DOMParser } from '@xmldom/xmldom';
import { setClientDict } from '@/lib/i18n-client';
import { setVendorLoader } from '@/lib/vendor';
import { setPdfjs } from '@/lib/pdfjs';
import en from '@/i18n/locales/en';

setClientDict(en.client);
(globalThis as any).DOMParser = DOMParser;
setVendorLoader(async (path) => new Uint8Array(await readFile(new URL(`../public/vendor/${path}`, import.meta.url))));
// @ts-ignore legacy 构建没有类型声明
setPdfjs(await import('pdfjs-dist/legacy/build/pdf.mjs'));
