import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface VirtualRange {
  startIndex: number;
  endIndex: number;
}

export interface VirtualItem {
  index: number;
  /** Absolute offset from the top of the scrollable content, in pixels. */
  offsetTop: number;
}

export interface UseVirtualizerOptions {
  itemCount: number;
  itemHeight: number;
  /** Extra rows rendered above and below the viewport to hide scroll tearing. */
  overscan?: number;
}

export interface UseVirtualizerResult<T extends HTMLElement> {
  /** Attach to the scroll container: `<div ref={scrollRef}>`. */
  scrollRef: (element: T | null) => void;
  virtualItems: VirtualItem[];
  totalHeight: number;
  range: VirtualRange;
  scrollToTop: () => void;
}

/**
 * The windowing calculation, kept free of React and the DOM so it can be
 * tested directly. `endIndex` is exclusive.
 */
export function calculateVirtualRange({
  scrollTop,
  viewportHeight,
  itemHeight,
  itemCount,
  overscan = 0,
}: {
  scrollTop: number;
  viewportHeight: number;
  itemHeight: number;
  itemCount: number;
  overscan?: number;
}): VirtualRange {
  if (itemCount <= 0 || itemHeight <= 0 || viewportHeight <= 0) {
    return { startIndex: 0, endIndex: 0 };
  }

  const safeScrollTop = Math.max(0, scrollTop);
  const firstVisible = Math.floor(safeScrollTop / itemHeight);
  const visibleCount = Math.ceil(viewportHeight / itemHeight) + 1;

  const endIndex = Math.min(itemCount, firstVisible + visibleCount + overscan);
  // Clamped against endIndex as well: when the list shrinks under a filter the
  // container can briefly report a scroll position past the new end, and an
  // inverted range would render nothing at all.
  const startIndex = Math.min(Math.max(0, firstVisible - overscan), endIndex);

  return { startIndex, endIndex };
}

/**
 * Fixed-height list virtualisation.
 *
 * Only the rows intersecting the viewport (plus overscan) are rendered, so a
 * 50,000 row list costs the same as a 20 row one. Scroll updates are coalesced
 * into an animation frame — the raw scroll event can fire far more often than
 * the browser paints, and re-rendering on every one of those is wasted work.
 *
 * The container is tracked with a callback ref rather than a ref object: the
 * scroll container is mounted conditionally (it does not exist while the
 * dataset is loading), and a mount-time effect would measure nothing and never
 * run again.
 */
export function useVirtualizer<T extends HTMLElement = HTMLDivElement>({
  itemCount,
  itemHeight,
  overscan = 6,
}: UseVirtualizerOptions): UseVirtualizerResult<T> {
  const elementRef = useRef<T | null>(null);
  const frameRef = useRef<number | null>(null);

  const [element, setElement] = useState<T | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const scrollRef = useCallback((node: T | null) => {
    elementRef.current = node;
    setElement(node);
  }, []);

  // No reset when the element detaches: a stale height is harmless, because
  // nothing is rendered while the container is unmounted, and the next mount
  // measures again.
  useLayoutEffect(() => {
    if (!element) return;

    const measure = () => {
      // Reading layout and storing it is the one case where setting state from
      // a layout effect is correct — an element's rendered height cannot be
      // known any other way.
      setViewportHeight(element.clientHeight);
    };

    measure();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  useEffect(() => {
    if (!element) return;

    const handleScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        setScrollTop(element.scrollTop);
      });
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [element]);

  const scrollToTop = useCallback(() => {
    const node = elementRef.current;
    if (!node) return;
    node.scrollTop = 0;
    setScrollTop(0);
  }, []);

  const range = calculateVirtualRange({
    scrollTop,
    viewportHeight,
    itemHeight,
    itemCount,
    overscan,
  });

  const virtualItems: VirtualItem[] = [];
  for (let index = range.startIndex; index < range.endIndex; index += 1) {
    virtualItems.push({ index, offsetTop: index * itemHeight });
  }

  return {
    scrollRef,
    virtualItems,
    totalHeight: itemCount * itemHeight,
    range,
    scrollToTop,
  };
}
