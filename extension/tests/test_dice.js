/**
 * Dice board module tests.
 * Uses JSDOM to simulate the Dice job posting DOM.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import { BOARD_ID, isJobPage, extractFields } from "../content/boards/dice.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, "fixtures");

const DICE_JOB_URL = "https://www.dice.com/job-detail/abc123";
const NON_JOB_URL = "https://www.dice.com/jobs/q-engineer";

function loadFixture(filename, url = DICE_JOB_URL) {
  const html = readFileSync(resolve(FIXTURES, filename), "utf-8");
  return new JSDOM(html, { url });
}

function setGlobals(dom) {
  global.document = dom.window.document;
  global.window = dom.window;
}

describe("Dice board module", () => {
  describe("BOARD_ID", () => {
    it("should equal 'dice'", () => {
      expect(BOARD_ID).toBe("dice");
    });
  });

  describe("isJobPage()", () => {
    beforeEach(() => {
      const dom = loadFixture("dice-swe-posting.html");
      setGlobals(dom);
    });

    it("should return true for a job URL with title selector present", () => {
      expect(isJobPage()).toBe(true);
    });

    it("should return false when URL does not match dice.com/job-detail/", () => {
      const dom = loadFixture("dice-swe-posting.html");
      const altDom = new JSDOM(dom.serialize(), { url: NON_JOB_URL });
      setGlobals(altDom);

      expect(isJobPage()).toBe(false);
    });

    it("should return false when title selector is absent", () => {
      const html = "<html><body><h2>Some page</h2></body></html>";
      const dom = new JSDOM(html, { url: DICE_JOB_URL });
      setGlobals(dom);

      expect(isJobPage()).toBe(false);
    });
  });

  describe("extractFields()", () => {
    beforeEach(() => {
      const dom = loadFixture("dice-swe-posting.html");
      setGlobals(dom);
    });

    it("should extract role_title from h1.jobTitle", () => {
      const fields = extractFields();

      expect(fields.role_title).toBe("Software Engineer");
    });

    it("should extract company_name from .employerInfo .employer-name", () => {
      const fields = extractFields();

      expect(fields.company_name).toBe("TechCorp");
    });

    it("should extract location from .job-overview-location", () => {
      const fields = extractFields();

      expect(fields.location).toBe("Austin, TX (Remote)");
    });

    it("should infer remote_status as 'remote' when location contains 'Remote'", () => {
      const fields = extractFields();

      expect(fields.remote_status).toBe("remote");
    });

    it("should extract compensation from .salary-range", () => {
      const fields = extractFields();

      expect(fields.compensation).toBe("$120,000 - $160,000");
    });

    it("should return null for company_type", () => {
      const fields = extractFields();

      expect(fields.company_type).toBeNull();
    });

    it("should infer remote_status as 'hybrid' when location contains 'hybrid'", () => {
      const html = `<html><body>
        <h1 class="jobTitle">Engineer</h1>
        <div class="employerInfo"><span class="employer-name">Corp</span></div>
        <span class="job-overview-location">Chicago, IL (Hybrid)</span>
      </body></html>`;
      const dom = new JSDOM(html, { url: DICE_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBe("hybrid");
    });

    it("should return null for remote_status when location has no keyword", () => {
      const html = `<html><body>
        <h1 class="jobTitle">Engineer</h1>
        <div class="employerInfo"><span class="employer-name">Corp</span></div>
        <span class="job-overview-location">Dallas, TX</span>
      </body></html>`;
      const dom = new JSDOM(html, { url: DICE_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBeNull();
    });

    it("should return null for compensation when salary-range is absent", () => {
      const html = `<html><body>
        <h1 class="jobTitle">Engineer</h1>
        <div class="employerInfo"><span class="employer-name">Corp</span></div>
      </body></html>`;
      const dom = new JSDOM(html, { url: DICE_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.compensation).toBeNull();
    });

    it("should not throw when all selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: DICE_JOB_URL });
      setGlobals(dom);

      expect(() => extractFields()).not.toThrow();
    });

    it("should return nulls for role_title and company_name when selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: DICE_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBeNull();
      expect(fields.company_name).toBeNull();
      expect(fields.location).toBeNull();
    });
  });
});
