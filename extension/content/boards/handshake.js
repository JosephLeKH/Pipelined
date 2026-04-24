/** Handshake job board selectors and extraction logic. */
import { createBoardExtractor } from "./board_utils.js";

const { BOARD_ID, isJobPage, extractFields } = createBoardExtractor({
  id: "handshake",
  urlPattern: /joinhandshake\.com\/jobs\//,
  pageSelectors: ["h1[data-hook='job-name']", "h1.job-name", "h1[class*='JobTitle']", "[data-hook='job-name']"],
  selectors: {
    title: ["h1[data-hook='job-name']", "h1.job-name", "h1[class*='JobTitle']"],
    company: ["[data-hook='employer-name']", ".employer-profile-banner--name", "[class*='EmployerName']"],
    location: ["[data-hook='location']", ".job-location", "[class*='JobLocation']"],
  },
});

export { BOARD_ID, isJobPage, extractFields };
