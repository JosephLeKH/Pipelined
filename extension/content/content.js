/** Content script entry: detects job pages, extracts data, injects banner. */

import * as linkedin from "./boards/linkedin.js";
import * as greenhouse from "./boards/greenhouse.js";
import * as lever from "./boards/lever.js";
import * as ashby from "./boards/ashby.js";
import * as workday from "./boards/workday.js";

const BOARDS = [linkedin, greenhouse, lever, ashby, workday];

const PAGE_TEXT_MAX_CHARS = 3200;

const BANNER_AUTO_DISMISS_MS = 8000;
const BANNER_SUCCESS_DISMISS_MS = 1500;
const BANNER_DUPLICATE_DISMISS_MS = 6000;
const FADE_DURATION_MS = 300;
const MAX_Z_INDEX = "2147483647";
const APP_DASHBOARD_URL = "https://app.pipelined.app/dashboard";

const MSG = {
  SAVE_APPLICATION: "SAVE_APPLICATION",
};

const BANNER_CSS = `
.pipelined-banner {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #1e293b;
  color: #f8fafc;
  border-radius: 8px;
  padding: 16px 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.4;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  min-width: 280px;
  max-width: 360px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.pipelined-text { flex: 1; }
.pipelined-cta {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.pipelined-cta:hover { background: #2563eb; }
`;

function buildBannerContainer(fields) {
  const container = document.createElement("div");
  container.className = "pipelined-banner";
  container.setAttribute("role", "alert");
  container.setAttribute("aria-live", "polite");

  const textSpan = document.createElement("span");
  textSpan.className = "pipelined-text";
  textSpan.append("Applied for ");

  const roleEl = document.createElement("strong");
  roleEl.textContent = fields.role_title || "this role";
  textSpan.appendChild(roleEl);

  textSpan.append(" at ");

  const companyEl = document.createElement("strong");
  companyEl.textContent = fields.company_name || "this company";
  textSpan.appendChild(companyEl);
  textSpan.append("?");

  const button = document.createElement("button");
  button.className = "pipelined-cta";
  button.dataset.action = "save";
  button.textContent = "Save to Pipelined \u2192";

  container.appendChild(textSpan);
  container.appendChild(button);
  return container;
}

function init() {
  const board = BOARDS.find((b) => b.isJobPage());
  if (!board) return;

  const fields = board.extractFields();
  // Workday uses shadow DOM — show banner even when fields are null; OpenAI fallback fills them in.
  if (!fields.role_title && !fields.company_name && board.BOARD_ID !== "workday") {
    return;
  }

  injectBanner(fields, board.BOARD_ID);
}

function injectBanner(fields, boardId) {
  const host = document.createElement("pipelined-banner");
  host.style.position = "fixed";
  host.style.zIndex = MAX_Z_INDEX;

  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = BANNER_CSS;
  shadow.appendChild(style);

  const container = buildBannerContainer(fields);
  shadow.appendChild(container);

  document.body.appendChild(host);

  const timer = setTimeout(() => dismiss(host), BANNER_AUTO_DISMISS_MS);

  shadow.querySelector("[data-action='save']").addEventListener("click", async () => {
    clearTimeout(timer);
    await handleSave(shadow, host, fields, boardId);
  });

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") {
        clearTimeout(timer);
        dismiss(host);
      }
    },
    { once: true }
  );
}

async function handleSave(shadow, host, fields, boardId) {
  const button = shadow.querySelector("[data-action='save']");
  button.disabled = true;
  button.textContent = "Saving\u2026";

  const needsPageText = boardId === "workday" || (!fields.role_title && !fields.company_name);
  const pageText = needsPageText
    ? (document.body.innerText ?? "").trim().slice(0, PAGE_TEXT_MAX_CHARS)
    : null;

  const payload = {
    fields,
    boardId,
    pageText,
    sourceUrl: window.location.href,
  };

  let result;
  try {
    result = await chrome.runtime.sendMessage({ type: MSG.SAVE_APPLICATION, payload });
  } catch {
    result = { status: "error", message: "Extension error" };
  }

  if (result.status === "success") {
    showBannerSuccess(shadow, host);
  } else if (result.status === "duplicate") {
    showBannerDuplicate(shadow, host, result.existingId);
  } else {
    showBannerError(shadow, button);
  }
}

function showBannerSuccess(shadow, host) {
  shadow.querySelector(".pipelined-text").textContent = "\u2713 Saved to Pipelined!";
  const button = shadow.querySelector("[data-action='save']");
  if (button) button.remove();
  setTimeout(() => dismiss(host), BANNER_SUCCESS_DISMISS_MS);
}

function showBannerError(shadow, button) {
  shadow.querySelector(".pipelined-text").textContent = "Save failed \u2014 try again";
  button.disabled = false;
  button.textContent = "Retry";
}

function showBannerDuplicate(shadow, host, existingId) {
  shadow.querySelector(".pipelined-text").textContent = "Already in your pipeline!";
  const button = shadow.querySelector("[data-action='save']");
  const timer = setTimeout(() => dismiss(host), BANNER_DUPLICATE_DISMISS_MS);
  if (button) {
    button.disabled = false;
    button.textContent = "View \u2192";
    button.dataset.action = "view";
    button.addEventListener("click", () => {
      clearTimeout(timer);
      window.open(`${APP_DASHBOARD_URL}?selected=${existingId}`, "_blank");
      dismiss(host);
    });
  }
}

function dismiss(host) {
  host.style.opacity = "0";
  host.style.transition = "opacity 300ms ease";
  setTimeout(() => host.remove(), FADE_DURATION_MS);
}

if (document.readyState === "complete") {
  init();
} else {
  window.addEventListener("load", init, { once: true });
}

export { init, injectBanner, dismiss, BANNER_AUTO_DISMISS_MS, BANNER_SUCCESS_DISMISS_MS, FADE_DURATION_MS };
