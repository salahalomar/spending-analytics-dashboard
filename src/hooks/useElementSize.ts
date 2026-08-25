import { useCallback, useLayoutEffect, useState } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Tracks an element's rendered size.
 *
 * The SVG charts draw at real pixel coordinates rather than scaling a fixed
 * viewBox, which keeps stroke widths and text at their intended size on every
 * viewport. A callback ref is used so the element is measured whenever it
 * attaches, including after a conditional remount.
 */
export function useElementSize<T extends HTMLElement = HTMLDivElement>(): [
  (element: T | null) => void,
  ElementSize,
] {
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  const ref = useCallback((node: T | null) => setElement(node), []);

  useLayoutEffect(() => {
    if (!element) {
      setSize({ width: 0, height: 0 });
      return;
    }

    const measure = () => {
      setSize((current) =>
        current.width === element.clientWidth && current.height === element.clientHeight
          ? current
          : { width: element.clientWidth, height: element.clientHeight },
      );
    };

    measure();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [ref, size];
}
