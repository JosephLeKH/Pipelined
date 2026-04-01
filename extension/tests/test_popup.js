/**
 * Popup tests — auth state rendering, recent saves list, dashboard link.
 * Uses JSDOM + manual chrome mock to simulate chrome extension APIs.
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import { JSDOM } from "jsdom";

const POPUP_HTML = `
  <header class="header"><span class="logo">Pipelined</span></header>
  <main id="app">
    <div id="loading" class="state">Loading...</div>
    <div id="unauthenticated" class="state hidden">
      <p>Sign in to Pipelined to start tracking applications.</p>
      <button id="open-dashboard" class="btn btn-primary">Open Dashboard</button>
    </div>
    <div id="authenticated" class="state hidden">
      <ul id="saves-list"></ul>
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
    storage: { local: { get: jest.fn() } },
    tabs: { create: jest.fn() },
  };
}

let show;
let renderSaves;
let openDashboard;
let init;
let escapeHtml;

beforeAll(async () => {
  setupDOM();
  setupChrome();
  const mod = await import("../popup/popup.js");
  show = mod.show;
  renderSaves = mod.renderSaves;
  openDashboard = mod.openDashboard;
  init = mod.init;
  escapeHtml = mod.escapeHtml;
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
      { company: "Google", role_title: "SWE" },
      { company: "Stripe", role_title: "Backend Engineer" },
    ]);

    const items = document.querySelectorAll(".save-item");

    expect(items).toHaveLength(2);
  });

  it("should display company name in .company span", () => {
    renderSaves([{ company: "Anthropic", role_title: "ML Engineer" }]);

    const company = document.querySelector(".company");

    expect(company.textContent).toBe("Anthropic");
  });

  it("should display role title in .role span", () => {
    renderSaves([{ company: "Anthropic", role_title: "ML Engineer" }]);

    const role = document.querySelector(".role");

    expect(role.textContent).toBe("ML Engineer");
  });

  it("should render at most 5 saves when more are provided", () => {
    const saves = Array.from({ length: 8 }, (_, i) => ({
      company: `Company${i}`,
      role_title: `Role${i}`,
    }));

    renderSaves(saves);

    const items = document.querySelectorAll(".save-item");

    expect(items).toHaveLength(5);
  });

  it("should render empty string when company is null", () => {
    renderSaves([{ company: null, role_title: "SWE" }]);

    const company = document.querySelector(".company");

    expect(company.textContent).toBe("");
  });

  it("should render empty string when role_title is null", () => {
    renderSaves([{ company: "Acme", role_title: null }]);

    const role = document.querySelector(".role");

    expect(role.textContent).toBe("");
  });
});

// ── init() ───────────────────────────────────────────────────────────────────

describe("init()", () => {
  it("should show unauthenticated state when not authenticated", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ authenticated: false });

    await init();

    expect(document.getElementById("unauthenticated").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("authenticated").classList.contains("hidden")).toBe(true);
  });

  it("should show authenticated state when token is present", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ authenticated: true });
    chrome.storage.local.get.mockResolvedValue({ recent_saves: [] });

    await init();

    expect(document.getElementById("authenticated").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("unauthenticated").classList.contains("hidden")).toBe(true);
  });

  it("should render save items when authenticated with recent saves", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ authenticated: true });
    chrome.storage.local.get.mockResolvedValue({
      recent_saves: [{ company: "Meta", role_title: "SWE" }],
    });

    await init();

    expect(document.querySelector(".save-item")).not.toBeNull();
    expect(document.querySelector(".company").textContent).toBe("Meta");
  });

  it("should render empty message when authenticated but no saves cached", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ authenticated: true });
    chrome.storage.local.get.mockResolvedValue({ recent_saves: [] });

    await init();

    expect(document.querySelector(".empty")).not.toBeNull();
  });

  it("should default to empty saves if recent_saves key is missing from storage", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ authenticated: true });
    chrome.storage.local.get.mockResolvedValue({});

    await init();

    expect(document.getElementById("authenticated").classList.contains("hidden")).toBe(false);
    expect(document.querySelector(".empty")).not.toBeNull();
  });

  it("should not call storage when unauthenticated", async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ authenticated: false });

    await init();

    expect(chrome.storage.local.get).not.toHaveBeenCalled();
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
