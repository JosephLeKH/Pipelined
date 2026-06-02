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
let init;

beforeAll(async () => {
  setupDOM();
  // Dynamic import ensures module-level code runs after globals are set
  const mod = await import("../content/content.js");
  injectBanner = mod.injectBanner;
  initAutoSave = mod.initAutoSave;
  AUTO_SAVE_DEBOUNCE_MS = mod.AUTO_SAVE_DEBOUNCE_MS;
  clearSavedUrls = mod.clearSavedUrls;
  init = mod.init;

  const helpers = await import("../content/banner_helpers.js");
  dismiss = helpers.dismiss;
  BANNER_AUTO_DISMISS_MS = helpers.BANNER_AUTO_DISMISS_MS;
  FADE_DURATION_MS = helpers.FADE_DURATION_MS;

  global.chrome = {
    runtime: {
      sendMessage: jest.fn(),
      onMessage: { addListener: jest.fn() },
    },
    storage: {
      local: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(undefined),
      },
    },
  };
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

  it("should export FADE_DURATION_MS = 220", () => {
    expect(FADE_DURATION_MS).toBe(220);
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
    expect(styleEl.textContent).toContain("#2E2D29");
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

// ── Auth-aware banner ─────────────────────────────────────────────────────────

describe("auth-aware banner", () => {
  it("shows a Sign-in CTA when GET_AUTH_STATUS reports unauthenticated", async () => {
    jest.useRealTimers();
    setupDOM();
    spyOnAttachShadow();

    chrome.runtime.sendMessage.mockImplementation((msg) => {
      if (msg.type === "GET_AUTH_STATUS") return Promise.resolve({ authenticated: false });
      return Promise.resolve({ status: "success" });
    });

    // Make a LinkedIn job page that the linkedin board module will detect.
    document.body.innerHTML = `
      <div class="job-details-jobs-unified-top-card__job-title">Software Engineer</div>
      <div class="job-details-jobs-unified-top-card__company-name">Acme Corp</div>
    `;

    await init();

    const host = document.querySelector("pipelined-banner");
    expect(host).not.toBeNull();
    const shadow = host.shadowRoot;
    expect(shadow).not.toBeNull();
    expect(shadow.textContent).toMatch(/Sign in/i);
    expect(shadow.querySelector("[data-action='save']")).toBeNull();
  });
});

// ── Scout-narrated banner ─────────────────────────────────────────────────────

describe("Scout-narrated banner", () => {
  it("renders 'Scout is scoring…' working state after a successful save", async () => {
    jest.useRealTimers();
    setupDOM();
    spyOnAttachShadow();

    chrome.runtime.sendMessage.mockImplementation((msg) => {
      if (msg.type === "GET_AUTH_STATUS") return Promise.resolve({ authenticated: true });
      if (msg.type === "SAVE_APPLICATION") return Promise.resolve({
        status: "success",
        application: { id: "1", company: "Acme", role_title: "SWE" },
        parseEnhanced: false,
      });
      return Promise.resolve({});
    });
    // Empty cache — score has not arrived yet
    chrome.storage.local.get.mockImplementation(async (key) => {
      if (key === "recent_saves") return { recent_saves: [] };
      return {};
    });

    document.body.innerHTML = `
      <div class="job-details-jobs-unified-top-card__job-title">SWE</div>
      <div class="job-details-jobs-unified-top-card__company-name">Acme</div>
    `;

    await init();

    const host = document.querySelector("pipelined-banner");
    expect(host).not.toBeNull();
    const saveButton = host.shadowRoot.querySelector("[data-action='save']");
    expect(saveButton).not.toBeNull();
    saveButton.click();

    // Allow the click handler's awaits to resolve
    await new Promise((r) => setTimeout(r, 50));

    const shadow = host.shadowRoot;
    expect(shadow.textContent).toMatch(/Scout is scoring/i);
    expect(shadow.querySelector(".pipelined-scout-glyph--working")).not.toBeNull();
  });

  it("upgrades to 'Saved · Scout: NN' when fit_score arrives in cache", async () => {
    jest.useRealTimers();
    setupDOM();
    spyOnAttachShadow();

    chrome.runtime.sendMessage.mockImplementation((msg) => {
      if (msg.type === "GET_AUTH_STATUS") return Promise.resolve({ authenticated: true });
      if (msg.type === "SAVE_APPLICATION") return Promise.resolve({
        status: "success",
        application: { id: "abc", company: "Acme", role_title: "SWE" },
        parseEnhanced: false,
      });
      return Promise.resolve({});
    });

    // Score appears in cache shortly after save
    let pollCount = 0;
    chrome.storage.local.get.mockImplementation(async (key) => {
      if (key === "recent_saves") {
        pollCount += 1;
        if (pollCount >= 2) {
          return {
            recent_saves: [{
              id: "abc",
              fit_score: 78,
              fit_score_reason: "Strong infra signal.",
            }],
          };
        }
        return { recent_saves: [] };
      }
      return {};
    });

    document.body.innerHTML = `
      <div class="job-details-jobs-unified-top-card__job-title">SWE</div>
      <div class="job-details-jobs-unified-top-card__company-name">Acme</div>
    `;

    await init();
    const host = document.querySelector("pipelined-banner");
    host.shadowRoot.querySelector("[data-action='save']").click();

    // Allow polling to find the score (poll interval is 400ms; give it 1500ms total)
    await new Promise((r) => setTimeout(r, 1500));

    const shadow = host.shadowRoot;
    expect(shadow.textContent).toMatch(/Saved · Scout: 78/);
    expect(shadow.textContent).toMatch(/Strong infra signal/);
  });
});
