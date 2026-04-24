/**
 * LinkedIn board module tests.
 * Uses JSDOM to simulate the LinkedIn job posting DOM.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import { BOARD_ID, isJobPage, extractFields } from "../content/boards/linkedin.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, "fixtures");

const LINKEDIN_JOB_URL = "https://www.linkedin.com/jobs/view/12345";
const NON_JOB_URL = "https://www.linkedin.com/jobs/search/?keywords=engineer";

function loadFixture(filename) {
  const html = readFileSync(resolve(FIXTURES, filename), "utf-8");
  return new JSDOM(html, { url: LINKEDIN_JOB_URL });
}

function setGlobals(dom) {
  global.document = dom.window.document;
  global.window = dom.window;
}

describe("LinkedIn board module", () => {
  describe("BOARD_ID", () => {
    it("should equal 'linkedin'", () => {
      expect(BOARD_ID).toBe("linkedin");
    });
  });

  describe("isJobPage()", () => {
    beforeEach(() => {
      const dom = loadFixture("linkedin-swe-posting.html");
      setGlobals(dom);
    });

    it("should return true for a job view URL with job title selector present", () => {
      expect(isJobPage()).toBe(true);
    });

    it("should return false when URL does not match linkedin.com/jobs/view/", () => {
      const dom = loadFixture("linkedin-swe-posting.html");
      const altDom = new JSDOM(dom.serialize(), { url: NON_JOB_URL });
      setGlobals(altDom);

      expect(isJobPage()).toBe(false);
    });

    it("should return false when job title selector is absent", () => {
      const html = "<html><body><h1>Some page</h1></body></html>";
      const dom = new JSDOM(html, { url: LINKEDIN_JOB_URL });
      setGlobals(dom);

      expect(isJobPage()).toBe(false);
    });
  });

  describe("extractFields()", () => {
    beforeEach(() => {
      const dom = loadFixture("linkedin-swe-posting.html");
      setGlobals(dom);
    });

    it("should extract role_title from the primary selector", () => {
      const fields = extractFields();

      expect(fields.role_title).toBe("Software Engineer");
    });

    it("should extract company_name from the primary selector", () => {
      const fields = extractFields();

      expect(fields.company_name).toBe("Acme Corp");
    });

    it("should extract location from the primary selector", () => {
      const fields = extractFields();

      expect(fields.location).toBe("San Francisco, CA (Remote)");
    });

    it("should return null for compensation (not in LinkedIn DOM)", () => {
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

    it("should detect remote_status as 'hybrid' when location contains 'hybrid'", () => {
      const html = `<html><body>
        <h1 class="job-details-jobs-unified-top-card__job-title">Engineer</h1>
        <span class="job-details-jobs-unified-top-card__company-name">Corp</span>
        <span class="job-details-jobs-unified-top-card__bullet">NYC (Hybrid)</span>
      </body></html>`;
      const dom = new JSDOM(html, { url: LINKEDIN_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBe("hybrid");
    });

    it("should detect remote_status as 'onsite' when location contains 'on-site'", () => {
      const html = `<html><body>
        <h1 class="job-details-jobs-unified-top-card__job-title">Engineer</h1>
        <span class="job-details-jobs-unified-top-card__company-name">Corp</span>
        <span class="job-details-jobs-unified-top-card__bullet">NYC (On-site)</span>
      </body></html>`;
      const dom = new JSDOM(html, { url: LINKEDIN_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBe("onsite");
    });

    it("should detect remote_status as 'onsite' when location contains 'onsite'", () => {
      const html = `<html><body>
        <h1 class="job-details-jobs-unified-top-card__job-title">Engineer</h1>
        <span class="job-details-jobs-unified-top-card__company-name">Corp</span>
        <span class="job-details-jobs-unified-top-card__bullet">NYC Onsite</span>
      </body></html>`;
      const dom = new JSDOM(html, { url: LINKEDIN_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBe("onsite");
    });

    it("should return null for remote_status when no keyword is present", () => {
      const html = `<html><body>
        <h1 class="job-details-jobs-unified-top-card__job-title">Engineer</h1>
        <span class="job-details-jobs-unified-top-card__company-name">Corp</span>
        <span class="job-details-jobs-unified-top-card__bullet">NYC</span>
        Great opportunity at our office.
      </body></html>`;
      const dom = new JSDOM(html, { url: LINKEDIN_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBeNull();
    });

    it("should not throw when all selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: LINKEDIN_JOB_URL });
      setGlobals(dom);

      expect(() => extractFields()).not.toThrow();
    });

    it("should return nulls for all fields when selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: LINKEDIN_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBeNull();
      expect(fields.company_name).toBeNull();
      expect(fields.location).toBeNull();
    });

    it("should fall back to secondary title selector when primary is absent", () => {
      const html = `<html><body>
        <h1 class="jobs-unified-top-card__job-title">Fallback Title</h1>
        <span class="job-details-jobs-unified-top-card__company-name">Corp</span>
        <span class="job-details-jobs-unified-top-card__bullet">NYC</span>
      </body></html>`;
      const dom = new JSDOM(html, { url: LINKEDIN_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBe("Fallback Title");
    });

    it("should fall back to h1 title selector when both primary selectors are absent", () => {
      const html = `<html><body>
        <h1>H1 Title</h1>
        <span class="job-details-jobs-unified-top-card__company-name">Corp</span>
        <span class="job-details-jobs-unified-top-card__bullet">NYC</span>
      </body></html>`;
      const dom = new JSDOM(html, { url: LINKEDIN_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBe("H1 Title");
    });

    it("should fall back to secondary company selector when primary is absent", () => {
      const html = `<html><body>
        <h1 class="job-details-jobs-unified-top-card__job-title">Engineer</h1>
        <span class="jobs-unified-top-card__company-name">Fallback Corp</span>
        <span class="job-details-jobs-unified-top-card__bullet">NYC</span>
      </body></html>`;
      const dom = new JSDOM(html, { url: LINKEDIN_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.company_name).toBe("Fallback Corp");
    });

    it("should fall back to secondary location selector when primary is absent", () => {
      const html = `<html><body>
        <h1 class="job-details-jobs-unified-top-card__job-title">Engineer</h1>
        <span class="job-details-jobs-unified-top-card__company-name">Corp</span>
        <span class="jobs-unified-top-card__bullet">Remote, CA</span>
      </body></html>`;
      const dom = new JSDOM(html, { url: LINKEDIN_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.location).toBe("Remote, CA");
    });
  });
});
