/** Greenhouse job board selectors and extraction logic. */

const BOARD_ID = "greenhouse";

const URL_PATTERN = /boards\.greenhouse\.io\/.+\/jobs\/\d+/;

/**
 * Returns true if the current page is a specific job posting.
 * Must be synchronous and fast — called on every page load.
 */
function isJobPage() {
  return (
    URL_PATTERN.test(window.location.href) &&
    !!document.querySelector("h1.app-title, #app_body h1")
  );
}

function getTitle() {
  return (
    document.querySelector("h1.app-title")?.textContent?.trim() ||
    document.querySelector("#app_body h1")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    null
  );
}

function getCompany() {
  return (
    document.querySelector(".company-name")?.textContent?.trim() ||
    document.querySelector("header .company-name")?.textContent?.trim() ||
    document.querySelector("#header .company-name")?.textContent?.trim() ||
    null
  );
}

function getLocation() {
  return (
    document.querySelector(".location")?.textContent?.trim() ||
    document.querySelector("[data-qa='job-location']")?.textContent?.trim() ||
    document.querySelector(".location-name")?.textContent?.trim() ||
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
