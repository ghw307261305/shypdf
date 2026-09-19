// 字体子集化：HarfBuzz 的 hb-subset（WASM，public/vendor/hb/，由 scripts/vendor.mjs 拷贝）。
// 不用 pdf-lib 自带的 subset: true —— 它依赖的 fontkit 子集器会丢字形（实测 Carlito、Noto Sans JP 都缺字）。
import { loadVendor } from './vendor';

type Exports = Record<string, (...args: number[]) => number> & { memory: WebAssembly.Memory };
let hb: Promise<Exports> | null = null;

function load(): Promise<Exports> {
  hb ??= loadVendor('hb/harfbuzz-subset.wasm')
    .then((bytes) => WebAssembly.instantiate(bytes as BufferSource, {}))
    .then((r) => r.instance.exports as unknown as Exports);
  hb.catch(() => { hb = null; });
  return hb;
}

/** 只保留 codePoints 用到的字形（以及它们依赖的组合字形、排版表） */
export async function subsetFont(font: Uint8Array, codePoints: Iterable<number>): Promise<Uint8Array> {
  const ex = await load();
  const ptr = ex.malloc(font.byteLength);
  // malloc 可能让内存增长、旧的 buffer 失效，所以每次都重新取 memory.buffer
  new Uint8Array(ex.memory.buffer).set(font, ptr);
  const blob = ex.hb_blob_create(ptr, font.byteLength, 2 /* HB_MEMORY_MODE_WRITABLE */, 0, 0);
  const face = ex.hb_face_create(blob, 0);
  ex.hb_blob_destroy(blob);
  const input = ex.hb_subset_input_create_or_fail();
  const set = ex.hb_subset_input_unicode_set(input);
  for (const cp of codePoints) ex.hb_set_add(set, cp);
  const sub = ex.hb_subset_or_fail(face, input);
  ex.hb_subset_input_destroy(input);
  try {
    if (!sub) throw new Error('Font subsetting failed');
    const out = ex.hb_face_reference_blob(sub);
    const data = ex.hb_blob_get_data(out, 0), length = ex.hb_blob_get_length(out);
    const result = new Uint8Array(ex.memory.buffer).slice(data, data + length);
    ex.hb_blob_destroy(out);
    ex.hb_face_destroy(sub);
    if (!result.length) throw new Error('Font subsetting failed');
    return result;
  } finally {
    ex.hb_face_destroy(face);
    ex.free(ptr);
  }
}
