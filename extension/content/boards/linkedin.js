/** LinkedIn job page selectors and extraction logic. */
import { getRemoteStatus } from "./board_utils.js";


const BOARD_ID = "linkedin";

const URL_PATTERN = /linkedin\.com\/jobs\/view\//;

/**
 * Returns true if the current page is a specific job posting (not search results).
 * Must be synchronous and fast — called on every page load.
 */
function isJobPage() {
  return (
    URL_PATTERN.test(window.location.href) &&
    !!document.querySelector(".job-details-jobs-unified-top-card__job-title")
  );
}

function getTitle() {
  return (
    document.querySelector(".job-details-jobs-unified-top-card__job-title")?.textContent?.trim() ||
    document.querySelector(".jobs-unified-top-card__job-title")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    null
  );
}

function getCompany() {
  return (
    document.querySelector(".job-details-jobs-unified-top-card__company-name")?.textContent?.trim() ||
    document.querySelector(".jobs-unified-top-card__company-name")?.textContent?.trim() ||
    null
  );
}

function getLocation() {
  return (
    document.querySelector(".job-details-jobs-unified-top-card__bullet")?.textContent?.trim() ||
    document.querySelector(".jobs-unified-top-card__bullet")?.textContent?.trim() ||
    null
  );
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
    compensation: null, // LinkedIn rarely shows compensation in DOM
    company_type: null,
    location: getLocation(),
    remote_status: getRemoteStatus(document.body.innerText ?? document.body.textContent ?? ""),
  };
}

export { BOARD_ID, isJobPage, extractFields };
