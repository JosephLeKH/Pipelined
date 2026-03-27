/** Lever job board selectors and extraction logic. */

const BOARD_ID = "lever";

const URL_PATTERN = /jobs\.lever\.co\/.+\/.+/;

/**
 * Returns true if the current page is a specific job posting.
 * Must be synchronous and fast — called on every page load.
 */
function isJobPage() {
  return (
    URL_PATTERN.test(window.location.href) &&
    !!document.querySelector(".posting-headline h2, h2.posting-headline, .content h2")
  );
}

function getTitle() {
  return (
    document.querySelector(".posting-headline h2")?.textContent?.trim() ||
    document.querySelector("h2.posting-headline")?.textContent?.trim() ||
    document.querySelector(".content h2")?.textContent?.trim() ||
    document.querySelector("h2")?.textContent?.trim() ||
    null
  );
}

function getCompany() {
  return (
    document.querySelector(".main-header-logo img")?.getAttribute("alt")?.trim() ||
    document.querySelector(".main-header-logo")?.textContent?.trim() ||
    document.querySelector(".company-name")?.textContent?.trim() ||
    null
  );
}

function getLocation() {
  return (
    document.querySelector(".posting-categories .sort-by-location")?.textContent?.trim() ||
    document.querySelector(".posting-categories .location")?.textContent?.trim() ||
    document.querySelector(".location")?.textContent?.trim() ||
    null
  );
}

function getRemoteStatus(bodyText) {
  const text = bodyText.toLowerCase();
  if (text.includes("remote")) return "remote";
  if (text.includes("hybrid")) return "hybrid";
  if (text.includes("on-site") || text.includes("onsite")) return "onsite";
  return null;
}

/**
 * Extracts structured fields from the page DOM.
 * Returns an object with 6 fields. Any field can be null if not found.
 * Never throws — returns nulls for missing data.
 */
function extractFields() {
  return {
    role_title: getTitle(),
    company_name: getCompany(),
    compensation: null,
    company_type: null,
    location: getLocation(),
    remote_status: getRemoteStatus(document.body.innerText ?? document.body.textContent ?? ""),
  };
}

export { BOARD_ID, isJobPage, extractFields };
