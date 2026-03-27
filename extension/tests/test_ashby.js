/**
 * Ashby board module tests.
 * Uses JSDOM to simulate the Ashby job posting DOM.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import { BOARD_ID, isJobPage, extractFields } from "../content/boards/ashby.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, "fixtures");

const ASHBY_JOB_URL = "https://jobs.ashbyhq.com/acmecorp/abc-123";
const NON_JOB_URL = "https://jobs.ashbyhq.com/acmecorp";

function loadFixture(filename, url = ASHBY_JOB_URL) {
  const html = readFileSync(resolve(FIXTURES, filename), "utf-8");
  return new JSDOM(html, { url });
}

function setGlobals(dom) {
  global.document = dom.window.document;
  global.window = dom.window;
}

describe("Ashby board module", () => {
  describe("BOARD_ID", () => {
    it("should equal 'ashby'", () => {
      expect(BOARD_ID).toBe("ashby");
    });
  });

  describe("isJobPage()", () => {
    beforeEach(() => {
      const dom = loadFixture("ashby-swe-posting.html");
      setGlobals(dom);
    });

    it("should return true for a job URL with job title selector present", () => {
      expect(isJobPage()).toBe(true);
    });

    it("should return false when URL does not match jobs.ashbyhq.com/{company}/{id}", () => {
      const dom = loadFixture("ashby-swe-posting.html");
      const altDom = new JSDOM(dom.serialize(), { url: NON_JOB_URL });
      setGlobals(altDom);

      expect(isJobPage()).toBe(false);
    });

    it("should return false when all title selectors are absent", () => {
      const html = "<html><body><p>Some page</p></body></html>";
      const dom = new JSDOM(html, { url: ASHBY_JOB_URL });
      setGlobals(dom);

      expect(isJobPage()).toBe(false);
    });
  });

  describe("extractFields()", () => {
    beforeEach(() => {
      const dom = loadFixture("ashby-swe-posting.html");
      setGlobals(dom);
    });

    it("should extract role_title from the data-ui='job-title' selector", () => {
      const fields = extractFields();

      expect(fields.role_title).toBe("Software Engineer");
    });

    it("should extract company_name from the company-name selector", () => {
      const fields = extractFields();

      expect(fields.company_name).toBe("Acme Corp");
    });

    it("should extract location from the data-ui='job-location' selector", () => {
      const fields = extractFields();

      expect(fields.location).toBe("San Francisco, CA");
    });

    it("should return null for compensation", () => {
      const fields = extractFields();

      expect(fields.compensation).toBeNull();
    });

    it("should return null for company_type", () => {
      const fields = extractFields();

      expect(fields.company_type).toBeNull();
    });

    it("should detect remote_status as 'remote' when body text contains 'remote'", () => {
      const fields = extractFields();

      expect(fields.remote_status).toBe("remote");
    });

    it("should detect remote_status as 'hybrid' when body text contains 'hybrid'", () => {
      const html = `<html><body>
        <span class="ashby-job-posting-brief-company-name">Corp</span>
        <h1 data-ui="job-title">Engineer</h1>
        <div data-ui="job-location">NYC</div>
        This is a hybrid position.
      </body></html>`;
      const dom = new JSDOM(html, { url: ASHBY_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBe("hybrid");
    });

    it("should detect remote_status as 'onsite' when body text contains 'on-site'", () => {
      const html = `<html><body>
        <span class="ashby-job-posting-brief-company-name">Corp</span>
        <h1 data-ui="job-title">Engineer</h1>
        <div data-ui="job-location">NYC</div>
        This is an on-site role.
      </body></html>`;
      const dom = new JSDOM(html, { url: ASHBY_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBe("onsite");
    });

    it("should return null for remote_status when no keyword is present", () => {
      const html = `<html><body>
        <span class="ashby-job-posting-brief-company-name">Corp</span>
        <h1 data-ui="job-title">Engineer</h1>
        <div data-ui="job-location">NYC</div>
        Great benefits and growth opportunity.
      </body></html>`;
      const dom = new JSDOM(html, { url: ASHBY_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBeNull();
    });

    it("should not throw when all selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: ASHBY_JOB_URL });
      setGlobals(dom);

      expect(() => extractFields()).not.toThrow();
    });

    it("should return nulls for role_title, company_name, location when selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: ASHBY_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBeNull();
      expect(fields.company_name).toBeNull();
      expect(fields.location).toBeNull();
    });

    it("should fall back to ashby-job-posting-brief-title class when data-ui selector is absent", () => {
      const html = `<html><body>
        <h1 class="ashby-job-posting-brief-title">Class Fallback Title</h1>
      </body></html>`;
      const dom = new JSDOM(html, { url: ASHBY_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBe("Class Fallback Title");
    });

    it("should fall back to bare h1 when both primary title selectors are absent", () => {
      const html = `<html><body>
        <h1>Bare H1 Title</h1>
      </body></html>`;
      const dom = new JSDOM(html, { url: ASHBY_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBe("Bare H1 Title");
    });
  });
});
