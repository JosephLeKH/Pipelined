/** Popup: show last 5 saves with stage badges, link to dashboard, auth status. */

import { MSG, MAX_RECENT, APP_DASHBOARD_URL, MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from "../shared/constants.js";
import { stageAbbrev, stageDotColor } from "../shared/STAGE_ABBREV.js";
import { closeUserMenu, setupUserMenu } from "./popup_menu.js";

const FIT_HIGH_MIN = 80;
const FIT_MED_MIN = 50;
const FIT_LOW_MIN = 30;

const FIT_COLORS = {
  high: { bg: "var(--surface-2)", text: "var(--status-success)" },
  med: { bg: "var(--surface-2)", text: "var(--status-warn)" },
  low: { bg: "var(--surface-2)", text: "var(--status-orange)" },
  critical: { bg: "var(--surface-2)", text: "var(--status-muted)" },
};

/**
 * @param {number} score
 */
function fitBadgeColors(score) {
  if (score >= FIT_HIGH_MIN) return FIT_COLORS.high;
  if (score >= FIT_MED_MIN) return FIT_COLORS.med;
  if (score >= FIT_LOW_MIN) return FIT_COLORS.low;
  return FIT_COLORS.critical;
}

/**
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * @param {string|null} isoDate
 * @returns {string}
 */
export function relativeTime(isoDate) {
  if (!isoDate) return "";
  const diff = Date.now() - new Date(isoDate).getTime();
  if (diff < MS_PER_MINUTE) return "just now";
  if (diff < MS_PER_HOUR) return `${Math.floor(diff / MS_PER_MINUTE)}m ago`;
  if (diff < MS_PER_DAY) return `${Math.floor(diff / MS_PER_HOUR)}h ago`;
  const days = Math.floor(diff / MS_PER_DAY);
  return days === 1 ? "1d ago" : `${days}d ago`;
}

/**
 * @param {string} id
 */
export function show(id) {
  const loading = document.getElementById("loading");
  const unauthenticated = document.getElementById("unauthenticated");
  const authenticated = document.getElementById("authenticated");
  const footer = document.getElementById("footer");
  const target = document.getElementById(id);
  if (loading) loading.classList.add("hidden");
  if (unauthenticated) unauthenticated.classList.add("hidden");
  if (authenticated) authenticated.classList.add("hidden");
  if (target) target.classList.remove("hidden");
  if (footer) footer.classList.toggle("hidden", id === "unauthenticated");
}

function renderEmptyState(list, emptyState) {
  if (emptyState) {
    emptyState.classList.remove("hidden");
    if (list) list.classList.add("hidden");
    return;
  }
  if (!list) return;
  const empty = document.createElement("li");
  empty.className = "empty";
  empty.textContent = "Nothing saved yet.";
  list.appendChild(empty);
}

/**
 * @param {number} score
 */
function buildFitBadge(score) {
  const colors = fitBadgeColors(score);
  const badge = document.createElement("span");
  badge.className = "fit-badge";
  badge.textContent = `${score}%`;
  badge.style.background = colors.bg;
  badge.style.color = colors.text;
  badge.setAttribute("aria-label", `Fit score: ${score}%`);
  return badge;
}

/**
 * @param {object} s
 */
function buildCardMeta(s) {
  const badge = document.createElement("span");
  badge.className = "stage-badge";
  badge.textContent = stageAbbrev(s.stage);

  const time = document.createElement("span");
  time.className = "save-time";
  time.textContent = relativeTime(s.date_applied || s.saved_at || null);

  const meta = document.createElement("div");
  meta.className = "card-meta";
  meta.appendChild(badge);
  if (s.fit_score != null) meta.appendChild(buildFitBadge(s.fit_score));
  meta.appendChild(time);
  return meta;
}

/**
 * @param {object} s
 */
function renderSaveItem(s) {
  const dot = document.createElement("span");
  dot.className = "card-dot";
  dot.style.background = stageDotColor(s.stage);

  const company = document.createElement("div");
  company.className = "company";
  company.textContent = s.company || "";

  const role = document.createElement("div");
  role.className = "role";
  role.textContent = s.role_title || "";

  const info = document.createElement("div");
  info.className = "card-info";
  info.appendChild(company);
  info.appendChild(role);

  const link = document.createElement("a");
  link.className = "open-link";
  link.href = `${APP_DASHBOARD_URL}?highlight=${encodeURIComponent(s.id || "")}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", `Open ${s.company || "application"} application`);
  link.appendChild(dot);
  link.appendChild(info);
  link.appendChild(buildCardMeta(s));

  const item = document.createElement("li");
  item.className = "save-item";
  item.appendChild(link);
  return item;
}

/**
 * @param {object[]} saves
 */
export function renderApplyHints(saves) {
  const section = document.getElementById("apply-hints");
  const list = document.getElementById("hints-list");
  if (!section || !list) return;

  const hintsSave = saves.find((s) => Array.isArray(s.talking_points) && s.talking_points.length > 0);
  if (!hintsSave) {
    section.classList.add("hidden");
    list.replaceChildren();
    return;
  }

  section.classList.remove("hidden");
  list.replaceChildren();
  hintsSave.talking_points.forEach((point) => {
    const item = document.createElement("li");
    item.textContent = point;
    list.appendChild(item);
  });
}

/**
 * @param {object[]} saves
 */
export function renderSaves(saves) {
  const list = document.getElementById("saves-list");
  const emptyState = document.getElementById("empty-state");

  if (!saves.length) {
    renderEmptyState(list, emptyState);
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");
  if (!list) return;
  list.classList.remove("hidden");
  list.replaceChildren();
  saves.slice(0, MAX_RECENT).forEach((s) => list.appendChild(renderSaveItem(s)));
}

export function openDashboard() {
  chrome.tabs.create({ url: APP_DASHBOARD_URL });
}

export async function signOut() {
  try {
    await chrome.runtime.sendMessage({ type: MSG.LOGOUT });
  } catch (err) {
    console.error("[popup] LOGOUT message failed:", err);
  }
  closeUserMenu();
  show("unauthenticated");
}

export async function renderAutoSaveToggle() {
  const row = document.getElementById("auto-save-row");
  if (!row) return;
  let auto_save = false;
  try {
    const result = await chrome.storage.local.get("auto_save");
    auto_save = result.auto_save ?? false;
  } catch (err) {
    console.error("[popup] Failed to read auto_save:", err);
    return;
  }
  const btn = document.getElementById("auto-save-toggle");
  if (!btn) return;
  btn.setAttribute("aria-pressed", String(auto_save));
  btn.textContent = auto_save ? "ON" : "OFF";
  row.classList.remove("hidden");
  const freshBtn = btn.cloneNode(true);
  btn.replaceWith(freshBtn);
  freshBtn.addEventListener("click", async () => {
    const next = freshBtn.getAttribute("aria-pressed") !== "true";
    try {
      await chrome.storage.local.set({ auto_save: next });
      freshBtn.setAttribute("aria-pressed", String(next));
      freshBtn.textContent = next ? "ON" : "OFF";
    } catch (err) {
      console.error("[popup] Auto-save toggle failed:", err);
    }
  });
}

export async function init() {
  const authStatus = await chrome.runtime.sendMessage({ type: MSG.GET_AUTH_STATUS });

  if (!authStatus.authenticated) {
    show("unauthenticated");
    return;
  }

  if (authStatus.display_name) {
    const userNameEl = document.getElementById("user-name");
    if (userNameEl) userNameEl.textContent = authStatus.display_name;
  }

  setupUserMenu(signOut);

  let recent_saves = [];
  try {
    const result = await chrome.storage.local.get("recent_saves");
    recent_saves = result.recent_saves ?? [];
  } catch (err) {
    console.error("[popup] Failed to read recent_saves:", err);
  }
  renderSaves(recent_saves);
  renderApplyHints(recent_saves);
  show("authenticated");
  await renderAutoSaveToggle();
}

const openDashboardBtn = document.getElementById("open-dashboard");
if (openDashboardBtn) openDashboardBtn.addEventListener("click", openDashboard);
const openDashboardGhostBtn = document.getElementById("open-dashboard-ghost");
if (openDashboardGhostBtn) openDashboardGhostBtn.addEventListener("click", openDashboard);
const openDashboardAuthBtn = document.getElementById("open-dashboard-auth");
if (openDashboardAuthBtn) openDashboardAuthBtn.addEventListener("click", openDashboard);

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await init();
  } catch (err) {
    console.error("[Popup] init failed:", err);
    const app = document.getElementById("app");
    if (app) {
      const msg = document.createElement("p");
      msg.className = "error-state";
      msg.textContent = "Something went wrong. Please reload the extension.";
      app.appendChild(msg);
    }
  }
});
