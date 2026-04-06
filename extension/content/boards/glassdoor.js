/** Glassdoor job board selectors and extraction logic. */

const BOARD_ID = "glassdoor";

const URL_PATTERN = /www\.glassdoor\.com\/job-listing\//;

/**
 * Returns true if the current page is a specific job posting.
 * Must be synchronous and fast — called on every page load.
 */
function isJobPage() {
  return (
    URL_PATTERN.test(window.location.href) &&
    !!document.querySelector(".job-title, [data-test='job-title']")
  );
}

function getTitle() {
  return (
    document.querySelector(".job-title")?.textContent?.trim() ||
    document.querySelector("[data-test='job-title']")?.textContent?.trim() ||
    document.querySelector("h1.title")?.textContent?.trim() ||
    null
  );
}

function getCompany() {
  return (
    document.querySelector(".employer-name")?.textContent?.trim() ||
    document.querySelector("[data-test='employer-name']")?.textContent?.trim() ||
    document.querySelector(".css-87uc0g")?.textContent?.trim() ||
    null
  );
}

function getLocation() {
  return (
    document.querySelector(".location")?.textContent?.trim() ||
    document.querySelector("[data-test='location']")?.textContent?.trim() ||
    document.querySelector(".css-56kyx5")?.textContent?.trim() ||
    null
  );
}

function getCompensation() {
  return (
    document.querySelector(".salary-estimate")?.textContent?.trim() ||
    document.querySelector("[data-test='detailSalary']")?.textContent?.trim() ||
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
    compensation: getCompensation(),
    company_type: null,
    location,
    remote_status: getRemoteStatus(location),
  };
}

export { BOARD_ID, isJobPage, extractFields };
