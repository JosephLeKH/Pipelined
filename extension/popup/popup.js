/** Popup: show last 5 saves with stage badges, link to dashboard, auth status. */

const DASHBOARD_URL = "https://app.pipelined.app/dashboard";
const MAX_RECENT = 5;

// Stage badge colors (hex values match the frontend stage constants)
const STAGE_COLORS = {
  applied: { bg: "#dbeafe", text: "#1d4ed8", bar: "#3b82f6", label: "Applied" },
  "phone screen": { bg: "#ede9fe", text: "#6d28d9", bar: "#8b5cf6", label: "Phone Screen" },
  onsite: { bg: "#ffedd5", text: "#c2410c", bar: "#f97316", label: "Onsite" },
  offer: { bg: "#dcfce7", text: "#15803d", bar: "#22c55e", label: "Offer" },
  rejected: { bg: "#fee2e2", text: "#b91c1c", bar: "#ef4444", label: "Rejected" },
};

const DEFAULT_STAGE_COLOR = { bg: "#f1f5f9", text: "#475569", bar: "#94a3b8", label: "Applied" };

const MSG = {
  GET_AUTH_STATUS: "GET_AUTH_STATUS",
  GET_RECENT_SAVES: "GET_RECENT_SAVES",
};

const MS_PER_DAY = 86400000;
const MS_PER_HOUR = 3600000;
const MS_PER_MINUTE = 60000;

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
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("unauthenticated").classList.add("hidden");
  document.getElementById("authenticated").classList.add("hidden");
  document.getElementById(id).classList.remove("hidden");
}

export function renderSaves(saves) {
  const list = document.getElementById("saves-list");
  const emptyState = document.getElementById("empty-state");

  if (!saves.length) {
    // New popup.html: use #empty-state div if present
    if (emptyState) {
      emptyState.classList.remove("hidden");
      if (list) list.classList.add("hidden");
    } else {
      // Legacy fallback for test environment (POPUP_HTML fixture without #empty-state)
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "No saved applications yet.";
      list.appendChild(empty);
    }
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");
  if (list) list.classList.remove("hidden");

  saves.slice(0, MAX_RECENT).forEach((s) => {
    const item = document.createElement("li");
    item.className = "save-item";

    const stageKey = (s.stage || "").toLowerCase();
    const stageStyle = STAGE_COLORS[stageKey] || DEFAULT_STAGE_COLOR;

    // Left colored bar (3px, stage-colored)
    const bar = document.createElement("div");
    bar.className = "card-bar";
    bar.style.background = stageStyle.bar;

    // Card body: info (left) + meta (right)
    const body = document.createElement("div");
    body.className = "card-body";

    const info = document.createElement("div");
    info.className = "card-info";

    const company = document.createElement("span");
    company.className = "company";
    company.textContent = s.company || "";

    const role = document.createElement("span");
    role.className = "role";
    role.textContent = s.role_title || "";

    info.appendChild(company);
    info.appendChild(role);

    const meta = document.createElement("div");
    meta.className = "card-meta";

    const badge = document.createElement("span");
    badge.className = "stage-badge";
    badge.textContent = stageStyle.label;
    badge.style.background = stageStyle.bg;
    badge.style.color = stageStyle.text;

    const time = document.createElement("span");
    time.className = "save-time";
    time.textContent = relativeTime(s.date_applied || s.saved_at || null);

    meta.appendChild(badge);
    meta.appendChild(time);

    body.appendChild(info);
    body.appendChild(meta);

    // Overlay link — covers full card, opens dashboard with highlight param
    const link = document.createElement("a");
    link.className = "open-link";
    link.href = `${DASHBOARD_URL}?highlight=${encodeURIComponent(s.id || "")}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.appId = s.id || "";

    item.appendChild(bar);
    item.appendChild(body);
    item.appendChild(link);
    list.appendChild(item);
  });
}

export function openDashboard() {
  chrome.tabs.create({ url: DASHBOARD_URL });
}

export function signOut() {
  chrome.storage.session.clear();
  show("unauthenticated");
}

export async function renderAutoSaveToggle() {
  const row = document.getElementById("auto-save-row");
  if (!row) return;
  let auto_save = false;
  try {
    const result = await chrome.storage.local.get("auto_save");
    auto_save = result.auto_save ?? false;
  } catch { return; }
  const btn = document.getElementById("auto-save-toggle");
  btn.setAttribute("aria-pressed", String(auto_save));
  btn.textContent = auto_save ? "ON" : "OFF";
  row.classList.remove("hidden");
  btn.addEventListener("click", async () => {
    const next = btn.getAttribute("aria-pressed") !== "true";
    await chrome.storage.local.set({ auto_save: next });
    btn.setAttribute("aria-pressed", String(next));
    btn.textContent = next ? "ON" : "OFF";
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

  const { recent_saves = [] } = await chrome.storage.local.get("recent_saves");
  renderSaves(recent_saves);
  show("authenticated");
  await renderAutoSaveToggle();
}

document.getElementById("open-dashboard").addEventListener("click", openDashboard);
document.getElementById("open-dashboard-auth").addEventListener("click", openDashboard);

document.addEventListener("DOMContentLoaded", init);
