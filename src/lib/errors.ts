/**
 * 「预期内」的错误：用户输入或文件本身的问题（密码不对、没填水印文字、页码范围写错……），消息是给用户看的译文。
 * 和程序缺陷区分开 —— lib/report.ts 不上报 UserError，否则报错邮件里全是噪音。
 */
export class UserError extends Error {
  override name = 'UserError';
}

/**
 * pdf-lib / pdf.js 遇到加密 PDF 时抛的原始报错 —— 英文、面向开发者，
 * 甚至教人怎么调 API（`ignoreEncryption: true`）。界面上要换成给用户看的话，
 * 所以在这里统一认出来。上报那边（lib/report.ts）也有一份同样的忽略名单。
 */
const ENCRYPTED = /is encrypted|PasswordException|No password given|Incorrect Password|password is required/i;

export function isEncryptedError(e: unknown): boolean {
  const s = e instanceof Error ? `${e.name} ${e.message}` : String(e ?? '');
  return ENCRYPTED.test(s);
}
