/**
 * Handshake board module tests.
 * Uses JSDOM to simulate the Handshake job posting DOM.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import { BOARD_ID, isJobPage, extractFields } from "../content/boards/handshake.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, "fixtures");

const HANDSHAKE_JOB_URL = "https://app.joinhandshake.com/jobs/12345678";
const NON_JOB_URL = "https://app.joinhandshake.com/employers/acme";

function loadFixture(filename, url = HANDSHAKE_JOB_URL) {
  const html = readFileSync(resolve(FIXTURES, filename), "utf-8");
  return new JSDOM(html, { url });
}

function setGlobals(dom) {
  global.document = dom.window.document;
  global.window = dom.window;
}

describe("Handshake board module", () => {
  describe("BOARD_ID", () => {
    it("should equal 'handshake'", () => {
      expect(BOARD_ID).toBe("handshake");
    });
  });

  describe("isJobPage()", () => {
    beforeEach(() => {
      const dom = loadFixture("handshake-swe-posting.html");
      setGlobals(dom);
    });

    it("should return true for a job URL with title selector present", () => {
      expect(isJobPage()).toBe(true);
    });

    it("should return false when URL does not match joinhandshake.com/jobs/", () => {
      const dom = loadFixture("handshake-swe-posting.html");
      const altDom = new JSDOM(dom.serialize(), { url: NON_JOB_URL });
      setGlobals(altDom);

      expect(isJobPage()).toBe(false);
    });

    it("should return false when title selector is absent", () => {
      const html = "<html><body><h2>Some page</h2></body></html>";
      const dom = new JSDOM(html, { url: HANDSHAKE_JOB_URL });
      setGlobals(dom);

      expect(isJobPage()).toBe(false);
    });
  });

  describe("extractFields()", () => {
    beforeEach(() => {
      const dom = loadFixture("handshake-swe-posting.html");
      setGlobals(dom);
    });

    it("should extract role_title from h1[data-hook='job-name']", () => {
      const fields = extractFields();

      expect(fields.role_title).toBe("Software Engineer");
    });

    it("should extract company_name from [data-hook='employer-name']", () => {
      const fields = extractFields();

      expect(fields.company_name).toBe("Acme Corp");
    });

    it("should extract location from [data-hook='location']", () => {
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
        <h1 data-hook="job-name">Engineer</h1>
        <span data-hook="employer-name">Corp</span>
        <span data-hook="location">New York, NY (Hybrid)</span>
      </body></html>`;
      const dom = new JSDOM(html, { url: HANDSHAKE_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBe("hybrid");
    });

    it("should infer remote_status as 'onsite' when location contains 'on-site'", () => {
      const html = `<html><body>
        <h1 data-hook="job-name">Engineer</h1>
        <span data-hook="employer-name">Corp</span>
        <span data-hook="location">San Francisco, CA (On-site)</span>
      </body></html>`;
      const dom = new JSDOM(html, { url: HANDSHAKE_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBe("onsite");
    });

    it("should return null for remote_status when location has no keyword", () => {
      const html = `<html><body>
        <h1 data-hook="job-name">Engineer</h1>
        <span data-hook="employer-name">Corp</span>
        <span data-hook="location">Boston, MA</span>
      </body></html>`;
      const dom = new JSDOM(html, { url: HANDSHAKE_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBeNull();
    });

    it("should not throw when all selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: HANDSHAKE_JOB_URL });
      setGlobals(dom);

      expect(() => extractFields()).not.toThrow();
    });

    it("should return nulls for role_title, company_name, and location when selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: HANDSHAKE_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBeNull();
      expect(fields.company_name).toBeNull();
      expect(fields.location).toBeNull();
    });
  });
});
