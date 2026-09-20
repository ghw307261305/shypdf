// public/vendor/ 下按需下载的大文件（字体、WASM）。浏览器里走 fetch（同源，CSP 允许）；Node 测试用 setVendorLoader 换成读磁盘。
import { t } from './i18n-client';
import { UserError } from './errors';

export const VENDOR_BASE = '/vendor/';

type Loader = (path: string) => Promise<Uint8Array>;

let loader: Loader = async (path) => {
  let res: Response;
  try { res = await fetch(VENDOR_BASE + path); } catch { throw new UserError(t('lib.vendorLoad')); } // 断网：不是缺陷
  // 服务器答了但不是 2xx：多半是部署漏了文件，要上报（cause 会进报告）
  if (!res.ok) throw new Error(t('lib.vendorLoad'), { cause: `HTTP ${res.status} ${VENDOR_BASE}${path}` });
  return new Uint8Array(await res.arrayBuffer());
};

const cache = new Map<string, Promise<Uint8Array>>();

export function setVendorLoader(l: Loader) { loader = l; cache.clear(); }

/** 读取 public/vendor/<path>；同一文件在一次会话里只下载一次 */
export function loadVendor(path: string): Promise<Uint8Array> {
  let p = cache.get(path);
  if (!p) {
    p = loader(path);
    p.catch(() => cache.delete(path)); // 失败（断网）后允许重试
    cache.set(path, p);
  }
  return p;
}
