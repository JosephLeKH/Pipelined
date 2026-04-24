/** LinkedIn job page selectors and extraction logic. */
import { createBoardExtractor } from "./board_utils.js";

const { BOARD_ID, isJobPage, extractFields } = createBoardExtractor({
  id: "linkedin",
  urlPattern: /linkedin\.com\/jobs\/view\//,
  pageSelectors: [".job-details-jobs-unified-top-card__job-title"],
  selectors: {
    title: [".job-details-jobs-unified-top-card__job-title", ".jobs-unified-top-card__job-title", "h1"],
    company: [".job-details-jobs-unified-top-card__company-name", ".jobs-unified-top-card__company-name"],
    location: [".job-details-jobs-unified-top-card__bullet", ".jobs-unified-top-card__bullet"],
  },
});

export { BOARD_ID, isJobPage, extractFields };
