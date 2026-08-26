import '@testing-library/jest-dom';
import { deserialize, serialize } from 'node:v8';
import { TextDecoder, TextEncoder } from 'node:util';

// jsdom omits the encoding globals that React Router reaches for at import
// time. Node's implementations are the same ones the browser exposes.
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}

// jsdom also omits structuredClone, which IndexedDB uses to copy values on
// insertion. Without it every write throws and the record store quietly falls
// back to memory, so the persistence tests would pass while testing nothing.
// V8's serialiser is a faithful structured clone for the shapes stored here.
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (<T>(value: T): T =>
    deserialize(serialize(value)) as T) as typeof globalThis.structuredClone;
}

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

// jsdom does not implement PointerEvent. Extending MouseEvent gives the chart
// tests a real event with working clientX/clientY.
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;

    constructor(
      type: string,
      params: MouseEventInit & { pointerId?: number; pointerType?: string } = {},
    ) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? 'mouse';
    }
  }

  globalThis.PointerEvent = PointerEventStub as unknown as typeof PointerEvent;
}

// ResizeObserver is used to keep the virtual window in sync with the viewport.
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = globalThis.ResizeObserver ?? ResizeObserverStub;
