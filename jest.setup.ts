import '@testing-library/jest-dom';

// jsdom does not implement layout, so every element reports a zero-sized box.
// The virtualiser and the charts both measure their container, so give them a
// deterministic size to work against in tests.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return 600;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return 900;
    },
  });
});

// ResizeObserver is used to keep the virtual window in sync with the viewport.
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = globalThis.ResizeObserver ?? ResizeObserverStub;
