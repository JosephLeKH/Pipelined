/**
 * Glassdoor board module tests.
 * Uses JSDOM to simulate the Glassdoor job posting DOM.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import { BOARD_ID, isJobPage, extractFields } from "../content/boards/glassdoor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, "fixtures");

const GLASSDOOR_JOB_URL = "https://www.glassdoor.com/job-listing/software-engineer-buildco-JV_IC1147401_KO0,17_KE18,25.htm";
const NON_JOB_URL = "https://www.glassdoor.com/Jobs/software-engineer-jobs-SRCH_KO0,17.htm";

function loadFixture(filename, url = GLASSDOOR_JOB_URL) {
  const html = readFileSync(resolve(FIXTURES, filename), "utf-8");
  return new JSDOM(html, { url });
}

function setGlobals(dom) {
  global.document = dom.window.document;
  global.window = dom.window;
}

describe("Glassdoor board module", () => {
  describe("BOARD_ID", () => {
    it("should equal 'glassdoor'", () => {
      expect(BOARD_ID).toBe("glassdoor");
    });
  });

  describe("isJobPage()", () => {
    beforeEach(() => {
      const dom = loadFixture("glassdoor-swe-posting.html");
      setGlobals(dom);
    });

    it("should return true for a job URL with title selector present", () => {
      expect(isJobPage()).toBe(true);
    });

    it("should return false when URL does not match glassdoor.com/job-listing/", () => {
      const dom = loadFixture("glassdoor-swe-posting.html");
      const altDom = new JSDOM(dom.serialize(), { url: NON_JOB_URL });
      setGlobals(altDom);

      expect(isJobPage()).toBe(false);
    });

    it("should return false when title selector is absent", () => {
      const html = "<html><body><h2>Some page</h2></body></html>";
      const dom = new JSDOM(html, { url: GLASSDOOR_JOB_URL });
      setGlobals(dom);

      expect(isJobPage()).toBe(false);
    });
  });

  describe("extractFields()", () => {
    beforeEach(() => {
      const dom = loadFixture("glassdoor-swe-posting.html");
      setGlobals(dom);
    });

    it("should extract role_title from .job-title", () => {
      const fields = extractFields();

      expect(fields.role_title).toBe("Software Engineer");
    });

    it("should extract company_name from .employer-name", () => {
      const fields = extractFields();

      expect(fields.company_name).toBe("BuildCo");
    });

    it("should extract location from .location", () => {
      const fields = extractFields();

      expect(fields.location).toBe("San Francisco, CA (Hybrid)");
    });

    it("should extract compensation from .salary-estimate when present", () => {
      const fields = extractFields();

      expect(fields.compensation).toBe("$120K – $160K (Glassdoor est.)");
    });

    it("should infer remote_status as 'hybrid' when location contains 'Hybrid'", () => {
      const fields = extractFields();

      expect(fields.remote_status).toBe("hybrid");
    });

    it("should return null for company_type", () => {
      const fields = extractFields();

      expect(fields.company_type).toBeNull();
    });

    it("should return null for compensation when .salary-estimate is absent", () => {
      const html = `<html><body>
        <h1 class="job-title">Engineer</h1>
        <div class="employer-name">Corp</div>
        <div class="location">Austin, TX</div>
      </body></html>`;
      const dom = new JSDOM(html, { url: GLASSDOOR_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.compensation).toBeNull();
    });

    it("should infer remote_status as 'remote' when location contains 'Remote'", () => {
      const html = `<html><body>
        <h1 class="job-title">Engineer</h1>
        <div class="employer-name">Corp</div>
        <div class="location">Remote</div>
      </body></html>`;
      const dom = new JSDOM(html, { url: GLASSDOOR_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBe("remote");
    });

    it("should return null for remote_status when location has no keyword", () => {
      const html = `<html><body>
        <h1 class="job-title">Engineer</h1>
        <div class="employer-name">Corp</div>
        <div class="location">New York, NY</div>
      </body></html>`;
      const dom = new JSDOM(html, { url: GLASSDOOR_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBeNull();
    });

    it("should not throw when all selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: GLASSDOOR_JOB_URL });
      setGlobals(dom);

      expect(() => extractFields()).not.toThrow();
    });

    it("should return nulls for all fields when selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: GLASSDOOR_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBeNull();
      expect(fields.company_name).toBeNull();
      expect(fields.location).toBeNull();
      expect(fields.compensation).toBeNull();
    });
  });
});
