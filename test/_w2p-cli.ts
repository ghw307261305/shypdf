// 手动检查用：tsx --tsconfig tsconfig.json test/_w2p-cli.ts in.docx out.pdf
import './_node-env';
import { readFileSync, writeFileSync } from 'node:fs';
import wordToPdf from '@/tools/word-to-pdf';
const [, , input, output] = process.argv;
const t0 = Date.now();
const out = await wordToPdf.run([new File([readFileSync(input)], 'in.docx')], new FormData(), { progress: () => {} });
writeFileSync(output, Buffer.from(await out[0].blob.arrayBuffer()));
console.log(`${output}: ${out[0].blob.size} bytes, ${Date.now() - t0} ms`);
