/** Vitest test setup: extend matchers for DOM assertions. */

import "@testing-library/jest-dom";

// Mock analytics module so tests never fire real PostHog events.
vi.mock("../lib/analytics", () => ({
  initAnalytics: vi.fn(),
  trackEvent: vi.fn(),
  identifyUser: vi.fn(),
  resetUser: vi.fn(),
}));

// recharts ResponsiveContainer relies on ResizeObserver which is not in JSDOM.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// IntersectionObserver is not implemented in JSDOM — provide a stub.
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) { this._callback = callback; }
  observe(el) { this._callback([{ isIntersecting: true, target: el }]); }
  unobserve() {}
  disconnect() {}
};

// matchMedia is not implemented in jsdom — provide a default stub.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

// Ensure localStorage is available with all standard methods in jsdom.
const localStorageStore = new Map();
const localStorageMock = {
  getItem: (key) => localStorageStore.get(key) ?? null,
  setItem: (key, value) => localStorageStore.set(key, String(value)),
  removeItem: (key) => localStorageStore.delete(key),
  clear: () => localStorageStore.clear(),
  get length() { return localStorageStore.size; },
  key: (index) => Array.from(localStorageStore.keys())[index] ?? null,
};
Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});
