// 每个工具模块导出一个 ToolModule；UI 层（scripts/tool-app.ts）只依赖这个接口。

export interface OutputFile {
  name: string;
  blob: Blob;
}

export interface RunContext {
  /** 进度提示，显示在按钮下方 */
  progress: (message: string, ratio?: number) => void;
  /** 当前工具的页面顺序（仅 mode === 'pages' 的工具会用到）：每项是原始页索引（0 起） */
  pageOrder?: number[];
  /** 每页的旋转增量（仅 rotate/organize 用），key 为原始页索引 */
  pageRotations?: Record<number, number>;
}

export interface ToolModule {
  /** 'files'：以文件为单位展示卡片；'pages'：展开为页面缩略图（单文件） */
  mode: 'files' | 'pages';
  /** 选项面板 HTML（放在 <form> 内；字段 name 即 FormData 的 key）。是函数而不是字符串：文案要在调用时按当前语言取（lib/i18n-client.ts 的 th） */
  optionsHtml: () => string;
  /** 主处理函数 */
  run: (files: File[], options: FormData, ctx: RunContext) => Promise<OutputFile[]>;
  /** 结果页给出的额外说明，如压缩率 */
  summary?: (inputs: File[], outputs: OutputFile[]) => string;
}
