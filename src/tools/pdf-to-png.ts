// PDF to PNG 与 PDF to JPG 是同一个实现，默认输出 PNG（clientDict 里配了 key 别名）。
import { makeMod } from './pdf-to-jpg';
export default makeMod('png');
