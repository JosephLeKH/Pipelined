/** Indeed job board selectors and extraction logic. */
import { createBoardExtractor } from "./board_utils.js";

const { BOARD_ID, isJobPage, extractFields } = createBoardExtractor({
  id: "indeed",
  urlPattern: /www\.indeed\.com\/viewjob/,
  pageSelectors: [".jobsearch-JobInfoHeader-title", "h1[data-testid='jobsearch-JobInfoHeader-title']"],
  selectors: {
    title: [".jobsearch-JobInfoHeader-title", "h1[data-testid='jobsearch-JobInfoHeader-title']", "h1.jobTitle"],
    company: [".icl-u-lg-mr--sm", "[data-testid='inlineHeader-companyName'] a", ".jobsearch-CompanyInfoContainer a"],
    location: ["#jobLocationText", "[data-testid='job-location']", ".jobsearch-JobInfoHeader-subtitle .icl-u-xs-mr--xs"],
  },
});

export { BOARD_ID, isJobPage, extractFields };
