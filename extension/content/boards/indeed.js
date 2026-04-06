/** Indeed job board selectors and extraction logic. */

const BOARD_ID = "indeed";

const URL_PATTERN = /www\.indeed\.com\/viewjob/;

/**
 * Returns true if the current page is a specific job posting.
 * Must be synchronous and fast — called on every page load.
 */
function isJobPage() {
  return (
    URL_PATTERN.test(window.location.href) &&
    !!document.querySelector(".jobsearch-JobInfoHeader-title, h1[data-testid='jobsearch-JobInfoHeader-title']")
  );
}

function getTitle() {
  return (
    document.querySelector(".jobsearch-JobInfoHeader-title")?.textContent?.trim() ||
    document.querySelector("h1[data-testid='jobsearch-JobInfoHeader-title']")?.textContent?.trim() ||
    document.querySelector("h1.jobTitle")?.textContent?.trim() ||
    null
  );
}

function getCompany() {
  return (
    document.querySelector(".icl-u-lg-mr--sm")?.textContent?.trim() ||
    document.querySelector("[data-testid='inlineHeader-companyName'] a")?.textContent?.trim() ||
    document.querySelector(".jobsearch-CompanyInfoContainer a")?.textContent?.trim() ||
    null
  );
}

function getLocation() {
  return (
    document.querySelector("#jobLocationText")?.textContent?.trim() ||
    document.querySelector("[data-testid='job-location']")?.textContent?.trim() ||
    document.querySelector(".jobsearch-JobInfoHeader-subtitle .icl-u-xs-mr--xs")?.textContent?.trim() ||
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
