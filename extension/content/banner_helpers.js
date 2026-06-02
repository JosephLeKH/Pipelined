/** Shared banner DOM utilities for the Pipelined content scripts. */

import { APP_DASHBOARD_URL } from "../shared/constants.js";

export const BANNER_AUTO_DISMISS_MS = 8000;
export const BANNER_SUCCESS_DISMISS_MS = 4000;
export const BANNER_DUPLICATE_DISMISS_MS = 6000;
export const FADE_DURATION_MS = 220;

const MAX_Z_INDEX = "2147483647";

/* SYNC: extension/shared/tokens.css + extension/content/content.css */
export const BANNER_CSS = `
:root {
  --brand-600: #8C1515;
  --brand-700: #820000;
  --surface-0: #FFFFFF;
  --text-1: #2E2D29;
  --status-info: #3B82F6;
  --status-success: #175E54;
}
.pipelined-banner {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  background: var(--text-1);
  color: var(--surface-0);
  border-radius: 8px;
  padding: 12px 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1.4;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}
.pipelined-row { display: flex; align-items: center; gap: 10px; }
.pipelined-text { flex: 1; }
.pipelined-cta {
  background: var(--brand-600);
  color: var(--surface-0);
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.pipelined-cta:hover { background: var(--brand-700); }
.pipelined-cta:focus-visible { outline: 2px solid var(--brand-600); outline-offset: 2px; }
.pipelined-success-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  font-size: 13px;
}
.pipelined-check-icon { width: 14px; height: 14px; flex-shrink: 0; color: var(--status-success); }
.pipelined-detail { font-size: 12px; color: rgba(255, 255, 255, 0.85); margin: 0; }
.pipelined-dashboard-link {
  font-size: 12px;
  font-weight: 500;
  color: var(--surface-0);
  text-decoration: none;
}
.pipelined-dashboard-link:hover { text-decoration: underline; }
.pipelined-dashboard-link:focus-visible { outline: 1px solid var(--brand-600); outline-offset: 2px; }
.pipelined-ai-badge {
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.12);
  color: var(--surface-0);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
}
.pipelined-user-icon { width: 14px; height: 14px; flex-shrink: 0; color: var(--status-info); }
@media (prefers-reduced-motion: reduce) {
  .pipelined-banner, .pipelined-cta { transition: none !important; }
}
.pipelined-scout-glyph {
  width: 16px; height: 16px;
  border-radius: 9999px;
  background: var(--brand-600);
  color: var(--surface-0);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pipelined-scout-glyph svg { width: 60%; height: 60%; }
@media (prefers-reduced-motion: no-preference) {
  .pipelined-scout-glyph--working {
    box-shadow: 0 0 0 0 rgba(255,255,255,0.4);
    animation: pipelined-scout-ring 1.4s ease-in-out infinite;
  }
}
@keyframes pipelined-scout-ring {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.35); }
  50%      { box-shadow: 0 0 0 4px rgba(255,255,255,0); }
}
.pipelined-score-line {
  font-size: 12px;
  color: rgba(255,255,255,0.85);
  margin: 0;
}
.pipelined-score-line strong { color: var(--surface-0); font-weight: 600; }
`;

const CHECK_ICON_SVG = `<svg class="pipelined-check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

const USER_ICON_SVG = `<svg class="pipelined-user-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

const SCOUT_GLYPH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`;

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

/**
 * @param {HTMLElement} host
 */
export function dismiss(host) {
  const reduced = typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    host.remove();
    return;
  }
  host.style.opacity = "0";
  host.style.transition = `opacity ${FADE_DURATION_MS}ms ease`;
  setTimeout(() => host.remove(), FADE_DURATION_MS);
}

/**
 * @param {ShadowRoot} shadow
 */
export function showBannerAiEnhanced(shadow) {
  const container = shadow.querySelector(".pipelined-banner");
  if (!container || container.querySelector(".pipelined-ai-badge")) return;
  const badge = document.createElement("span");
  badge.className = "pipelined-ai-badge";
  badge.textContent = "Enhanced with AI";
  container.appendChild(badge);
}

/**
 * @param {ShadowRoot} shadow
 * @param {HTMLElement} host
 * @param {{ aiEnhanced?: boolean, application?: object|null, headline?: string, icon?: 'check'|'user' }} [opts]
 */
export function showBannerSuccess(shadow, host, { aiEnhanced = false, application = null, headline, icon = "check" } = {}) {
  const container = shadow.querySelector(".pipelined-banner");
  if (!container) return;

  container.replaceChildren();

  const header = document.createElement("div");
  header.className = "pipelined-success-header";
  header.innerHTML = icon === "user" ? USER_ICON_SVG : CHECK_ICON_SVG;
  const title = document.createElement("span");
  title.textContent = headline || "Saved to Pipelined";
  header.appendChild(title);
  container.appendChild(header);

  if (application?.company || application?.role_title) {
    const detail = document.createElement("p");
    detail.className = "pipelined-detail";
    const company = application.company || "";
    const role = application.role_title || "";
    detail.textContent = company && role ? `${company} · ${role}` : company || role;
    container.appendChild(detail);
  }

  if (application?.id) {
    const link = document.createElement("a");
    link.className = "pipelined-dashboard-link";
    link.href = `${APP_DASHBOARD_URL}?highlight=${encodeURIComponent(application.id)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open in dashboard \u2192";
    container.appendChild(link);
  }

  if (aiEnhanced) showBannerAiEnhanced(shadow);
  setTimeout(() => dismiss(host), BANNER_SUCCESS_DISMISS_MS);
}

/**
 * @param {ShadowRoot} shadow
 * @param {HTMLButtonElement} button
 */
export function showBannerError(shadow, button) {
  shadow.querySelector(".pipelined-text").textContent = "Save failed \u2014 try again";
  button.disabled = false;
  button.textContent = "Retry";
}

/**
 * @param {ShadowRoot} shadow
 * @param {HTMLElement} host
 * @param {string} existingId
 */
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

/**
 * Replaces the banner row with a sign-in CTA when the user is logged out.
 * @param {ShadowRoot} shadow
 * @param {HTMLElement} host
 * @param {() => void} onSignIn
 */
export function showBannerUnauth(shadow, host, onSignIn) {
  const text = shadow.querySelector(".pipelined-text");
  if (text) text.textContent = "Sign in so Scout can save this role";

  const button = document.createElement("button");
  button.className = "pipelined-cta";
  button.dataset.action = "signin";
  button.textContent = "Sign in \u2192";
  button.addEventListener("click", () => {
    onSignIn();
    dismiss(host);
  });
  const row = shadow.querySelector(".pipelined-row");
  if (row) row.appendChild(button);

  setTimeout(() => dismiss(host), BANNER_AUTO_DISMISS_MS);
}

/**
 * Show a working 'Scout is scoring\u2026' state right after a successful save.
 * Caller is responsible for upgrading to scored state OR letting the
 * 4-second auto-dismiss fire.
 * @param {ShadowRoot} shadow
 * @param {{ company?: string, role_title?: string }} app
 */
export function showBannerScoring(shadow, app) {
  const container = shadow.querySelector(".pipelined-banner");
  if (!container) return;
  container.replaceChildren();

  const header = document.createElement("div");
  header.className = "pipelined-success-header";
  header.innerHTML = `<span class="pipelined-scout-glyph pipelined-scout-glyph--working">${SCOUT_GLYPH_SVG}</span>`;
  const title = document.createElement("span");
  title.textContent = "Scout is scoring\u2026";
  header.appendChild(title);
  container.appendChild(header);

  if (app?.company || app?.role_title) {
    const detail = document.createElement("p");
    detail.className = "pipelined-detail";
    const company = app.company || "";
    const role = app.role_title || "";
    detail.textContent = company && role ? `${company} \u00b7 ${role}` : company || role;
    container.appendChild(detail);
  }
}

/**
 * Upgrade a 'scoring' banner to the final scored state.
 * @param {ShadowRoot} shadow
 * @param {HTMLElement} host
 * @param {{ id?: string, company?: string, role_title?: string, fit_score?: number|null, fit_score_reason?: string|null }} app
 */
export function showBannerScoutScored(shadow, host, app) {
  const container = shadow.querySelector(".pipelined-banner");
  if (!container) return;
  container.replaceChildren();

  const header = document.createElement("div");
  header.className = "pipelined-success-header";
  header.innerHTML = `<span class="pipelined-scout-glyph">${SCOUT_GLYPH_SVG}</span>`;
  const title = document.createElement("span");
  title.textContent = app.fit_score != null ? `Saved \u00b7 Scout: ${app.fit_score}` : "Saved to Pipelined";
  header.appendChild(title);
  container.appendChild(header);

  if (app.company || app.role_title) {
    const detail = document.createElement("p");
    detail.className = "pipelined-detail";
    detail.textContent = [app.company, app.role_title].filter(Boolean).join(" \u00b7 ");
    container.appendChild(detail);
  }
  if (app.fit_score_reason) {
    const line = document.createElement("p");
    line.className = "pipelined-score-line";
    line.textContent = app.fit_score_reason;
    container.appendChild(line);
  }
  if (app.id) {
    const link = document.createElement("a");
    link.className = "pipelined-dashboard-link";
    link.href = `${APP_DASHBOARD_URL}?highlight=${encodeURIComponent(app.id)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open in dashboard \u2192";
    container.appendChild(link);
  }
  setTimeout(() => dismiss(host), BANNER_SUCCESS_DISMISS_MS);
}
