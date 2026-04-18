/** Shared utility functions for all job board scrapers. */

/**
 * Extracts remote status from text.
 * Handles both explicit null checks and implicit falsy checks.
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

export { getRemoteStatus };
