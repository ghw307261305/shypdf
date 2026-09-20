// 在 Node 里把 PDF 页渲染成像素，用来验收「画上去」的东西（水印、中文页码、签名、标注）。
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PROJ } from './lib.mjs';

const require = createRequire(path.join(PROJ, 'index.js'));
const { createCanvas } = require('@napi-rs/canvas');
let pdfjs = null;

export async function renderPage(file, pageIndex = 0, scale = 1.5) {
  pdfjs ??= await import(path.join(PROJ, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs'));
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await readFile(file)), useSystemFonts: false }).promise;
  const page = await doc.getPage(pageIndex + 1);
  const vp = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
  const out = { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, w: canvas.width, h: canvas.height, png: () => canvas.toBuffer('image/png') };
  await doc.loadingTask.destroy();
  return out;
}

/** 两次渲染的差异：改了多少像素、落在哪、分布在几条横带上 */
export async function inkDiff(before, after, pageIndex = 0, scale = 1.5) {
  const a = await renderPage(before, pageIndex, scale);
  const b = await renderPage(after, pageIndex, scale);
  if (a.w !== b.w || a.h !== b.h) return { sizeChanged: true, before: [a.w, a.h], after: [b.w, b.h] };
  let n = 0, x0 = a.w, y0 = a.h, x1 = -1, y1 = -1;
  const rowHit = new Array(a.h).fill(0), colHit = new Array(a.w).fill(0);
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
    const i = (y * a.w + x) * 4;
    if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 30) {
      n++; rowHit[y]++; colHit[x]++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const bands = (hits) => { let c = 0, on = false; for (const v of hits) { if (v > 0 && !on) { c++; on = true; } else if (v === 0 && on) on = false; } return c; };
  return { w: a.w, h: a.h, changed: n, ratio: n / (a.w * a.h), bbox: x1 < 0 ? null : { x0, y0, x1, y1 },
    rel: x1 < 0 ? null : { x0: +(x0 / a.w).toFixed(2), y0: +(y0 / a.h).toFixed(2), x1: +(x1 / a.w).toFixed(2), y1: +(y1 / a.h).toFixed(2) },
    rowBands: bands(rowHit), colBands: bands(colHit) };
}

/** 单页有多少非白像素（用于「这页是不是空的」） */
export async function inkRatio(file, pageIndex = 0, scale = 1.2) {
  const a = await renderPage(file, pageIndex, scale);
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) if (a.data[i] < 235 || a.data[i + 1] < 235 || a.data[i + 2] < 235) n++;
  return n / (a.w * a.h);
}

/** 同一文件两页的同一区域是否不同（例如页码 1 和 5） */
export async function regionDiffers(file, pA, pB, rel, scale = 1.5) {
  const a = await renderPage(file, pA, scale), b = await renderPage(file, pB, scale);
  const x0 = Math.floor(rel.x0 * a.w), x1 = Math.ceil(rel.x1 * a.w), y0 = Math.floor(rel.y0 * a.h), y1 = Math.ceil(rel.y1 * a.h);
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * a.w + x) * 4;
    if (Math.abs(a.data[i] - b.data[i]) > 30) n++;
  }
  return n;
}
