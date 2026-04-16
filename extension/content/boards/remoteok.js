/** RemoteOK job board selectors and extraction logic.
 *  All listings on RemoteOK are remote — remote_status is always hardcoded to 'remote'.
 */

const BOARD_ID = "remoteok";

const URL_PATTERN = /remoteok\.com\/remote-jobs\//;

/**
 * Returns true if the current page is a specific job posting.
 * Must be synchronous and fast — called on every page load.
 */
function isJobPage() {
  return (
    URL_PATTERN.test(window.location.href) &&
    !!document.querySelector("h1[itemprop='title'], h1.job-title, h1[class*='title']")
  );
}

function getTitle() {
  return (
    document.querySelector("h1[itemprop='title']")?.textContent?.trim() ||
    document.querySelector("h1.job-title")?.textContent?.trim() ||
    document.querySelector("h1[class*='title']")?.textContent?.trim() ||
    null
  );
}

function getCompany() {
  return (
    document.querySelector("h2[itemprop='name']")?.textContent?.trim() ||
    document.querySelector("[class*='company'] h2")?.textContent?.trim() ||
    document.querySelector(".company-name")?.textContent?.trim() ||
    null
  );
}

function getLocation() {
  return (
    document.querySelector("[class*='location'] span")?.textContent?.trim() ||
    document.querySelector(".location")?.textContent?.trim() ||
    document.querySelector("[itemprop='jobLocation']")?.textContent?.trim() ||
    null
  );
}

/**
 * Extracts structured fields from the page DOM.
 * remote_status is always 'remote' — all RemoteOK listings are remote-only.
 * Never throws — returns nulls for missing data.
 */
function extractFields() {
  return {
    role_title: getTitle(),
    company_name: getCompany(),
    compensation: null,
    company_type: null,
    location: getLocation(),
    remote_status: "remote",
  };
}

export { BOARD_ID, isJobPage, extractFields };
