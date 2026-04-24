/** Wellfound job board selectors and extraction logic. */
import { createBoardExtractor } from "./board_utils.js";

const { BOARD_ID, isJobPage, extractFields } = createBoardExtractor({
  id: "wellfound",
  urlPattern: /wellfound\.com\/jobs\//,
  pageSelectors: ["h1.job-title", "h1[data-test='job-title']", "[class*='JobListing_jobTitle']"],
  selectors: {
    title: ["h1.job-title", "h1[data-test='job-title']", "[class*='JobListing_jobTitle']"],
    company: ["[data-test='company-name']", ".startup-name a", "[class*='JobListing_companyName']"],
    location: ["[data-test='job-location']", ".job-posting-location", "[class*='JobListing_location']"],
  },
  defaults: { company_type: "startup" },
});

export { BOARD_ID, isJobPage, extractFields };
