/** Glassdoor job board selectors and extraction logic. */
import { createBoardExtractor } from "./board_utils.js";

const { BOARD_ID, isJobPage, extractFields } = createBoardExtractor({
  id: "glassdoor",
  urlPattern: /www\.glassdoor\.com\/job-listing\//,
  pageSelectors: [".job-title", "[data-test='job-title']"],
  selectors: {
    title: [".job-title", "[data-test='job-title']", "h1.title"],
    company: [".employer-name", "[data-test='employer-name']", ".css-87uc0g"],
    location: [".location", "[data-test='location']", ".css-56kyx5"],
    compensation: [".salary-estimate", "[data-test='detailSalary']"],
  },
});

export { BOARD_ID, isJobPage, extractFields };
