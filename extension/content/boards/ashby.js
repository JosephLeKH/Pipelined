/** Ashby job board selectors and extraction logic. */
import { getRemoteStatus } from "./board_utils.js";


const BOARD_ID = "ashby";

const URL_PATTERN = /jobs\.ashbyhq\.com\/.+\/.+/;

/**
 * Returns true if the current page is a specific job posting.
 * Must be synchronous and fast — called on every page load.
 */
function isJobPage() {
  return (
    URL_PATTERN.test(window.location.href) &&
    !!document.querySelector("[data-ui='job-title'], h1.ashby-job-posting-brief-title, h1")
  );
}

function getTitle() {
  return (
    document.querySelector("[data-ui='job-title']")?.textContent?.trim() ||
    document.querySelector("h1.ashby-job-posting-brief-title")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    null
  );
}

function getCompany() {
  return (
    document.querySelector("[data-ui='company-name']")?.textContent?.trim() ||
    document.querySelector(".ashby-job-posting-brief-company-name")?.textContent?.trim() ||
    document.querySelector(".company-name")?.textContent?.trim() ||
    null
  );
}

function getLocation() {
  return (
    document.querySelector("[data-ui='job-location']")?.textContent?.trim() ||
    document.querySelector(".ashby-job-posting-brief-location")?.textContent?.trim() ||
    document.querySelector(".location")?.textContent?.trim() ||
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
    compensation: null,
    company_type: null,
    location: getLocation(),
    remote_status: getRemoteStatus(document.body.innerText ?? document.body.textContent ?? ""),
  };
}

export { BOARD_ID, isJobPage, extractFields };
