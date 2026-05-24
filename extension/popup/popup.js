/** Popup: show last 5 saves with stage badges, link to dashboard, auth status. */

import { MSG, MAX_RECENT, APP_DASHBOARD_URL, MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from "../shared/constants.js";

// Stage badge colors (hex values match the frontend stage constants)
const STAGE_COLORS = {
  applied: { bg: "#dbeafe", text: "#1d4ed8", bar: "#3b82f6", label: "Applied" },
  "phone screen": { bg: "#ede9fe", text: "#6d28d9", bar: "#8b5cf6", label: "Phone Screen" },
  onsite: { bg: "#ffedd5", text: "#c2410c", bar: "#f97316", label: "Onsite" },
  offer: { bg: "#dcfce7", text: "#15803d", bar: "#22c55e", label: "Offer" },
  rejected: { bg: "#fee2e2", text: "#b91c1c", bar: "#ef4444", label: "Rejected" },
};

const DEFAULT_STAGE_COLOR = { bg: "#f1f5f9", text: "#475569", bar: "#94a3b8", label: "Applied" };

const FIT_HIGH_MIN = 80;
const FIT_MED_MIN = 50;
const FIT_LOW_MIN = 30;

const FIT_COLORS = {
  high: { bg: "#dcfce7", text: "#15803d" },
  med: { bg: "#fef9c3", text: "#a16207" },
  low: { bg: "#ffedd5", text: "#c2410c" },
  critical: { bg: "#fee2e2", text: "#b91c1c" },
};

function fitBadgeColors(score) {
  if (score >= FIT_HIGH_MIN) return FIT_COLORS.high;
  if (score >= FIT_MED_MIN) return FIT_COLORS.med;
  if (score >= FIT_LOW_MIN) return FIT_COLORS.low;
  return FIT_COLORS.critical;
}


/**
 * Escape a string for safe insertion into innerHTML.
 * Prefer textContent over innerHTML wherever possible.
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
 * Returns a human-readable relative time string for an ISO date string.
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
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function show(id) {
  const loading = document.getElementById("loading");
  const unauthenticated = document.getElementById("unauthenticated");
  const authenticated = document.getElementById("authenticated");
  const target = document.getElementById(id);
  if (loading) loading.classList.add("hidden");
  if (unauthenticated) unauthenticated.classList.add("hidden");
  if (authenticated) authenticated.classList.add("hidden");
  if (target) target.classList.remove("hidden");
}

function renderEmptyState(list, emptyState) {
  if (emptyState) {
    emptyState.classList.remove("hidden");
    if (list) list.classList.add("hidden");
  } else {
    // Legacy fallback for test environment (POPUP_HTML fixture without #empty-state)
    if (!list) return;
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No saved applications yet.";
    list.appendChild(empty);
  }
}

function buildFitBadge(score) {
  if (score == null) return null;
  const colors = fitBadgeColors(score);
  const badge = document.createElement("span");
  badge.className = "fit-badge";
  badge.textContent = `${score}%`;
  badge.style.background = colors.bg;
  badge.style.color = colors.text;
  badge.setAttribute("aria-label", `Fit score: ${score}%`);
  return badge;
}

function buildCardBody(s, stageStyle) {
  const company = document.createElement("span");
  company.className = "company";
  company.textContent = s.company || "";

  const role = document.createElement("span");
  role.className = "role";
  role.textContent = s.role_title || "";

  const info = document.createElement("div");
  info.className = "card-info";
  info.appendChild(company);
  info.appendChild(role);

  const badge = document.createElement("span");
  badge.className = "stage-badge";
  badge.textContent = stageStyle.label;
  badge.style.background = stageStyle.bg;
  badge.style.color = stageStyle.text;

  const time = document.createElement("span");
  time.className = "save-time";
  time.textContent = relativeTime(s.date_applied || s.saved_at || null);

  const meta = document.createElement("div");
  meta.className = "card-meta";
  meta.appendChild(badge);
  const fitBadge = buildFitBadge(s.fit_score);
  if (fitBadge) meta.appendChild(fitBadge);
  meta.appendChild(time);

  const body = document.createElement("div");
  body.className = "card-body";
  body.appendChild(info);
  body.appendChild(meta);
  return body;
}

function renderSaveItem(s) {
  const stageKey = (s.stage || "").toLowerCase();
  const stageStyle = STAGE_COLORS[stageKey] || DEFAULT_STAGE_COLOR;

  const bar = document.createElement("div");
  bar.className = "card-bar";
  bar.style.background = stageStyle.bar;

  // Overlay link — covers full card, opens dashboard with highlight param
  const link = document.createElement("a");
  link.className = "open-link";
  link.href = `${APP_DASHBOARD_URL}?highlight=${encodeURIComponent(s.id || "")}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.dataset.appId = s.id || "";

  const item = document.createElement("li");
  item.className = "save-item";
  item.appendChild(bar);
  item.appendChild(buildCardBody(s, stageStyle));
  item.appendChild(link);
  return item;
}

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
  saves.slice(0, MAX_RECENT).forEach((s) => list.appendChild(renderSaveItem(s)));
}

export function openDashboard() {
  chrome.tabs.create({ url: APP_DASHBOARD_URL });
}

export async function signOut() {
  try {
    await chrome.storage.session.clear();
  } catch (err) {
    console.error("[popup] Failed to clear session storage:", err);
  }
  try {
    await chrome.storage.local.remove("display_name");
  } catch (err) {
    console.error("[popup] Failed to remove display_name from local storage:", err);
  }
  show("unauthenticated");
}

export async function renderAutoSaveToggle() {
  const row = document.getElementById("auto-save-row");
  if (!row) return;
  let auto_save = false;
  try {
    const result = await chrome.storage.local.get("auto_save");
    auto_save = result.auto_save ?? false;
  } catch (err) { console.error("[popup] Failed to read auto_save:", err); return; }
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

  const signOutBtn = document.getElementById("sign-out");
  if (signOutBtn) {
    signOutBtn.classList.remove("hidden");
    signOutBtn.addEventListener("click", signOut);
  }

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
