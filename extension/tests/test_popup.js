/**
 * Popup tests — auth state rendering, recent saves list, dashboard link.
 * Uses JSDOM + manual chrome mock to simulate chrome extension APIs.
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import { JSDOM } from "jsdom";

const POPUP_HTML = `
  <header class="header">
    <span class="logo">Pipelined</span>
    <span id="user-name" class="user-name"></span>
    <button id="sign-out" class="btn-sign-out hidden">Sign out</button>
  </header>
  <main id="app">
    <div id="loading" class="state">Loading...</div>
    <div id="unauthenticated" class="state hidden">
      <p class="sign-in-prompt">Sign in to Pipelined to start tracking applications.</p>
      <button id="open-dashboard" class="btn btn-primary">Sign in to Pipelined</button>
    </div>
    <div id="authenticated" class="state hidden">
      <ul id="saves-list"></ul>
      <div id="auto-save-row" class="auto-save-row hidden">
        <span class="auto-save-label">Auto-save</span>
        <button id="auto-save-toggle" class="auto-save-btn" aria-pressed="false">OFF</button>
      </div>
      <button id="open-dashboard-auth" class="btn btn-secondary">Open Dashboard</button>
    </div>
  </main>
`;

function setupDOM() {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${POPUP_HTML}</body></html>`, {
    url: "chrome-extension://test/popup/popup.html",
  });
  global.document = dom.window.document;
  global.window = dom.window;
}

function setupChrome() {
  global.chrome = {
    runtime: { sendMessage: jest.fn() },
    storage: {
      local: { get: jest.fn() },
      session: { clear: jest.fn() },
    },
    tabs: { create: jest.fn() },
  };
}

let show;
let renderSaves;
let openDashboard;
let init;
let escapeHtml;
let relativeTime;
let signOut;
let renderAutoSaveToggle;

beforeAll(async () => {
  setupDOM();
  setupChrome();
  const mod = await import("../popup/popup.js");
  show = mod.show;
  renderSaves = mod.renderSaves;
  openDashboard = mod.openDashboard;
  init = mod.init;
  escapeHtml = mod.escapeHtml;
  relativeTime = mod.relativeTime;
  signOut = mod.signOut;
  renderAutoSaveToggle = mod.renderAutoSaveToggle;
});

beforeEach(() => {
  setupDOM();
  setupChrome();
});

// ── show() ──────────────────────────────────────────────────────────────────

describe("show()", () => {
  it("should reveal loading and hide other states", () => {
    show("loading");

    expect(document.getElementById("loading").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("unauthenticated").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("authenticated").classList.contains("hidden")).toBe(true);
  });

  it("should reveal unauthenticated and hide other states", () => {
    show("unauthenticated");

    expect(document.getElementById("unauthenticated").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("loading").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("authenticated").classList.contains("hidden")).toBe(true);
  });

  it("should reveal authenticated and hide other states", () => {
    show("authenticated");

    expect(document.getElementById("authenticated").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("loading").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("unauthenticated").classList.contains("hidden")).toBe(true);
  });
});

// ── renderSaves() ────────────────────────────────────────────────────────────

describe("renderSaves()", () => {
  it("should render empty message when saves array is empty", () => {
    renderSaves([]);

    const empty = document.querySelector(".empty");

    expect(empty).not.toBeNull();
    expect(empty.textContent).toBe("No saved applications yet.");
  });

  it("should render one save-item per entry", () => {
    renderSaves([
      { company: "Google", role_title: "SWE", stage: "applied", id: "1" },
      { company: "Stripe", role_title: "Backend Engineer", stage: "applied", id: "2" },
    ]);

    const items = document.querySelectorAll(".save-item");

    expect(items).toHaveLength(2);
  });

  it("should display company name in .company span", () => {
    renderSaves([{ company: "Anthropic", role_title: "ML Engineer", stage: "applied", id: "1" }]);

    const company = document.querySelector(".company");

    expect(company.textContent).toBe("Anthropic");
  });

  it("should display role title in .role span", () => {
    renderSaves([{ company: "Anthropic", role_title: "ML Engineer", stage: "applied", id: "1" }]);

    const role = document.querySelector(".role");

    expect(role.textContent).toBe("ML Engineer");
  });

  it("should render at most 5 saves when more are provided", () => {
    const saves = Array.from({ length: 8 }, (_, i) => ({
      company: `Company${i}`,
      role_title: `Role${i}`,
      stage: "applied",
      id: `id${i}`,
    }));

    renderSaves(saves);

    const items = document.querySelectorAll(".save-item");

    expect(items).toHaveLength(5);
  });

  it("should render empty string when company is null", () => {
    renderSaves([{ company: null, role_title: "SWE", stage: "applied", id: "1" }]);

    const company = document.querySelector(".company");

    expect(company.textContent).toBe("");
  });

  it("should render empty string when role_title is null", () => {
    renderSaves([{ company: "Acme", role_title: null, stage: "applied", id: "1" }]);

    const role = document.querySelector(".role");

    expect(role.textContent).toBe("");
  });

  it("should render a stage badge for each save card", () => {
    renderSaves([{ company: "Acme", role_title: "SWE", stage: "applied", id: "1" }]);

    const badge = document.querySelector(".stage-badge");

    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe("Applied");
  });

  it("should render phone-screen stage badge with correct label", () => {
    renderSaves([{ company: "Acme", role_title: "SWE", stage: "phone screen", id: "1" }]);

    const badge = document.querySelector(".stage-badge");

    expect(badge.textContent).toBe("Phone Screen");
  });

  it("should render offer stage badge with correct label", () => {
    renderSaves([{ company: "Acme", role_title: "SWE", stage: "offer", id: "1" }]);

    const badge = document.querySelector(".stage-badge");

    expect(badge.textContent).toBe("Offer");
  });

  it("should render open-in-dashboard link with correct href", () => {
    renderSaves([{ company: "Acme", role_title: "SWE", stage: "applied", id: "abc123" }]);

    const link = document.querySelector(".open-link");

    expect(link).not.toBeNull();
    expect(link.href).toContain("highlight=abc123");
    expect(link.href).toContain("/dashboard");
  });
});

// ── init() ───────────────────────────────────────────────────────────────────

describe("init()", () => {
  it("should show unauthenticated state when not authenticated", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ authenticated: false, display_name: "" });

    await init();

    expect(document.getElementById("unauthenticated").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("authenticated").classList.contains("hidden")).toBe(true);
  });

  it("should show authenticated state when token is present", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ authenticated: true, display_name: "Alice" });
    chrome.storage.local.get.mockResolvedValue({ recent_saves: [] });

    await init();

    expect(document.getElementById("authenticated").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("unauthenticated").classList.contains("hidden")).toBe(true);
  });

  it("should render save items when authenticated with recent saves", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ authenticated: true, display_name: "" });
    chrome.storage.local.get.mockResolvedValue({
      recent_saves: [{ company: "Meta", role_title: "SWE", stage: "applied", id: "1" }],
    });

    await init();

    expect(document.querySelector(".save-item")).not.toBeNull();
    expect(document.querySelector(".company").textContent).toBe("Meta");
  });

  it("should render empty message when authenticated but no saves cached", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ authenticated: true, display_name: "" });
    chrome.storage.local.get.mockResolvedValue({ recent_saves: [] });

    await init();

    expect(document.querySelector(".empty")).not.toBeNull();
  });

  it("should default to empty saves if recent_saves key is missing from storage", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ authenticated: true, display_name: "" });
    chrome.storage.local.get.mockResolvedValue({});

    await init();

    expect(document.getElementById("authenticated").classList.contains("hidden")).toBe(false);
    expect(document.querySelector(".empty")).not.toBeNull();
  });

  it("should not call storage when unauthenticated", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ authenticated: false, display_name: "" });

    await init();

    expect(chrome.storage.local.get).not.toHaveBeenCalled();
  });

  it("should display user display_name in header when authenticated", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ authenticated: true, display_name: "Jane Doe" });
    chrome.storage.local.get.mockResolvedValue({ recent_saves: [] });

    await init();

    expect(document.getElementById("user-name").textContent).toBe("Jane Doe");
  });
});

// ── openDashboard() ──────────────────────────────────────────────────────────

describe("openDashboard()", () => {
  it("should open a new tab with the dashboard URL", () => {
    openDashboard();

    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: "https://app.pipelined.app/dashboard",
    });
  });
});

// ── signOut() ────────────────────────────────────────────────────────────────

describe("signOut()", () => {
  it("should clear the session storage", () => {
    signOut();

    expect(chrome.storage.session.clear).toHaveBeenCalled();
  });

  it("should show the unauthenticated state after sign-out", () => {
    show("authenticated");

    signOut();

    expect(document.getElementById("unauthenticated").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("authenticated").classList.contains("hidden")).toBe(true);
  });
});

// ── relativeTime() ────────────────────────────────────────────────────────────

describe("relativeTime()", () => {
  it("should return empty string for null input", () => {
    expect(relativeTime(null)).toBe("");
  });

  it("should return 'just now' for very recent dates", () => {
    const now = new Date().toISOString();

    expect(relativeTime(now)).toBe("just now");
  });

  it("should return 'N days ago' for dates a few days in the past", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

    expect(relativeTime(threeDaysAgo)).toBe("3 days ago");
  });

  it("should return '1 day ago' for exactly one day ago", () => {
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();

    expect(relativeTime(oneDayAgo)).toBe("1 day ago");
  });
});

// ── renderAutoSaveToggle() ────────────────────────────────────────────────────

describe("renderAutoSaveToggle()", () => {
  it("should show toggle with OFF state when auto_save is false", async () => {
    chrome.storage.local.get.mockResolvedValue({ auto_save: false });

    await renderAutoSaveToggle();

    const row = document.getElementById("auto-save-row");
    const btn = document.getElementById("auto-save-toggle");

    expect(row.classList.contains("hidden")).toBe(false);
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(btn.textContent).toBe("OFF");
  });

  it("should show toggle with ON state when auto_save is true", async () => {
    chrome.storage.local.get.mockResolvedValue({ auto_save: true });

    await renderAutoSaveToggle();

    const btn = document.getElementById("auto-save-toggle");

    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.textContent).toBe("ON");
  });
});

// ── escapeHtml() ─────────────────────────────────────────────────────────────

describe("escapeHtml()", () => {
  it("should escape ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("should escape angle brackets", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });

  it("should escape double quotes", () => {
    expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("should escape single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("should return plain strings unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("should coerce non-strings to strings", () => {
    expect(escapeHtml(42)).toBe("42");
  });
});
