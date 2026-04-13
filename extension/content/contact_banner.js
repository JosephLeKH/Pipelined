/** Banner UI for LinkedIn profile contact-save flow. */

import {
  BANNER_AUTO_DISMISS_MS,
  createBannerHost,
  dismiss,
} from "./banner_helpers.js";

// MSG constants are duplicated across background.js, content.js, and contact_banner.js
// because content scripts don't support ES modules. Keep these in sync manually.
const MSG_SAVE_CONTACT = "SAVE_CONTACT";

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
    await handleContactSave(shadow, host, fields);
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
  button.disabled = true;
  button.textContent = "Saving\u2026";

  let result;
  try {
    result = await chrome.runtime.sendMessage({
      type: MSG_SAVE_CONTACT,
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
  setTimeout(() => dismiss(host), 1500);
}

function showContactError(shadow, button) {
  shadow.querySelector(".pipelined-text").textContent = "Save failed \u2014 try again";
  button.disabled = false;
  button.textContent = "Retry";
}
