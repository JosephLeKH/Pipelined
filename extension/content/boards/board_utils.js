/** Shared utility functions for all job board scrapers. */

/**
 * Extracts remote status from text.
 * @param {string|null|undefined} text - The text to parse (location, body text, or job description)
 * @returns {string|null} - One of "remote", "hybrid", "onsite", or null
 */
function getRemoteStatus(text) {
  if (!text) return null;
  const normalized = text.toLowerCase();
  if (normalized.includes("remote")) return "remote";
  if (normalized.includes("hybrid")) return "hybrid";
  if (normalized.includes("on-site") || normalized.includes("onsite")) return "onsite";
  return null;
}

/**
 * Tries each selector in order, returning the first non-empty textContent or null.
 * @param {string[]} selectors - CSS selectors to try in priority order
 * @returns {string|null}
 */
function queryText(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    const text = el?.textContent?.trim();
    if (text) return text;
  }
  return null;
}

/**
 * Factory that creates a board extractor from a declarative config.
 * @param {Object} config
 * @param {string} config.id - Board identifier
 * @param {RegExp} config.urlPattern - Regex to match job page URLs
 * @param {string[]} config.pageSelectors - CSS selectors that must exist on a job page
 * @param {Object} config.selectors - Field-level selector arrays
 * @param {string[]} config.selectors.title
 * @param {string[]} config.selectors.company
 * @param {string[]} [config.selectors.location]
 * @param {string[]} [config.selectors.compensation]
 * @param {Object} [config.defaults] - Static field defaults (e.g., { remote_status: "remote", company_type: "startup" })
 * @returns {{ BOARD_ID: string, isJobPage: () => boolean, extractFields: () => Object }}
 */
function createBoardExtractor(config) {
  const { id, urlPattern, pageSelectors, selectors, defaults = {} } = config;

  function isJobPage() {
    if (!urlPattern.test(window.location.href)) return false;
    return pageSelectors.some((sel) => !!document.querySelector(sel));
  }

  function extractFields() {
    const location = selectors.location ? queryText(selectors.location) : null;
    return {
      role_title: queryText(selectors.title),
      company_name: queryText(selectors.company),
      compensation: selectors.compensation ? queryText(selectors.compensation) : null,
      company_type: defaults.company_type ?? null,
      location,
      remote_status: defaults.remote_status ?? getRemoteStatus(location),
    };
  }

  return { BOARD_ID: id, isJobPage, extractFields };
}

export { getRemoteStatus, createBoardExtractor };
