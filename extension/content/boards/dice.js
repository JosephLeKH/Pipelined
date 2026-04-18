/** Dice job board selectors and extraction logic. */
import { getRemoteStatus } from "./board_utils.js";


const BOARD_ID = "dice";

const URL_PATTERN = /www\.dice\.com\/job-detail\//;

/**
 * Returns true if the current page is a specific job posting.
 * Must be synchronous and fast — called on every page load.
 */
function isJobPage() {
  return (
    URL_PATTERN.test(window.location.href) &&
    !!document.querySelector("h1.jobTitle, h1[data-cy='jobTitle']")
  );
}

function getTitle() {
  return (
    document.querySelector("h1.jobTitle")?.textContent?.trim() ||
    document.querySelector("h1[data-cy='jobTitle']")?.textContent?.trim() ||
    null
  );
}

function getCompany() {
  return (
    document.querySelector(".employerInfo .employer-name")?.textContent?.trim() ||
    document.querySelector("[data-cy='companyNameLink']")?.textContent?.trim() ||
    document.querySelector(".employer-name")?.textContent?.trim() ||
    null
  );
}

function getLocation() {
  return (
    document.querySelector(".job-overview-location")?.textContent?.trim() ||
    document.querySelector("[data-cy='location']")?.textContent?.trim() ||
    document.querySelector(".location-info")?.textContent?.trim() ||
    null
  );
}

function getCompensation() {
  return (
    document.querySelector(".salary-range")?.textContent?.trim() ||
    document.querySelector("[data-cy='compensation']")?.textContent?.trim() ||
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
    compensation: getCompensation(),
    company_type: null,
    location,
    remote_status: getRemoteStatus(location),
  };
}

export { BOARD_ID, isJobPage, extractFields };
