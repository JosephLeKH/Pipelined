/**
 * Greenhouse board module tests.
 * Uses JSDOM to simulate the Greenhouse job posting DOM.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import { BOARD_ID, isJobPage, extractFields } from "../content/boards/greenhouse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, "fixtures");

const GREENHOUSE_JOB_URL = "https://boards.greenhouse.io/acmecorp/jobs/12345";
const NON_JOB_URL = "https://boards.greenhouse.io/acmecorp";

function loadFixture(filename, url = GREENHOUSE_JOB_URL) {
  const html = readFileSync(resolve(FIXTURES, filename), "utf-8");
  return new JSDOM(html, { url });
}

function setGlobals(dom) {
  global.document = dom.window.document;
  global.window = dom.window;
}

describe("Greenhouse board module", () => {
  describe("BOARD_ID", () => {
    it("should equal 'greenhouse'", () => {
      expect(BOARD_ID).toBe("greenhouse");
    });
  });

  describe("isJobPage()", () => {
    beforeEach(() => {
      const dom = loadFixture("greenhouse-swe-posting.html");
      setGlobals(dom);
    });

    it("should return true for a job URL with job title selector present", () => {
      expect(isJobPage()).toBe(true);
    });

    it("should return false when URL does not match boards.greenhouse.io/.../jobs/", () => {
      const dom = loadFixture("greenhouse-swe-posting.html");
      const altDom = new JSDOM(dom.serialize(), { url: NON_JOB_URL });
      setGlobals(altDom);

      expect(isJobPage()).toBe(false);
    });

    it("should return false when job title selector is absent", () => {
      const html = "<html><body><h2>Some page</h2></body></html>";
      const dom = new JSDOM(html, { url: GREENHOUSE_JOB_URL });
      setGlobals(dom);

      expect(isJobPage()).toBe(false);
    });
  });

  describe("extractFields()", () => {
    beforeEach(() => {
      const dom = loadFixture("greenhouse-swe-posting.html");
      setGlobals(dom);
    });

    it("should extract role_title from the app-title selector", () => {
      const fields = extractFields();

      expect(fields.role_title).toBe("Software Engineer");
    });

    it("should extract company_name from the company-name selector", () => {
      const fields = extractFields();

      expect(fields.company_name).toBe("Acme Corp");
    });

    it("should extract location from the location selector", () => {
      const fields = extractFields();

      expect(fields.location).toBe("San Francisco, CA (Remote)");
    });

    it("should return null for compensation", () => {
      const fields = extractFields();

      expect(fields.compensation).toBeNull();
    });

    it("should return null for company_type", () => {
      const fields = extractFields();

      expect(fields.company_type).toBeNull();
    });

    it("should detect remote_status as 'remote' when location contains 'remote'", () => {
      const fields = extractFields();

      expect(fields.remote_status).toBe("remote");
    });

    it("should detect remote_status as 'hybrid' when location contains 'hybrid'", () => {
      const html = `<html><body>
        <div id="header"><span class="company-name">Corp</span></div>
        <div id="app_body">
          <h1 class="app-title">Engineer</h1>
          <div class="location">NYC (Hybrid)</div>
        </div>
      </body></html>`;
      const dom = new JSDOM(html, { url: GREENHOUSE_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBe("hybrid");
    });

    it("should detect remote_status as 'onsite' when location contains 'on-site'", () => {
      const html = `<html><body>
        <div id="header"><span class="company-name">Corp</span></div>
        <div id="app_body">
          <h1 class="app-title">Engineer</h1>
          <div class="location">NYC (On-site)</div>
        </div>
      </body></html>`;
      const dom = new JSDOM(html, { url: GREENHOUSE_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBe("onsite");
    });

    it("should return null for remote_status when no keyword is present", () => {
      const html = `<html><body>
        <div id="header"><span class="company-name">Corp</span></div>
        <div id="app_body">
          <h1 class="app-title">Engineer</h1>
          <div class="location">NYC</div>
        </div>
      </body></html>`;
      const dom = new JSDOM(html, { url: GREENHOUSE_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBeNull();
    });

    it("should not throw when all selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: GREENHOUSE_JOB_URL });
      setGlobals(dom);

      expect(() => extractFields()).not.toThrow();
    });

    it("should return nulls for all fields when selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: GREENHOUSE_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBeNull();
      expect(fields.company_name).toBeNull();
      expect(fields.location).toBeNull();
    });

    it("should fall back to #app_body h1 when app-title class is absent", () => {
      const html = `<html><body>
        <div id="app_body">
          <h1>Fallback Title</h1>
        </div>
      </body></html>`;
      const dom = new JSDOM(html, { url: GREENHOUSE_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBe("Fallback Title");
    });

    it("should fall back to bare h1 when both primary selectors are absent", () => {
      const html = `<html><body>
        <h1>Bare H1 Title</h1>
      </body></html>`;
      const dom = new JSDOM(html, { url: GREENHOUSE_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBe("Bare H1 Title");
    });
  });
});
