// 「看到的页面」和 pdf-lib 坐标系之间的换算。
// pdf.js 渲染出来的是应用了 /Rotate、裁到 CropBox 的页面；pdf-lib 画东西用的是未旋转的用户空间。
// 在预览上定位的东西（签名、OCR 文字层）要经过这里，旋转过的页面才不会画歪。
import { degrees, type PDFPage, type Rotation } from 'pdf-lib';

export interface PageView {
  /** 显示方向下的页面宽高（pt） */
  width: number;
  height: number;
  /** 传给 pdf-lib drawImage / drawPage 的 rotate */
  rotate: Rotation;
  /** 视图坐标（原点在左下，x 向右，y 向上）→ 用户空间坐标 */
  toUser: (x: number, y: number) => { x: number; y: number };
}

export function pageView(page: PDFPage): PageView {
  const box = page.getCropBox();
  const rot = ((page.getRotation().angle % 360) + 360) % 360;
  const sideways = rot === 90 || rot === 270;
  const toUser = (x: number, y: number) => {
    switch (rot) {
      case 90: return { x: box.x + box.width - y, y: box.y + x };
      case 180: return { x: box.x + box.width - x, y: box.y + box.height - y };
      case 270: return { x: box.x + y, y: box.y + box.height - x };
      default: return { x: box.x + x, y: box.y + y };
    }
  };
  return { width: sideways ? box.height : box.width, height: sideways ? box.width : box.height, rotate: degrees(rot), toUser };
}
