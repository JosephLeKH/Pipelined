/** Ashby job board selectors and extraction logic. */
import { createBoardExtractor } from "./board_utils.js";

const { BOARD_ID, isJobPage, extractFields } = createBoardExtractor({
  id: "ashby",
  urlPattern: /jobs\.ashbyhq\.com\/.+\/.+/,
  pageSelectors: ["[data-ui='job-title']", "h1.ashby-job-posting-brief-title", "h1"],
  selectors: {
    title: ["[data-ui='job-title']", "h1.ashby-job-posting-brief-title", "h1"],
    company: ["[data-ui='company-name']", ".ashby-job-posting-brief-company-name", ".company-name"],
    location: ["[data-ui='job-location']", ".ashby-job-posting-brief-location", ".location"],
  },
});

export { BOARD_ID, isJobPage, extractFields };
