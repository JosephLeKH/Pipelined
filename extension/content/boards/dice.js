/** Dice job board selectors and extraction logic. */
import { createBoardExtractor } from "./board_utils.js";

const { BOARD_ID, isJobPage, extractFields } = createBoardExtractor({
  id: "dice",
  urlPattern: /www\.dice\.com\/job-detail\//,
  pageSelectors: ["h1.jobTitle", "h1[data-cy='jobTitle']"],
  selectors: {
    title: ["h1.jobTitle", "h1[data-cy='jobTitle']"],
    company: [".employerInfo .employer-name", "[data-cy='companyNameLink']", ".employer-name"],
    location: [".job-overview-location", "[data-cy='location']", ".location-info"],
    compensation: [".salary-range", "[data-cy='compensation']"],
  },
});

export { BOARD_ID, isJobPage, extractFields };
