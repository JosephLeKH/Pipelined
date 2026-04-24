/** RemoteOK job board — all listings are remote-only. */
import { createBoardExtractor } from "./board_utils.js";

const { BOARD_ID, isJobPage, extractFields } = createBoardExtractor({
  id: "remoteok",
  urlPattern: /remoteok\.com\/remote-jobs\//,
  pageSelectors: ["h1[itemprop='title']", "h1.job-title", "h1[class*='title']"],
  selectors: {
    title: ["h1[itemprop='title']", "h1.job-title", "h1[class*='title']"],
    company: ["h2[itemprop='name']", "[class*='company'] h2", ".company-name"],
    location: ["[class*='location'] span", ".location", "[itemprop='jobLocation']"],
  },
  defaults: { remote_status: "remote" },
});

export { BOARD_ID, isJobPage, extractFields };
