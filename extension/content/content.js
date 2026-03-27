/** Content script entry: detects job pages, extracts data, injects banner. */

import * as linkedin from "./boards/linkedin.js";
import * as greenhouse from "./boards/greenhouse.js";
import * as lever from "./boards/lever.js";
import * as ashby from "./boards/ashby.js";

const BOARDS = [linkedin, greenhouse, lever, ashby];

const BANNER_AUTO_DISMISS_MS = 8000;
const FADE_DURATION_MS = 300;
const MAX_Z_INDEX = "2147483647";

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
  if (!fields.role_title && !fields.company_name) {
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

export { init, injectBanner, dismiss, BANNER_AUTO_DISMISS_MS, FADE_DURATION_MS };
