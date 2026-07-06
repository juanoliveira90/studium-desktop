import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement layout APIs CodeMirror measures with; zero-size
// stubs are enough for it to mount and edit in tests.
const zeroRect = () =>
  ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }) as DOMRect;

Range.prototype.getBoundingClientRect = zeroRect;
Range.prototype.getClientRects = () =>
  ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
