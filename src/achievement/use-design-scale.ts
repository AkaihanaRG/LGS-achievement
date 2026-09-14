/**
 * 设计分辨率缩放。
 *
 * 扩展 UI 容器可能按设计画布（1920×1080）渲染再由宿主整体缩放，
 * 直接写 16px 字号在游戏里会显得很小。这里按容器实际显示宽度
 * 相对 1920 的比例缩放内容，保证视觉大小与游戏画面协调。
 */

import { useEffect, useState, type RefObject } from "react";

const DESIGN_WIDTH = 1920;

export function useDesignScale(ref: RefObject<HTMLElement | null>): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      // clientWidth / offsetWidth 是布局尺寸，不受宿主 CSS transform 缩放影响，
      // 用它计算比例可避免「宿主缩放 × 自身缩放」的双重缩小。
      const width =
        element.clientWidth || element.offsetWidth || DESIGN_WIDTH;
      const next = Math.min(2, Math.max(0.35, width / DESIGN_WIDTH));
      setScale(next);
    };

    update();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      observer.observe(element);
    }
    window.addEventListener("resize", update);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [ref]);

  return scale;
}

export const DESIGN_CANVAS = { width: DESIGN_WIDTH, height: 1080 };
