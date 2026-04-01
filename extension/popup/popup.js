/** Popup: show last 5 saves, link to dashboard, auth status. */

const DASHBOARD_URL = "https://app.pipelined.app/dashboard";
const MAX_RECENT = 5;

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

const MSG = {
  GET_AUTH_STATUS: "GET_AUTH_STATUS",
  GET_RECENT_SAVES: "GET_RECENT_SAVES",
};

export function show(id) {
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("unauthenticated").classList.add("hidden");
  document.getElementById("authenticated").classList.add("hidden");
  document.getElementById(id).classList.remove("hidden");
}

export function renderSaves(saves) {
  const list = document.getElementById("saves-list");

  if (!saves.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No saved applications yet.";
    list.appendChild(empty);
    return;
  }

  saves.slice(0, MAX_RECENT).forEach((s) => {
    const item = document.createElement("li");
    item.className = "save-item";

    const company = document.createElement("span");
    company.className = "company";
    company.textContent = s.company || "";

    const role = document.createElement("span");
    role.className = "role";
    role.textContent = s.role_title || "";

    item.appendChild(company);
    item.appendChild(role);
    list.appendChild(item);
  });
}

export function openDashboard() {
  chrome.tabs.create({ url: DASHBOARD_URL });
}

export async function init() {
  const authStatus = await chrome.runtime.sendMessage({ type: MSG.GET_AUTH_STATUS });

  if (!authStatus.authenticated) {
    show("unauthenticated");
    return;
  }

  const { recent_saves = [] } = await chrome.storage.local.get("recent_saves");
  renderSaves(recent_saves);
  show("authenticated");
}

document.getElementById("open-dashboard").addEventListener("click", openDashboard);
document.getElementById("open-dashboard-auth").addEventListener("click", openDashboard);

document.addEventListener("DOMContentLoaded", init);
