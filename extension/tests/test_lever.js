/**
 * Lever board module tests.
 * Uses JSDOM to simulate the Lever job posting DOM.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import { BOARD_ID, isJobPage, extractFields } from "../content/boards/lever.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, "fixtures");

const LEVER_JOB_URL = "https://jobs.lever.co/acmecorp/abc-123-def";
const NON_JOB_URL = "https://jobs.lever.co/acmecorp";

function loadFixture(filename, url = LEVER_JOB_URL) {
  const html = readFileSync(resolve(FIXTURES, filename), "utf-8");
  return new JSDOM(html, { url });
}

function setGlobals(dom) {
  global.document = dom.window.document;
  global.window = dom.window;
}

describe("Lever board module", () => {
  describe("BOARD_ID", () => {
    it("should equal 'lever'", () => {
      expect(BOARD_ID).toBe("lever");
    });
  });

  describe("isJobPage()", () => {
    beforeEach(() => {
      const dom = loadFixture("lever-swe-posting.html");
      setGlobals(dom);
    });

    it("should return true for a job URL with posting headline selector present", () => {
      expect(isJobPage()).toBe(true);
    });

    it("should return false when URL does not match jobs.lever.co/{company}/{id}", () => {
      const dom = loadFixture("lever-swe-posting.html");
      const altDom = new JSDOM(dom.serialize(), { url: NON_JOB_URL });
      setGlobals(altDom);

      expect(isJobPage()).toBe(false);
    });

    it("should return false when posting headline selector is absent", () => {
      const html = "<html><body><p>Some page</p></body></html>";
      const dom = new JSDOM(html, { url: LEVER_JOB_URL });
      setGlobals(dom);

      expect(isJobPage()).toBe(false);
    });
  });

  describe("extractFields()", () => {
    beforeEach(() => {
      const dom = loadFixture("lever-swe-posting.html");
      setGlobals(dom);
    });

    it("should extract role_title from the posting-headline h2 selector", () => {
      const fields = extractFields();

      expect(fields.role_title).toBe("Software Engineer");
    });

    it("should extract company_name from the main-header-logo selector", () => {
      const fields = extractFields();

      expect(fields.company_name).toBe("Acme Corp");
    });

    it("should extract location from the sort-by-location selector", () => {
      const fields = extractFields();

      expect(fields.location).toBe("San Francisco, CA (Hybrid)");
    });

    it("should return null for compensation", () => {
      const fields = extractFields();

      expect(fields.compensation).toBeNull();
    });

    it("should return null for company_type", () => {
      const fields = extractFields();

      expect(fields.company_type).toBeNull();
    });

    it("should detect remote_status as 'hybrid' when location contains 'hybrid'", () => {
      const fields = extractFields();

      expect(fields.remote_status).toBe("hybrid");
    });

    it("should detect remote_status as 'remote' when location contains 'remote'", () => {
      const html = `<html><body>
        <div class="main-header-logo">Acme Corp</div>
        <div class="content">
          <div class="posting-headline">
            <h2>Engineer</h2>
            <div class="posting-categories">
              <span class="sort-by-location posting-category">NYC (Remote)</span>
            </div>
          </div>
        </div>
      </body></html>`;
      const dom = new JSDOM(html, { url: LEVER_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBe("remote");
    });

    it("should detect remote_status as 'onsite' when location contains 'onsite'", () => {
      const html = `<html><body>
        <div class="main-header-logo">Acme Corp</div>
        <div class="content">
          <div class="posting-headline">
            <h2>Engineer</h2>
            <div class="posting-categories">
              <span class="sort-by-location posting-category">NYC (Onsite)</span>
            </div>
          </div>
        </div>
      </body></html>`;
      const dom = new JSDOM(html, { url: LEVER_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBe("onsite");
    });

    it("should return null for remote_status when no keyword is present", () => {
      const html = `<html><body>
        <div class="main-header-logo">Acme Corp</div>
        <div class="content">
          <div class="posting-headline">
            <h2>Engineer</h2>
            <div class="posting-categories">
              <span class="sort-by-location posting-category">NYC</span>
            </div>
          </div>
        </div>
      </body></html>`;
      const dom = new JSDOM(html, { url: LEVER_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBeNull();
    });

    it("should not throw when all selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: LEVER_JOB_URL });
      setGlobals(dom);

      expect(() => extractFields()).not.toThrow();
    });

    it("should return nulls for all fields when selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: LEVER_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBeNull();
      expect(fields.company_name).toBeNull();
      expect(fields.location).toBeNull();
    });

    it("should fall back to bare h2 when posting-headline h2 is absent", () => {
      const html = `<html><body>
        <div class="main-header-logo">Corp</div>
        <div class="content">
          <h2>Fallback Title</h2>
        </div>
      </body></html>`;
      const dom = new JSDOM(html, { url: LEVER_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBe("Fallback Title");
    });
  });
});
