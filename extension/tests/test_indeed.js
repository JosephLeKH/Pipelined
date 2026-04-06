/**
 * Indeed board module tests.
 * Uses JSDOM to simulate the Indeed job posting DOM.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import { BOARD_ID, isJobPage, extractFields } from "../content/boards/indeed.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, "fixtures");

const INDEED_JOB_URL = "https://www.indeed.com/viewjob?jk=abc123";
const NON_JOB_URL = "https://www.indeed.com/jobs?q=engineer";

function loadFixture(filename, url = INDEED_JOB_URL) {
  const html = readFileSync(resolve(FIXTURES, filename), "utf-8");
  return new JSDOM(html, { url });
}

function setGlobals(dom) {
  global.document = dom.window.document;
  global.window = dom.window;
}

describe("Indeed board module", () => {
  describe("BOARD_ID", () => {
    it("should equal 'indeed'", () => {
      expect(BOARD_ID).toBe("indeed");
    });
  });

  describe("isJobPage()", () => {
    beforeEach(() => {
      const dom = loadFixture("indeed-swe-posting.html");
      setGlobals(dom);
    });

    it("should return true for a job URL with title selector present", () => {
      expect(isJobPage()).toBe(true);
    });

    it("should return false when URL does not match indeed.com/viewjob", () => {
      const dom = loadFixture("indeed-swe-posting.html");
      const altDom = new JSDOM(dom.serialize(), { url: NON_JOB_URL });
      setGlobals(altDom);

      expect(isJobPage()).toBe(false);
    });

    it("should return false when title selector is absent", () => {
      const html = "<html><body><h2>Some page</h2></body></html>";
      const dom = new JSDOM(html, { url: INDEED_JOB_URL });
      setGlobals(dom);

      expect(isJobPage()).toBe(false);
    });
  });

  describe("extractFields()", () => {
    beforeEach(() => {
      const dom = loadFixture("indeed-swe-posting.html");
      setGlobals(dom);
    });

    it("should extract role_title from .jobsearch-JobInfoHeader-title", () => {
      const fields = extractFields();

      expect(fields.role_title).toBe("Software Engineer");
    });

    it("should extract company_name from .icl-u-lg-mr--sm", () => {
      const fields = extractFields();

      expect(fields.company_name).toBe("TechCorp");
    });

    it("should extract location from #jobLocationText", () => {
      const fields = extractFields();

      expect(fields.location).toBe("Remote");
    });

    it("should infer remote_status as 'remote' when location contains 'Remote'", () => {
      const fields = extractFields();

      expect(fields.remote_status).toBe("remote");
    });

    it("should return null for compensation", () => {
      const fields = extractFields();

      expect(fields.compensation).toBeNull();
    });

    it("should return null for company_type", () => {
      const fields = extractFields();

      expect(fields.company_type).toBeNull();
    });

    it("should infer remote_status as 'hybrid' when location contains 'hybrid'", () => {
      const html = `<html><body>
        <h1 class="jobsearch-JobInfoHeader-title">Engineer</h1>
        <span class="icl-u-lg-mr--sm">Corp</span>
        <div id="jobLocationText">New York, NY (Hybrid)</div>
      </body></html>`;
      const dom = new JSDOM(html, { url: INDEED_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBe("hybrid");
    });

    it("should return null for remote_status when location has no keyword", () => {
      const html = `<html><body>
        <h1 class="jobsearch-JobInfoHeader-title">Engineer</h1>
        <span class="icl-u-lg-mr--sm">Corp</span>
        <div id="jobLocationText">Austin, TX</div>
      </body></html>`;
      const dom = new JSDOM(html, { url: INDEED_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBeNull();
    });

    it("should not throw when all selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: INDEED_JOB_URL });
      setGlobals(dom);

      expect(() => extractFields()).not.toThrow();
    });

    it("should return nulls for all fields when selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: INDEED_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBeNull();
      expect(fields.company_name).toBeNull();
      expect(fields.location).toBeNull();
    });
  });
});
