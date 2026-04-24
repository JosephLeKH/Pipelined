/** Greenhouse job board selectors and extraction logic. */
import { createBoardExtractor } from "./board_utils.js";

const { BOARD_ID, isJobPage, extractFields } = createBoardExtractor({
  id: "greenhouse",
  urlPattern: /boards\.greenhouse\.io\/.+\/jobs\/\d+/,
  pageSelectors: ["h1.app-title", "#app_body h1"],
  selectors: {
    title: ["h1.app-title", "#app_body h1", "h1"],
    company: [".company-name", "header .company-name", "#header .company-name"],
    location: [".location", "[data-qa='job-location']", ".location-name"],
  },
});

export { BOARD_ID, isJobPage, extractFields };
