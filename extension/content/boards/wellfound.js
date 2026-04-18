/** Wellfound job board selectors and extraction logic. */
import { getRemoteStatus } from "./board_utils.js";


const BOARD_ID = "wellfound";

const URL_PATTERN = /wellfound\.com\/jobs\//;

/**
 * Returns true if the current page is a specific job posting.
 * Must be synchronous and fast — called on every page load.
 */
function isJobPage() {
  return (
    URL_PATTERN.test(window.location.href) &&
    !!document.querySelector("h1.job-title, h1[data-test='job-title'], [class*='JobListing_jobTitle']")
  );
}

function getTitle() {
  return (
    document.querySelector("h1.job-title")?.textContent?.trim() ||
    document.querySelector("h1[data-test='job-title']")?.textContent?.trim() ||
    document.querySelector("[class*='JobListing_jobTitle']")?.textContent?.trim() ||
    null
  );
}

function getCompany() {
  return (
    document.querySelector("[data-test='company-name']")?.textContent?.trim() ||
    document.querySelector(".startup-name a")?.textContent?.trim() ||
    document.querySelector("[class*='JobListing_companyName']")?.textContent?.trim() ||
    null
  );
}

function getLocation() {
  return (
    document.querySelector("[data-test='job-location']")?.textContent?.trim() ||
    document.querySelector(".job-posting-location")?.textContent?.trim() ||
    document.querySelector("[class*='JobListing_location']")?.textContent?.trim() ||
    null
  );
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
    company_type: "startup",
    location,
    remote_status: getRemoteStatus(location),
  };
}

export { BOARD_ID, isJobPage, extractFields };
