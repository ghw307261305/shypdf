// 手动检查用：tsx --tsconfig tsconfig.json test/_p2w-cli.ts in.pdf out.docx
import './_node-env';
import { readFileSync, writeFileSync } from 'node:fs';
import pdfToWord from '@/tools/pdf-to-word';
const [, , input, output] = process.argv;
const fd = new FormData(); fd.append('images', 'on');
const out = await pdfToWord.run([new File([readFileSync(input)], 'in.pdf', { type: 'application/pdf' })], fd, { progress: () => {} });
writeFileSync(output, Buffer.from(await out[0].blob.arrayBuffer()));
console.log(`${output}: ${out[0].blob.size} bytes`);
