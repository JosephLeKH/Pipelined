/** Lever job board selectors and extraction logic. */
import { createBoardExtractor } from "./board_utils.js";

const { BOARD_ID, isJobPage, extractFields } = createBoardExtractor({
  id: "lever",
  urlPattern: /jobs\.lever\.co\/.+\/.+/,
  pageSelectors: [".posting-headline h2", "h2.posting-headline", ".content h2"],
  selectors: {
    title: [".posting-headline h2", "h2.posting-headline", ".content h2", "h2"],
    company: [".main-header-logo", ".company-name"],
    location: [".posting-categories .sort-by-location", ".posting-categories .location", ".location"],
  },
});

export { BOARD_ID, isJobPage, extractFields };
