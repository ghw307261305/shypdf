// Workers 运行时模块的最小声明（不为一个文件引入 @cloudflare/workers-types）
declare module 'cloudflare:email' {
  export class EmailMessage {
    constructor(from: string, to: string, raw: string | ReadableStream);
    readonly from: string;
    readonly to: string;
  }
}
