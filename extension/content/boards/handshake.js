/** Handshake job board selectors and extraction logic. */

const BOARD_ID = "handshake";

const URL_PATTERN = /joinhandshake\.com\/jobs\//;

/**
 * Returns true if the current page is a specific job posting.
 * Must be synchronous and fast — called on every page load.
 */
function isJobPage() {
  return (
    URL_PATTERN.test(window.location.href) &&
    !!document.querySelector(
      "h1[data-hook='job-name'], h1.job-name, h1[class*='JobTitle'], [data-hook='job-name']"
    )
  );
}

function getTitle() {
  return (
    document.querySelector("h1[data-hook='job-name']")?.textContent?.trim() ||
    document.querySelector("h1.job-name")?.textContent?.trim() ||
    document.querySelector("h1[class*='JobTitle']")?.textContent?.trim() ||
    null
  );
}

function getCompany() {
  return (
    document.querySelector("[data-hook='employer-name']")?.textContent?.trim() ||
    document.querySelector(".employer-profile-banner--name")?.textContent?.trim() ||
    document.querySelector("[class*='EmployerName']")?.textContent?.trim() ||
    null
  );
}

function getLocation() {
  return (
    document.querySelector("[data-hook='location']")?.textContent?.trim() ||
    document.querySelector(".job-location")?.textContent?.trim() ||
    document.querySelector("[class*='JobLocation']")?.textContent?.trim() ||
    null
  );
}

function getRemoteStatus(location) {
  if (!location) return null;
  const text = location.toLowerCase();
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
  const location = getLocation();
  return {
    role_title: getTitle(),
    company_name: getCompany(),
    compensation: null,
    company_type: null,
    location,
    remote_status: getRemoteStatus(location),
  };
}

export { BOARD_ID, isJobPage, extractFields };
