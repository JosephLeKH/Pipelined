/**
 * Content script tests — banner injection, shadow DOM isolation, dismiss behaviors.
 * Uses dynamic import so JSDOM globals are set before the module's top-level code runs.
 */

import { jest, describe, it, expect, beforeAll, beforeEach, afterEach } from "@jest/globals";
import { JSDOM } from "jsdom";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const LINKEDIN_JOB_URL = "https://www.linkedin.com/jobs/view/99999";

/** Create a fresh JSDOM document and inject globals. */
function setupDOM(url = LINKEDIN_JOB_URL) {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url,
    runScripts: "dangerously",
  });
  global.document = dom.window.document;
  global.window = dom.window;
  return dom;
}

/**
 * Spy on attachShadow to use open mode so tests can inspect the shadow root.
 * The production code correctly passes mode:'closed'; we override only in test.
 */
function spyOnAttachShadow() {
  const roots = [];
  const real = global.window.Element.prototype.attachShadow;
  global.window.Element.prototype.attachShadow = function (init) {
    const shadow = real.call(this, { ...init, mode: "open" });
    roots.push(shadow);
    return shadow;
  };
  return roots;
}

let injectBanner;
let dismiss;
let BANNER_AUTO_DISMISS_MS;
let FADE_DURATION_MS;
let initAutoSave;
let AUTO_SAVE_DEBOUNCE_MS;
let clearSavedUrls;

beforeAll(async () => {
  setupDOM();
  // Dynamic import ensures module-level code runs after globals are set
  const mod = await import("../content/content.js");
  injectBanner = mod.injectBanner;
  initAutoSave = mod.initAutoSave;
  AUTO_SAVE_DEBOUNCE_MS = mod.AUTO_SAVE_DEBOUNCE_MS;
  clearSavedUrls = mod.clearSavedUrls;

  const helpers = await import("../content/banner_helpers.js");
  dismiss = helpers.dismiss;
  BANNER_AUTO_DISMISS_MS = helpers.BANNER_AUTO_DISMISS_MS;
  FADE_DURATION_MS = helpers.FADE_DURATION_MS;
});

beforeEach(() => {
  // Fresh document body for each test
  setupDOM();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("content.js constants", () => {
  it("should export BANNER_AUTO_DISMISS_MS = 8000", () => {
    expect(BANNER_AUTO_DISMISS_MS).toBe(8000);
  });

  it("should export FADE_DURATION_MS = 300", () => {
    expect(FADE_DURATION_MS).toBe(300);
  });
});

describe("injectBanner()", () => {
  it("should append a <pipelined-banner> host to document.body", () => {
    injectBanner({ role_title: "SWE", company_name: "Acme" }, "linkedin");

    const host = document.body.querySelector("pipelined-banner");

    expect(host).not.toBeNull();
  });

  it("should set z-index 2147483647 on the host element", () => {
    injectBanner({ role_title: "SWE", company_name: "Acme" }, "linkedin");

    const host = document.body.querySelector("pipelined-banner");

    expect(host.style.zIndex).toBe("2147483647");
  });

  it("should inject a <style> element into the shadow root", () => {
    const roots = spyOnAttachShadow();
    injectBanner({ role_title: "SWE", company_name: "Acme" }, "linkedin");

    const shadow = roots[0];
    const styleEl = shadow.querySelector("style");

    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain("pipelined-banner");
  });

  it("should inject CSS inline (style element, not link)", () => {
    const roots = spyOnAttachShadow();
    injectBanner({ role_title: "SWE", company_name: "Acme" }, "linkedin");

    const shadow = roots[0];

    expect(shadow.querySelector("link")).toBeNull();
    expect(shadow.querySelector("style")).not.toBeNull();
  });

  it("should set role=alert and aria-live=polite on the banner container", () => {
    const roots = spyOnAttachShadow();
    injectBanner({ role_title: "SWE", company_name: "Acme" }, "linkedin");

    const shadow = roots[0];
    const container = shadow.querySelector(".pipelined-banner");

    expect(container.getAttribute("role")).toBe("alert");
    expect(container.getAttribute("aria-live")).toBe("polite");
  });

  it("should display role_title and company_name in banner text", () => {
    const roots = spyOnAttachShadow();
    injectBanner({ role_title: "Frontend Engineer", company_name: "Stripe" }, "lever");

    const shadow = roots[0];
    const text = shadow.querySelector(".pipelined-text");

    expect(text.textContent).toContain("Frontend Engineer");
    expect(text.textContent).toContain("Stripe");
  });

  it("should render a CTA button with 'Save to Pipelined' text", () => {
    const roots = spyOnAttachShadow();
    injectBanner({ role_title: "SWE", company_name: "Acme" }, "linkedin");

    const shadow = roots[0];
    const button = shadow.querySelector("[data-action='save']");

    expect(button).not.toBeNull();
    expect(button.textContent).toContain("Save to Pipelined");
  });

  it("should fall back to 'this role' when role_title is null", () => {
    const roots = spyOnAttachShadow();
    injectBanner({ role_title: null, company_name: "Acme" }, "linkedin");

    const shadow = roots[0];
    const text = shadow.querySelector(".pipelined-text");

    expect(text.textContent).toContain("this role");
  });

  it("should fall back to 'this company' when company_name is null", () => {
    const roots = spyOnAttachShadow();
    injectBanner({ role_title: "SWE", company_name: null }, "linkedin");

    const shadow = roots[0];
    const text = shadow.querySelector(".pipelined-text");

    expect(text.textContent).toContain("this company");
  });

  it("should auto-dismiss after BANNER_AUTO_DISMISS_MS", () => {
    injectBanner({ role_title: "SWE", company_name: "Acme" }, "linkedin");

    const host = document.body.querySelector("pipelined-banner");
    expect(host).not.toBeNull();

    jest.advanceTimersByTime(BANNER_AUTO_DISMISS_MS + FADE_DURATION_MS + 1);

    expect(document.body.querySelector("pipelined-banner")).toBeNull();
  });

  it("should dismiss on Escape keydown", () => {
    injectBanner({ role_title: "SWE", company_name: "Acme" }, "linkedin");

    const host = document.body.querySelector("pipelined-banner");
    expect(host).not.toBeNull();

    document.dispatchEvent(new global.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    jest.advanceTimersByTime(FADE_DURATION_MS + 1);

    expect(document.body.querySelector("pipelined-banner")).toBeNull();
  });
});

describe("dismiss()", () => {
  it("should set opacity 0 and transition on the host", () => {
    injectBanner({ role_title: "SWE", company_name: "Acme" }, "linkedin");

    const host = document.body.querySelector("pipelined-banner");
    dismiss(host);

    expect(host.style.opacity).toBe("0");
    expect(host.style.transition).toContain("opacity");
  });

  it("should remove host from DOM after FADE_DURATION_MS", () => {
    injectBanner({ role_title: "SWE", company_name: "Acme" }, "linkedin");

    const host = document.body.querySelector("pipelined-banner");
    dismiss(host);
    jest.advanceTimersByTime(FADE_DURATION_MS + 1);

    expect(document.body.contains(host)).toBe(false);
  });
});

describe("initAutoSave()", () => {
  function setupChrome(autoSave = false) {
    global.chrome = {
      storage: { local: { get: jest.fn().mockResolvedValue({ auto_save: autoSave }) } },
      runtime: { sendMessage: jest.fn().mockResolvedValue({ status: "success" }) },
    };
  }

  beforeEach(() => {
    clearSavedUrls();
  });

  it("should return false when auto_save is disabled", async () => {
    setupChrome(false);

    const result = await initAutoSave({ role_title: "SWE", company_name: "Acme" }, "linkedin");

    expect(result).toBe(false);
  });

  it("should return true when auto_save is enabled", async () => {
    setupChrome(true);

    const result = await initAutoSave({ role_title: "SWE", company_name: "Acme" }, "linkedin");

    expect(result).toBe(true);
  });

  it("should not re-schedule save for a URL already in savedUrls", async () => {
    setupChrome(true);

    // First call returns true and schedules timer
    const first = await initAutoSave({ role_title: "SWE", company_name: "Acme" }, "linkedin");
    expect(first).toBe(true);

    // Advance timer so the callback fires (savedUrls.add runs synchronously before first await)
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS + 1);

    // Second call for same URL — URL is now in savedUrls
    const second = await initAutoSave({ role_title: "SWE", company_name: "Acme" }, "linkedin");
    expect(second).toBe(false);
  });
});
