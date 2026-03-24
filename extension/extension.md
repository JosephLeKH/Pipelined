# Style Guide — Chrome Extension (MV3)

**Scope:** All code in `/extension`  
**Runtime:** Chrome Manifest V3, content scripts, service worker, popup  
**Load alongside:** `STYLE_GUIDE.md`

---

## 1. Architecture

```
extension/
├── manifest.json                # MV3 manifest: permissions, matches, service_worker
├── content/
│   ├── content.js              # Entry: detection, banner injection, message passing
│   ├── content.css             # Banner styles (injected into shadow DOM)
│   └── boards/
│       ├── linkedin.js         # LinkedIn DOM selectors + extraction
│       ├── greenhouse.js       # Greenhouse selectors
│       ├── lever.js            # Lever selectors
│       ├── ashby.js            # Ashby selectors
│       └── workday.js          # Workday text extraction for OpenAI fallback
├── background/
│   └── background.js           # Service worker: API calls, token mgmt, message router
├── popup/
│   ├── popup.html              # Popup structure
│   ├── popup.js                # Popup logic
│   └── popup.css               # Popup styles
└── tests/
    ├── test_detection.js
    ├── test_extraction.js
    ├── test_banner.js
    └── test_service_worker.js
```

### 1.1 Layer Responsibilities

| Layer | Can Access | Cannot Access |
|---|---|---|
| Content script | Page DOM, `chrome.runtime.sendMessage` | `chrome.storage`, `fetch` to API (cross-origin) |
| Service worker | `chrome.storage`, `fetch`, `chrome.runtime.onMessage` | Page DOM, `window`, `document` |
| Popup | `chrome.storage`, `chrome.runtime.sendMessage`, own DOM | Page DOM, `fetch` to API (delegate to service worker) |

**Hard rule:** Content scripts never call the Pipelined API directly. They extract data and send it to the service worker via `chrome.runtime.sendMessage`. The service worker handles all network I/O.

---

## 2. Manifest

```json
{
  "manifest_version": 3,
  "name": "Pipelined",
  "version": "1.0.0",
  "description": "Track job applications in one click.",
  "permissions": ["storage", "activeTab"],
  "host_permissions": [
    "https://api.pipelined.app/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "https://www.linkedin.com/jobs/*",
        "https://boards.greenhouse.io/*",
        "https://jobs.lever.co/*",
        "https://jobs.ashbyhq.com/*",
        "https://*.myworkday.com/*"
      ],
      "js": ["content/content.js"],
      "css": ["content/content.css"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background/background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  }
}
```

### 2.1 Permission Rules

- **Request minimum permissions.** `storage` for token caching. `activeTab` for content script context. `host_permissions` scoped to the API domain only.
- **Never request `<all_urls>`, `tabs`, `webRequest`, or `cookies` permissions.** They trigger Chrome Web Store review flags and are unnecessary.
- **Content script URL matches are the access control.** If we add a new board, add a new match pattern. Never use a wildcard match like `*://*/*`.

---

## 3. Content Script Patterns

### 3.1 Board Module Interface

Every board module exports the same shape. This is a strict contract.

```javascript
/** LinkedIn job page selectors and extraction logic. */

const BOARD_ID = "linkedin";

const URL_PATTERN = /linkedin\.com\/jobs\/view\//;

/**
 * Returns true if the current page is a specific job posting (not search results).
 * Must be synchronous and fast — called on every page load.
 */
function isJobPage() {
  return (
    URL_PATTERN.test(window.location.href) &&
    !!document.querySelector(".job-details-jobs-unified-top-card__job-title")
  );
}

/**
 * Extracts structured fields from the page DOM.
 * Returns an object with 6 fields. Any field can be null if not found.
 * Must not throw — return nulls for missing data.
 */
function extractFields() {
  const title = document.querySelector(
    ".job-details-jobs-unified-top-card__job-title"
  );
  const company = document.querySelector(
    ".job-details-jobs-unified-top-card__company-name"
  );
  const location = document.querySelector(
    ".job-details-jobs-unified-top-card__bullet"
  );

  const bodyText = document.body.innerText.toLowerCase();
  const remoteStatus = bodyText.includes("remote")
    ? "remote"
    : bodyText.includes("hybrid")
      ? "hybrid"
      : bodyText.includes("on-site") || bodyText.includes("onsite")
        ? "onsite"
        : null;

  return {
    role_title: title?.textContent?.trim() || null,
    company_name: company?.textContent?.trim() || null,
    compensation: null, // LinkedIn rarely shows this in DOM
    company_type: null,
    location: location?.textContent?.trim() || null,
    remote_status: remoteStatus,
  };
}

export { BOARD_ID, isJobPage, extractFields };
```

**Rules for board modules:**

- **Never throw.** `extractFields()` returns `null` for any field it can't find. The caller handles incomplete data.
- **Selectors use a fallback chain.** If the primary selector fails, try a known alternate. Sites change markup; multiple selectors improve resilience.

```javascript
// CORRECT — fallback chain
function getTitle() {
  return (
    document.querySelector(".job-title-v2")?.textContent?.trim() ||
    document.querySelector(".job-title")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    null
  );
}
```

- **`isJobPage()` must be fast and synchronous.** It runs on every page load for matching domains. No async, no DOM-heavy queries. URL regex + one selector check.

### 3.2 Content Script Entry

```javascript
/** Content script entry: detects job pages, extracts data, injects banner. */

import * as linkedin from "./boards/linkedin.js";
import * as greenhouse from "./boards/greenhouse.js";
import * as lever from "./boards/lever.js";
import * as ashby from "./boards/ashby.js";
import * as workday from "./boards/workday.js";

const BOARDS = [linkedin, greenhouse, lever, ashby, workday];
const BANNER_AUTO_DISMISS_MS = 8000;
const BANNER_SUCCESS_DISMISS_MS = 1500;

function init() {
  const board = BOARDS.find((b) => b.isJobPage());
  if (!board) return; // Not a job page — do nothing

  const fields = board.extractFields();
  if (!fields.role_title && !fields.company_name) {
    // Nothing useful extracted — skip banner
    return;
  }

  injectBanner(fields, board.BOARD_ID);
}

// Run after DOM is idle
if (document.readyState === "complete") {
  init();
} else {
  window.addEventListener("load", init, { once: true });
}
```

### 3.3 Shadow DOM Isolation

**The banner must be injected inside a Shadow DOM** to prevent host page styles from breaking it. This is mandatory.

```javascript
function injectBanner(fields, boardId) {
  const host = document.createElement("pipelined-banner");
  const shadow = host.attachShadow({ mode: "closed" });

  // Inject styles (bundled inline, not external stylesheet)
  const style = document.createElement("style");
  style.textContent = BANNER_CSS; // imported from content.css at build time
  shadow.appendChild(style);

  const container = document.createElement("div");
  container.className = "pipelined-banner";
  container.setAttribute("role", "alert");
  container.setAttribute("aria-live", "polite");
  container.innerHTML = buildBannerHTML(fields);
  shadow.appendChild(container);

  document.body.appendChild(host);

  // Auto-dismiss
  const timer = setTimeout(() => dismiss(host), BANNER_AUTO_DISMISS_MS);

  // Save button
  shadow.querySelector("[data-action='save']").addEventListener("click", async () => {
    clearTimeout(timer);
    await handleSave(shadow, host, fields, boardId);
  });

  // Dismiss on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      clearTimeout(timer);
      dismiss(host);
    }
  }, { once: true });
}

function dismiss(host) {
  host.style.opacity = "0";
  host.style.transition = "opacity 300ms ease";
  setTimeout(() => host.remove(), 300);
}
```

---

## 4. Service Worker Patterns

### 4.1 Message Protocol

All messages between content script and service worker follow a typed protocol:

```javascript
// Message types — shared constants
const MSG = {
  SAVE_APPLICATION: "SAVE_APPLICATION",
  SAVE_RESULT: "SAVE_RESULT",
  GET_AUTH_STATUS: "GET_AUTH_STATUS",
  AUTH_STATUS: "AUTH_STATUS",
  GET_RECENT_SAVES: "GET_RECENT_SAVES",
  RECENT_SAVES: "RECENT_SAVES",
};
```

```javascript
// Content script → service worker
chrome.runtime.sendMessage({
  type: MSG.SAVE_APPLICATION,
  payload: {
    fields,
    boardId,
    pageText: boardId === "workday" ? document.body.innerText : null,
    sourceUrl: window.location.href,
  },
});

// Service worker — listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MSG.SAVE_APPLICATION) {
    handleSave(message.payload).then(sendResponse);
    return true; // keep channel open for async response
  }
});
```

**Rules:**
- **Every message has a `type` string and a `payload` object.** No untyped messages.
- **Return `true` from `onMessage` listener when the response is async.** This keeps the message channel open.
- **Never pass functions, DOM nodes, or circular references in messages.** They can't be serialized.

### 4.2 Token Management

```javascript
/** Auth token management for extension API calls. */

const TOKEN_KEY = "pipelined_auth_token";
const API_BASE = "https://api.pipelined.app";

async function getToken() {
  const result = await chrome.storage.session.get(TOKEN_KEY);
  return result[TOKEN_KEY] || null;
}

async function setToken(token) {
  await chrome.storage.session.set({ [TOKEN_KEY]: token });
}

async function clearToken() {
  await chrome.storage.session.remove(TOKEN_KEY);
}

async function fetchWithAuth(path, options = {}) {
  const token = await getToken();
  if (!token) {
    return { ok: false, status: 401, error: "NOT_AUTHENTICATED" };
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Token expired — try refresh
    const refreshed = await refreshToken();
    if (refreshed) {
      return fetchWithAuth(path, options); // Retry once
    }
    await clearToken();
    return { ok: false, status: 401, error: "SESSION_EXPIRED" };
  }

  return response.json();
}

async function refreshToken() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/extension-token`, {
      credentials: "include",
    });
    if (response.ok) {
      const data = await response.json();
      await setToken(data.data.token);
      return true;
    }
  } catch {
    // Refresh failed
  }
  return false;
}
```

**Rules:**
- **Use `chrome.storage.session` for tokens.** Cleared when Chrome closes. Never use `chrome.storage.local` for auth tokens (persists across sessions = security risk).
- **Use `chrome.storage.local` only for non-sensitive caches** (last 5 saves for popup display).
- **Never store the full JWT payload.** Store only the opaque token string.

### 4.3 Request Serialization

Multiple tabs can trigger saves simultaneously. Serialize API calls to prevent duplicate guard race conditions.

```javascript
let saveQueue = Promise.resolve();

async function handleSave(payload) {
  // Enqueue — each save waits for the previous one
  const result = await (saveQueue = saveQueue.then(() => executeSave(payload)));
  return result;
}

async function executeSave(payload) {
  const { fields, boardId, pageText, sourceUrl } = payload;

  const body = {
    role_title: fields.role_title,
    company: fields.company_name,
    compensation: fields.compensation,
    company_type: fields.company_type,
    location: fields.location,
    remote_status: fields.remote_status,
    source_url: sourceUrl,
    source: "extension",
  };

  // Include page text for OpenAI fallback if needed
  if (pageText && (!fields.role_title || !fields.company_name)) {
    body._page_text = pageText.slice(0, 3200); // ~800 tokens
  }

  const response = await fetchWithAuth("/api/applications", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (response.error?.code === "DUPLICATE_APPLICATION") {
    return { status: "duplicate", existingId: response.error.details.existing_id };
  }

  if (!response.data) {
    return { status: "error", message: response.error?.message || "Save failed" };
  }

  // Cache for popup
  await cacheRecentSave(response.data);

  return { status: "success", application: response.data };
}
```

---

## 5. Popup

- **Popup must render in under 200ms.** It's a flyout menu, not a full app. No heavy frameworks.
- **Use vanilla JS** for the popup. No React, no build step. The popup is 3 files (HTML, JS, CSS).
- **Data comes from `chrome.storage.local`** (cached recent saves), not from API calls. The popup should never block on network requests to render.

```javascript
/** Popup: show last 5 saves, link to dashboard, auth status. */

const DASHBOARD_URL = "https://app.pipelined.app/dashboard";
const MAX_RECENT = 5;

document.addEventListener("DOMContentLoaded", async () => {
  // Check auth
  const authStatus = await chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" });
  if (!authStatus.authenticated) {
    showLoginPrompt();
    return;
  }

  // Load cached saves (from chrome.storage.local, not network)
  const { recent_saves = [] } = await chrome.storage.local.get("recent_saves");
  renderSaves(recent_saves.slice(0, MAX_RECENT));
});

function renderSaves(saves) {
  const list = document.getElementById("saves-list");
  if (!saves.length) {
    list.innerHTML = '<p class="empty">No saved applications yet.</p>';
    return;
  }
  list.innerHTML = saves
    .map(
      (s) => `
      <div class="save-item">
        <span class="company">${escapeHtml(s.company)}</span>
        <span class="role">${escapeHtml(s.role_title)}</span>
      </div>
    `
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
```

**Rules:**
- **Always escape user-generated content** before injecting into HTML. Use `textContent` or a manual escape function. Never use `innerHTML` with unsanitized data.
- **Popup links to dashboard open in a new tab:** `chrome.tabs.create({ url: DASHBOARD_URL })`.

---

## 6. Testing

### 6.1 Content Script Tests

Test against **saved HTML snapshots** of real job pages. Store snapshots in `tests/fixtures/`.

```javascript
import { readFileSync } from "fs";
import { JSDOM } from "jsdom";
import { isJobPage, extractFields } from "../content/boards/linkedin.js";

describe("LinkedIn board module", () => {
  let dom;

  beforeEach(() => {
    const html = readFileSync("tests/fixtures/linkedin-swe-posting.html", "utf-8");
    dom = new JSDOM(html, { url: "https://www.linkedin.com/jobs/view/12345" });
    global.document = dom.window.document;
    global.window = dom.window;
  });

  it("should detect a job posting page", () => {
    expect(isJobPage()).toBe(true);
  });

  it("should extract role title", () => {
    const fields = extractFields();
    expect(fields.role_title).toBe("Software Engineer");
  });

  it("should extract company name", () => {
    const fields = extractFields();
    expect(fields.company_name).toBe("Acme Corp");
  });

  it("should return null for fields not present in DOM", () => {
    const fields = extractFields();
    // LinkedIn doesn't show compensation in DOM
    expect(fields.compensation).toBeNull();
  });
});
```

### 6.2 Service Worker Tests

Mock `chrome` APIs with `jest-chrome`. Mock `fetch` for API calls.

```javascript
import { chrome } from "jest-chrome";

describe("handleSave", () => {
  beforeEach(() => {
    chrome.storage.session.get.mockResolvedValue({ pipelined_auth_token: "test-token" });
    global.fetch = vi.fn();
  });

  it("should POST to /api/applications with extracted fields", async () => {
    fetch.mockResolvedValue({
      json: () => Promise.resolve({ data: { id: "abc", company: "Acme" } }),
    });

    const result = await handleSave({
      fields: { role_title: "SWE", company_name: "Acme" },
      boardId: "linkedin",
      pageText: null,
      sourceUrl: "https://linkedin.com/jobs/view/123",
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/applications"),
      expect.objectContaining({ method: "POST" })
    );
    expect(result.status).toBe("success");
  });

  it("should return duplicate status on 409", async () => {
    fetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          error: { code: "DUPLICATE_APPLICATION", details: { existing_id: "xyz" } },
        }),
    });

    const result = await handleSave({
      fields: { role_title: "SWE", company_name: "Acme" },
      boardId: "linkedin",
      pageText: null,
      sourceUrl: "https://linkedin.com/jobs/view/123",
    });

    expect(result.status).toBe("duplicate");
    expect(result.existingId).toBe("xyz");
  });
});
```

### 6.3 Snapshot Maintenance

- **Re-capture snapshots quarterly** or whenever a board module breaks. DOM structures change.
- **Store minimal snapshots.** Strip scripts, images, and non-job-related DOM. Keep only the elements the selectors target + enough structure for `isJobPage()` to work.
- **Each snapshot file is named:** `{board}-{role-type}-{date}.html` (e.g., `linkedin-swe-2026-03.html`).
