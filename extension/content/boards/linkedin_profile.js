/** Board module for LinkedIn profile pages (contact capture). */

export const BOARD_ID = "linkedin_profile";

const PROFILE_URL_RE = /linkedin\.com\/in\//;
const EXCLUDED_PATH_RE = /\/(jobs|feed|search|notifications|messaging|learning)\//;

export function isJobPage() {
  const href = window.location.href;
  if (!PROFILE_URL_RE.test(href)) return false;
  if (EXCLUDED_PATH_RE.test(href)) return false;
  return !!(
    document.querySelector("h1.text-heading-xlarge") ||
    document.querySelector("h1[class*='text-heading']")
  );
}

export function extractFields() {
  const nameEl =
    document.querySelector("h1.text-heading-xlarge") ||
    document.querySelector("h1[class*='text-heading']");
  const name = nameEl?.textContent?.trim() || null;

  const headlineEl =
    document.querySelector(".pv-text-details__left-panel .text-body-medium") ||
    document.querySelector("div[data-generated-suggestion-target] .text-body-medium");
  const headline = headlineEl?.textContent?.trim() || null;

  const companyEl =
    document.querySelector(".pv-text-details__right-panel .inline-show-more-text--is-truncated") ||
    document.querySelector(".pv-text-details__right-panel .text-body-small");
  const company = companyEl?.textContent?.trim() || null;

  return {
    type: "contact",
    name,
    headline,
    company,
    linkedin_url: window.location.href,
  };
}
