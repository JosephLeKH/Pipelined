/** Workday board module.
 *
 * Workday renders everything inside shadow DOM, so direct DOM queries return null.
 * extractFields() intentionally returns nulls and relies on the OpenAI fallback
 * in the service worker / backend to parse fields from pageText.
 */

const BOARD_ID = "workday";

const URL_PATTERN = /\.myworkday\.com\//;

/**
 * Returns true if the current page is a Workday job posting.
 * Matches any *.myworkday.com/* URL.
 */
function isJobPage() {
  return URL_PATTERN.test(window.location.href);
}

/**
 * Workday's DOM is shadow-DOM-isolated so selectors return nothing.
 * All fields are null; the content script will attach pageText for OpenAI parsing.
 */
function extractFields() {
  return {
    role_title: null,
    company_name: null,
    compensation: null,
    company_type: null,
    location: null,
    remote_status: null,
  };
}

export { BOARD_ID, isJobPage, extractFields };
