// worker/report.ts：错误报告的校验、去重指纹、邮件 MIME。
import assert from 'node:assert/strict';
import { parseReport, fingerprint, emailSubject, emailText, buildMime, MAX_BODY } from '../worker/report';

const good = {
  tool: 'merge-pdf', stage: 'run', name: 'TypeError', message: 'x is not a function', stack: 'TypeError: x\n  at a (https://shypdf.com/_astro/a.js:1:2)',
  cause: '', path: '/merge-pdf/', lang: 'en', build: 'abc1234', ua: 'Mozilla/5.0', memoryGB: 8, cores: 8,
  files: [{ ext: 'pdf', size: 1048576 }], options: { mode: 'strong' },
};

// 合法报告
const r = parseReport(JSON.stringify(good))!;
assert.equal(r.tool, 'merge-pdf');
assert.equal(r.files[0].size, 1048576);

// 拒收：不是 JSON、没有 message、工具名不合法、超长
assert.equal(parseReport('nope'), null);
assert.equal(parseReport(JSON.stringify({ ...good, message: '' })), null);
assert.equal(parseReport(JSON.stringify({ ...good, tool: '../etc' })), null);
assert.equal(parseReport(JSON.stringify({ ...good, stack: 'x'.repeat(MAX_BODY) })), null);

// 不认识的字段丢掉、类型不对的字段归零、字段截断
const odd = parseReport(JSON.stringify({ ...good, fileName: 'secret.pdf', ua: 42, message: 'm'.repeat(5000), files: 'x', options: null }))!;
assert.ok(!('fileName' in odd));
assert.equal(odd.ua, '');
assert.equal(odd.message.length, 1000);
assert.deepEqual(odd.files, []);

// 指纹：数字不同算同一个错误
assert.equal(fingerprint({ ...r, message: 'Page 3 failed' }), fingerprint({ ...r, message: 'Page 17 failed' }));
assert.notEqual(fingerprint(r), fingerprint({ ...r, tool: 'split-pdf' }));

// 标题只取第一行（防止头注入）；正文含关键信息
const multi = parseReport(JSON.stringify({ ...good, message: 'boom\nBcc: evil@example.com' }))!;
assert.ok(!emailSubject(multi).includes('\n'));
const text = emailText(r, { country: 'DE', time: '2026-09-19T00:00:00.000Z' });
for (const s of ['merge-pdf', 'TypeError: x is not a function', 'abc1234', 'DE', '.pdf 1.00 MB', 'mode=strong', 'a.js:1:2']) assert.ok(text.includes(s), s);

// MIME：非 ASCII 标题用 encoded-word，每行不超 76；正文 base64 可还原
const mime = buildMime({ from: 'errors@shypdf.com', to: 'me@example.com', subject: '[ShyPDF] ocr-pdf: ' + 'ファイルを開けませんでした。'.repeat(4), text: 'héllo 世界', messageId: 'id@shypdf.com', date: new Date(0) });
const [head, body] = mime.split('\r\n\r\n');
assert.ok(/^[\x00-\x7f]*$/.test(mime), 'MIME must be ASCII');
for (const line of head.split('\r\n')) assert.ok(line.length <= 76, line);
const subject = head.match(/Subject: ((?:.|\r\n )*)/)![1].split('\r\n ').map((w) => Buffer.from(w.slice(10, -2), 'base64').toString()).join('');
assert.ok(subject.endsWith('ファイルを開けませんでした。'));
assert.equal(Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString(), 'héllo 世界');
assert.ok(head.includes('Date: Thu, 01 Jan 1970 00:00:00 +0000'));

console.log('report-worker: ok');
