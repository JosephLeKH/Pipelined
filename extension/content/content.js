/** Content script entry: detects job pages, extracts data, injects banner. */

import * as linkedin from "./boards/linkedin.js";
import * as greenhouse from "./boards/greenhouse.js";
import * as lever from "./boards/lever.js";
import * as ashby from "./boards/ashby.js";
import * as workday from "./boards/workday.js";
import * as indeed from "./boards/indeed.js";
import * as glassdoor from "./boards/glassdoor.js";
import * as wellfound from "./boards/wellfound.js";
import * as dice from "./boards/dice.js";
import * as handshake from "./boards/handshake.js";
import * as remoteok from "./boards/remoteok.js";
import * as linkedin_profile from "./boards/linkedin_profile.js";
import {
  BANNER_AUTO_DISMISS_MS,
  BANNER_DUPLICATE_DISMISS_MS,
  createBannerHost,
  dismiss,
  showBannerSuccess,
  showBannerError,
  showBannerDuplicate,
} from "./banner_helpers.js";
import { injectContactBanner } from "./contact_banner.js";
import { MSG, PAGE_TEXT_MAX_CHARS } from "../shared/constants.js";

const BOARDS = [
  linkedin, greenhouse, lever, ashby, workday,
  indeed, glassdoor, wellfound, dice, handshake, remoteok, linkedin_profile,
];

const AUTO_SAVE_DEBOUNCE_MS = 2000;
const AUTO_SAVE_SUCCESS_DISMISS_MS = 3000;

const savedUrls = new Set();

// Tracks the active Escape key listener so it can be replaced on new banners.
let _escapeController = null;

async function sendToBackground(type, payload) {
  try {
    return await chrome.runtime.sendMessage({ type, payload });
  } catch (err) {
    console.error("[content] sendMessage failed:", err);
    return { status: "error" };
  }
}

async function init() {
  const board = BOARDS.find((b) => b.isJobPage());
  if (!board) return;

  const fields = board.extractFields();
  if (!fields.role_title && !fields.company_name && board.BOARD_ID !== "workday") return;

  if (fields.type === "contact") {
    injectContactBanner(fields);
    return;
  }

  const autoSaveScheduled = await initAutoSave(fields, board.BOARD_ID);
  if (!autoSaveScheduled) {
    injectBanner(fields, board.BOARD_ID);
  }
}

function injectBanner(fields, boardId) {
  const displayText = `Applied for ${fields.role_title || "this role"} at ${fields.company_name || "this company"}?`;
  const { host, shadow } = createBannerHost(displayText);

  const button = document.createElement("button");
  button.className = "pipelined-cta";
  button.dataset.action = "save";
  button.textContent = "Save to Pipelined \u2192";
  shadow.querySelector(".pipelined-banner").appendChild(button);

  document.body.appendChild(host);
  const timer = setTimeout(() => dismiss(host), BANNER_AUTO_DISMISS_MS);

  button.addEventListener("click", async () => {
    clearTimeout(timer);
    try {
      await handleSave(shadow, host, fields, boardId);
    } catch (err) {
      console.error("[content] Save failed:", err);
    }
  });

  if (_escapeController) _escapeController.abort();
  _escapeController = new AbortController();
  const escapeSignal = _escapeController.signal;
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") {
        clearTimeout(timer);
        dismiss(host);
      }
    },
    { signal: escapeSignal }
  );
}

async function handleSave(shadow, host, fields, boardId) {
  const button = shadow.querySelector("[data-action='save']");
  if (!button) return;
  button.disabled = true;
  button.textContent = "Saving\u2026";

  const needsPageText = boardId === "workday" || (!fields.role_title && !fields.company_name);
  const pageText = needsPageText
    ? (document.body.innerText ?? "").trim().slice(0, PAGE_TEXT_MAX_CHARS)
    : null;

  const payload = { fields, boardId, pageText, sourceUrl: window.location.href };

  const result = await sendToBackground(MSG.SAVE_APPLICATION, payload);

  if (result.status === "success") {
    showBannerSuccess(shadow, host);
  } else if (result.status === "duplicate") {
    showBannerDuplicate(shadow, host, result.existingId);
  } else {
    showBannerError(shadow, button);
  }
}

function showBannerAutoSaved(shadow, host) {
  shadow.querySelector(".pipelined-text").textContent = "\u2713 Saved to Pipelined!";
  setTimeout(() => dismiss(host), AUTO_SAVE_SUCCESS_DISMISS_MS);
}

function showBannerAutoSaveFailed(shadow, host, payload) {
  shadow.querySelector(".pipelined-text").textContent = "Auto-save failed \u2014 try again";
  const btn = document.createElement("button");
  btn.className = "pipelined-cta";
  btn.textContent = "Retry";
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Saving\u2026";
    const res = await sendToBackground(MSG.SAVE_APPLICATION, payload);
    if (res.status === "success") showBannerAutoSaved(shadow, host);
    else if (res.status === "duplicate") showBannerDuplicate(shadow, host, res.existingId);
    else { btn.disabled = false; btn.textContent = "Retry"; }
  });
  shadow.querySelector(".pipelined-banner").appendChild(btn);
}

export async function initAutoSave(fields, boardId) {
  let auto_save = false;
  try {
    const result = await chrome.storage.local.get("auto_save");
    auto_save = result.auto_save ?? false;
  } catch (err) { console.error("[content] Failed to read auto_save:", err); return false; }
  if (!auto_save) return false;

  const url = window.location.href;
  if (savedUrls.has(url)) return false;
  savedUrls.add(url);

  const timer = setTimeout(async () => {
    const { host, shadow } = createBannerHost("Auto-saving\u2026");
    document.body.appendChild(host);
    const needsPageText = boardId === "workday" || (!fields.role_title && !fields.company_name);
    const payload = {
      fields, boardId, sourceUrl: url,
      pageText: needsPageText
        ? (document.body.innerText ?? "").trim().slice(0, PAGE_TEXT_MAX_CHARS)
        : null,
    };
    const result = await sendToBackground(MSG.SAVE_APPLICATION, payload);
    if (result.status === "success") showBannerAutoSaved(shadow, host);
    else if (result.status === "duplicate") showBannerDuplicate(shadow, host, result.existingId);
    else showBannerAutoSaveFailed(shadow, host, payload);
  }, AUTO_SAVE_DEBOUNCE_MS);

  window.addEventListener("popstate", () => clearTimeout(timer), { once: true });
  return true;
}

export function clearSavedUrls() { savedUrls.clear(); }

if (document.readyState === "complete") {
  init();
} else {
  window.addEventListener("load", init, { once: true });
}

export { init, injectBanner, AUTO_SAVE_DEBOUNCE_MS };
