/** Banner UI for LinkedIn profile contact-save flow. */

import {
  BANNER_AUTO_DISMISS_MS,
  BANNER_SUCCESS_DISMISS_MS,
  createBannerHost,
  dismiss,
} from "./banner_helpers.js";
import { MSG } from "../shared/constants.js";

export function injectContactBanner(fields) {
  const displayName = fields.name || "this person";
  const { host, shadow } = createBannerHost(`Save ${displayName}'s contact info?`);

  const button = document.createElement("button");
  button.className = "pipelined-cta";
  button.dataset.action = "save";
  button.textContent = "Save Contact \u2192";
  shadow.querySelector(".pipelined-banner").appendChild(button);

  document.body.appendChild(host);
  const timer = setTimeout(() => dismiss(host), BANNER_AUTO_DISMISS_MS);

  button.addEventListener("click", async () => {
    clearTimeout(timer);
    try {
      await handleContactSave(shadow, host, fields);
    } catch (err) {
      console.error("[contact_banner] Save contact failed:", err);
    }
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

async function handleContactSave(shadow, host, fields) {
  const button = shadow.querySelector("[data-action='save']");
  if (!button) return;
  button.disabled = true;
  button.textContent = "Saving\u2026";

  let result;
  try {
    result = await chrome.runtime.sendMessage({
      type: MSG.SAVE_CONTACT,
      payload: { fields, sourceUrl: window.location.href },
    });
  } catch {
    result = { status: "error", message: "Extension error" };
  }

  if (result.status === "success") {
    showContactSuccess(shadow, host, fields.name);
  } else {
    showContactError(shadow, button);
  }
}

function showContactSuccess(shadow, host, name) {
  const displayName = name || "Contact";
  shadow.querySelector(".pipelined-text").textContent =
    `\u2713 ${displayName} saved to Pipelined!`;
  shadow.querySelector("[data-action='save']")?.remove();
  setTimeout(() => dismiss(host), BANNER_SUCCESS_DISMISS_MS);
}

function showContactError(shadow, button) {
  shadow.querySelector(".pipelined-text").textContent = "Save failed \u2014 try again";
  button.disabled = false;
  button.textContent = "Retry";
}
