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
  scrollRef: React.MutableRefObject<T | null>;
  virtualItems: VirtualItem[];
  totalHeight: number;
  range: VirtualRange;
  scrollToIndex: (index: number) => void;
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

  const startIndex = Math.max(0, firstVisible - overscan);
  const endIndex = Math.min(itemCount, firstVisible + visibleCount + overscan);

  return { startIndex, endIndex };
}

/**
 * Fixed-height list virtualisation.
 *
 * Only the rows intersecting the viewport (plus overscan) are rendered, so a
 * 50,000 row list costs the same as a 20 row one. Scroll updates are coalesced
 * into an animation frame — the raw scroll event can fire far more often than
 * the browser paints, and re-rendering on every one of those is wasted work.
 */
export function useVirtualizer<T extends HTMLElement = HTMLDivElement>({
  itemCount,
  itemHeight,
  overscan = 6,
}: UseVirtualizerOptions): UseVirtualizerResult<T> {
  const scrollRef = useRef<T | null>(null);
  const frameRef = useRef<number | null>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  // Measure on mount and whenever the element resizes.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const measure = () => setViewportHeight(element.clientHeight);
    measure();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
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
  }, []);

  // A shorter result list can leave the container scrolled past its new end.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const maxScrollTop = Math.max(0, itemCount * itemHeight - element.clientHeight);
    if (element.scrollTop > maxScrollTop) {
      element.scrollTop = maxScrollTop;
      setScrollTop(maxScrollTop);
    }
  }, [itemCount, itemHeight]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const element = scrollRef.current;
      if (!element) return;
      const clamped = Math.min(Math.max(index, 0), Math.max(0, itemCount - 1));
      element.scrollTop = clamped * itemHeight;
      setScrollTop(element.scrollTop);
    },
    [itemCount, itemHeight],
  );

  const scrollToTop = useCallback(() => scrollToIndex(0), [scrollToIndex]);

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
    scrollToIndex,
    scrollToTop,
  };
}
