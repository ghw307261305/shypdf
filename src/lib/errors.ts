/**
 * 「预期内」的错误：用户输入或文件本身的问题（密码不对、没填水印文字、页码范围写错……），消息是给用户看的译文。
 * 和程序缺陷区分开 —— lib/report.ts 不上报 UserError，否则报错邮件里全是噪音。
 */
export class UserError extends Error {
  override name = 'UserError';
}
