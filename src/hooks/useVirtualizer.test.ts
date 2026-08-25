import { calculateVirtualRange } from './useVirtualizer';

describe('calculateVirtualRange', () => {
  const base = { itemHeight: 50, itemCount: 1000, viewportHeight: 500, scrollTop: 0 };

  it('starts at the top with one extra row to cover partial visibility', () => {
    expect(calculateVirtualRange(base)).toEqual({ startIndex: 0, endIndex: 11 });
  });

  it('moves the window as the container scrolls', () => {
    expect(calculateVirtualRange({ ...base, scrollTop: 5000 })).toEqual({
      startIndex: 100,
      endIndex: 111,
    });
  });

  it('handles a scroll position part-way through a row', () => {
    expect(calculateVirtualRange({ ...base, scrollTop: 5025 })).toEqual({
      startIndex: 100,
      endIndex: 111,
    });
  });

  it('applies overscan on both sides', () => {
    expect(calculateVirtualRange({ ...base, scrollTop: 5000, overscan: 5 })).toEqual({
      startIndex: 95,
      endIndex: 116,
    });
  });

  it('never starts before the first row, even with overscan', () => {
    expect(calculateVirtualRange({ ...base, scrollTop: 0, overscan: 10 }).startIndex).toBe(0);
  });

  it('never runs past the last row', () => {
    expect(calculateVirtualRange({ ...base, scrollTop: 49_500, overscan: 10 })).toEqual({
      startIndex: 980,
      endIndex: 1000,
    });
  });

  it('treats a negative scroll position as the top', () => {
    expect(calculateVirtualRange({ ...base, scrollTop: -200 }).startIndex).toBe(0);
  });

  it('renders nothing until the viewport has been measured', () => {
    expect(calculateVirtualRange({ ...base, viewportHeight: 0 })).toEqual({
      startIndex: 0,
      endIndex: 0,
    });
  });

  it('renders nothing for an empty list', () => {
    expect(calculateVirtualRange({ ...base, itemCount: 0 })).toEqual({
      startIndex: 0,
      endIndex: 0,
    });
  });

  it('never returns an inverted range when the list shrinks under the scroll position', () => {
    // The container still reports a deep scroll position while the filtered
    // list has already collapsed to a handful of rows.
    const range = calculateVirtualRange({
      scrollTop: 49_500,
      viewportHeight: 500,
      itemHeight: 50,
      itemCount: 3,
      overscan: 8,
    });

    expect(range.startIndex).toBeLessThanOrEqual(range.endIndex);
    expect(range.endIndex).toBe(3);
  });

  it('renders a window far smaller than the list itself', () => {
    const range = calculateVirtualRange({ ...base, itemCount: 50_000, overscan: 8 });
    expect(range.endIndex - range.startIndex).toBeLessThan(30);
  });
});
