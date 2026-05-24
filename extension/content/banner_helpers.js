/** Shared banner DOM utilities for the Pipelined content scripts. */

import { APP_DASHBOARD_URL } from "../shared/constants.js";

export const BANNER_AUTO_DISMISS_MS = 8000;
export const BANNER_SUCCESS_DISMISS_MS = 1500;
export const BANNER_DUPLICATE_DISMISS_MS = 6000;
export const FADE_DURATION_MS = 300;

const MAX_Z_INDEX = "2147483647";

export const BANNER_CSS = `
.pipelined-banner {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #ffffff;
  color: #141413;
  border: 1px solid #e7e5e4;
  border-radius: 12px;
  padding: 16px 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.4;
  box-shadow: 0 4px 24px rgba(20, 20, 19, 0.08);
  min-width: 280px;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}
.pipelined-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pipelined-text { flex: 1; }
.pipelined-cta {
  background: #d97757;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.pipelined-cta:hover { background: #c4673a; }
.pipelined-ai-badge {
  align-self: flex-start;
  background: #fae4d4;
  color: #7d4127;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
`;

/**
 * Creates a fixed-position shadow-DOM host with BANNER_CSS and a .pipelined-text span.
 * @param {string} [initialText] - Optional initial text for the .pipelined-text span.
 * @returns {{ host: HTMLElement, shadow: ShadowRoot }}
 */
export function createBannerHost(initialText = "") {
  const host = document.createElement("pipelined-banner");
  host.style.position = "fixed";
  host.style.zIndex = MAX_Z_INDEX;
  const shadow = host.attachShadow({ mode: "closed" });
  const styleEl = document.createElement("style");
  styleEl.textContent = BANNER_CSS;
  shadow.appendChild(styleEl);
  const container = document.createElement("div");
  container.className = "pipelined-banner";
  container.setAttribute("role", "alert");
  container.setAttribute("aria-live", "polite");
  const row = document.createElement("div");
  row.className = "pipelined-row";
  const textSpan = document.createElement("span");
  textSpan.className = "pipelined-text";
  textSpan.textContent = initialText;
  row.appendChild(textSpan);
  container.appendChild(row);
  shadow.appendChild(container);
  return { host, shadow };
}

export function dismiss(host) {
  host.style.opacity = "0";
  host.style.transition = `opacity ${FADE_DURATION_MS}ms ease`;
  setTimeout(() => host.remove(), FADE_DURATION_MS);
}

export function showBannerAiEnhanced(shadow) {
  const container = shadow.querySelector(".pipelined-banner");
  if (!container || container.querySelector(".pipelined-ai-badge")) return;
  const badge = document.createElement("span");
  badge.className = "pipelined-ai-badge";
  badge.textContent = "Enhanced with AI";
  container.appendChild(badge);
}

export function showBannerSuccess(shadow, host, { aiEnhanced = false } = {}) {
  shadow.querySelector(".pipelined-text").textContent = "\u2713 Saved to Pipelined!";
  if (aiEnhanced) showBannerAiEnhanced(shadow);
  shadow.querySelector("[data-action='save']")?.remove();
  setTimeout(() => dismiss(host), BANNER_SUCCESS_DISMISS_MS);
}

export function showBannerError(shadow, button) {
  shadow.querySelector(".pipelined-text").textContent = "Save failed \u2014 try again";
  button.disabled = false;
  button.textContent = "Retry";
}

export function showBannerDuplicate(shadow, host, existingId) {
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
