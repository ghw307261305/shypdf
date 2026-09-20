# 验收测试自动化

用系统里的 Chrome 打开真实工具页，走完「选文件 → 填选项 → 运行 → 下载」，再把下载到的文件用
pdf-lib / pdf.js / JSZip 拆开核对。画上去的东西（水印、中文页码、签名、标注）用像素比对验证，
文字提取查不到它们 —— 那些是按设计渲染成图片嵌进 PDF 的。

用例对应 `test/ACCEPTANCE.md` 里的 pattern，一条用例 = 一次完整的界面操作。

## 跑起来

```bash
npm run fixtures                       # 生成素材（首次或素材有改动时）
npm run dev                            # 记下它打印的端口
BASE=http://localhost:4322 npm run test:accept          # 全部套件
BASE=http://localhost:4322 node test/acceptance/03-convert.mjs   # 单个套件
BASE=http://localhost:4322 npm run test:accept -- 01 05          # 挑几个
```

生产构建那套单独跑（报错上报在 dev 里是关掉的，只有生产构建能验）：

```bash
npm run build && npx astro preview --port 4325
PREVIEW_BASE=http://localhost:4325 node test/acceptance/08-prod.mjs
```

浏览器默认用 `/Applications/Google Chrome.app`，换一个就设 `CHROME_PATH`。
要看着它点，把套件里的 `suite(name, cases)` 改成 `suite(name, cases, { headless: false })`。

## 套件

| 文件 | 覆盖 |
| --- | --- |
| `01-edit.mjs` | 合并 / 拆分 / 组织 / 删页 / 提取 / 页码 / 水印 |
| `02-workspace.mjs` | 裁剪 / 编辑 / 填表单 / 签名（真实鼠标拖拽、手写板、图片签名） |
| `03-convert.mjs` | 图片↔PDF、PDF→图片 / 文字 / Word、Word→PDF |
| `04-opt-sec.mjs` | 压缩 / 修复 / 解锁 / 加密 |
| `05-ocr.mjs` | 五种语言的 OCR、txt 输出、跳过已有文字、默认语言 |
| `06-generic.mjs` | P1–P12 通用 pattern：拖放、上限、列表、进度、结果页、离线、不上传文件 |
| `07-site.mjs` | 8 种语言的页面、数字格式、语言切换、404、sitemap、站内死链 |
| `08-prod.mjs` | 生产构建冒烟 + 报错上报该发/不该发 + 上报内容不含隐私 |

结果写到 `test/acceptance/results/*.json`（每条用例的断言、界面提示、耗时、下载到的文件）。
下载的产物落在系统临时目录的 `shypdf-acceptance/` 下，可以手动打开看。

## 写用例

```js
{ id: 'split/ranges',
  spec: { slug: 'split-pdf', files: [P('text-5p.pdf')], options: { mode: 'ranges', ranges: '1-2, 4' } },
  check: async (r) => [ok((await zipNames(r.files[0])).length === 2, '应得 2 个文件')] }
```

- `spec.before(page)` 在填选项前跑，用来做界面操作（拖框、手写、翻页），返回值进 `r.beforeResult`。
- `spec.skipRun` 只看界面不点开始。
- 每条用例都会自动检查：没有未捕获的页面异常、没有任何非 GET 请求（文件不出本机）。
