/**
 * Workday board module tests.
 * isJobPage() is URL-only — no DOM fixture required.
 */

import { JSDOM } from "jsdom";
import { BOARD_ID, isJobPage, extractFields } from "../content/boards/workday.js";

const WORKDAY_JOB_URL = "https://acme.myworkday.com/acme/d/inst/15$189/9925$1.htmld";
const NON_WORKDAY_URL = "https://greenhouse.io/jobs/12345";

function setGlobals(url) {
  const dom = new JSDOM("<!DOCTYPE html><html><body>Software Engineer at Acme Corp</body></html>", { url });
  global.document = dom.window.document;
  global.window = dom.window;
}

describe("Workday board module", () => {
  describe("BOARD_ID", () => {
    it("should equal 'workday'", () => {
      expect(BOARD_ID).toBe("workday");
    });
  });

  describe("isJobPage()", () => {
    it("should return true for a *.myworkday.com/* URL", () => {
      setGlobals(WORKDAY_JOB_URL);

      expect(isJobPage()).toBe(true);
    });

    it("should return false for a non-Workday URL", () => {
      setGlobals(NON_WORKDAY_URL);

      expect(isJobPage()).toBe(false);
    });

    it("should return true for any path under myworkday.com", () => {
      setGlobals("https://company.myworkday.com/company/job/apply");

      expect(isJobPage()).toBe(true);
    });
  });

  describe("extractFields()", () => {
    beforeEach(() => {
      setGlobals(WORKDAY_JOB_URL);
    });

    it("should return an object with exactly 6 keys", () => {
      const fields = extractFields();

      expect(Object.keys(fields)).toHaveLength(6);
    });

    it("should return null for role_title due to shadow DOM isolation", () => {
      const fields = extractFields();

      expect(fields.role_title).toBeNull();
    });

    it("should return null for company_name due to shadow DOM isolation", () => {
      const fields = extractFields();

      expect(fields.company_name).toBeNull();
    });

    it("should return null for all fields", () => {
      const fields = extractFields();

      expect(fields.role_title).toBeNull();
      expect(fields.company_name).toBeNull();
      expect(fields.compensation).toBeNull();
      expect(fields.company_type).toBeNull();
      expect(fields.location).toBeNull();
      expect(fields.remote_status).toBeNull();
    });
  });
});
