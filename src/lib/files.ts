import type { OutputFile } from './types';
import { t, formatNumber } from './i18n-client';
import { UserError } from './errors';

export function formatBytes(n: number): string {
  // 单位和小数点随语言变：1.5 MB / 1,5 MB / 1,5 Mo
  if (n < 1024) return t('lib.bytes', { n });
  if (n < 1024 * 1024) return t('lib.kb', { n: formatNumber(n / 1024, 1) });
  return t('lib.mb', { n: formatNumber(n / 1024 / 1024, 1) });
}

export function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** 多个输出打包为一个 zip */
export async function zipOutputs(outputs: OutputFile[], zipName: string): Promise<OutputFile> {
  // 按需加载：JSZip 约 90 KB，只有多文件结果才用得到
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const o of outputs) zip.file(o.name, o.blob);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  return { name: zipName, blob };
}

/** 解析页码范围 "1-3, 5, 8-10" → 每个逗号段一组 0 起索引 */
export function parseRanges(text: string, pageCount: number): number[][] {
  const groups: number[][] = [];
  for (const part of text.split(/[,，]/).map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    let from: number, to: number;
    if (m) { from = +m[1]; to = +m[2]; }
    else if (/^\d+$/.test(part)) { from = to = +part; }
    else throw new UserError(t('lib.rangeUnreadable', { part }));
    if (from < 1 || to > pageCount || from > to) throw new UserError(t('lib.rangeOutside', { part, n: pageCount }));
    const g: number[] = [];
    for (let i = from; i <= to; i++) g.push(i - 1);
    groups.push(g);
  }
  if (!groups.length) throw new UserError(t('lib.rangeEmpty'));
  return groups;
}
