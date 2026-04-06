/** Vitest test setup: extend matchers for DOM assertions. */

import "@testing-library/jest-dom";

// recharts ResponsiveContainer relies on ResizeObserver which is not in JSDOM.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
