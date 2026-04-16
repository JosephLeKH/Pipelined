/**
 * RemoteOK board module tests.
 * Uses JSDOM to simulate the RemoteOK job posting DOM.
 * remote_status is always 'remote' — all RemoteOK listings are remote-only.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import { BOARD_ID, isJobPage, extractFields } from "../content/boards/remoteok.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, "fixtures");

const REMOTEOK_JOB_URL = "https://remoteok.com/remote-jobs/remote-software-engineer-123456";
const NON_JOB_URL = "https://remoteok.com/remote-jobs";

function loadFixture(filename, url = REMOTEOK_JOB_URL) {
  const html = readFileSync(resolve(FIXTURES, filename), "utf-8");
  return new JSDOM(html, { url });
}

function setGlobals(dom) {
  global.document = dom.window.document;
  global.window = dom.window;
}

describe("RemoteOK board module", () => {
  describe("BOARD_ID", () => {
    it("should equal 'remoteok'", () => {
      expect(BOARD_ID).toBe("remoteok");
    });
  });

  describe("isJobPage()", () => {
    beforeEach(() => {
      const dom = loadFixture("remoteok-swe-posting.html");
      setGlobals(dom);
    });

    it("should return true for a job URL with title selector present", () => {
      expect(isJobPage()).toBe(true);
    });

    it("should return false when URL does not match remoteok.com/remote-jobs/", () => {
      const dom = loadFixture("remoteok-swe-posting.html");
      const altDom = new JSDOM(dom.serialize(), { url: NON_JOB_URL });
      setGlobals(altDom);

      expect(isJobPage()).toBe(false);
    });

    it("should return false when title selector is absent", () => {
      const html = "<html><body><h2>Some page</h2></body></html>";
      const dom = new JSDOM(html, { url: REMOTEOK_JOB_URL });
      setGlobals(dom);

      expect(isJobPage()).toBe(false);
    });
  });

  describe("extractFields()", () => {
    beforeEach(() => {
      const dom = loadFixture("remoteok-swe-posting.html");
      setGlobals(dom);
    });

    it("should extract role_title from h1[itemprop='title']", () => {
      const fields = extractFields();

      expect(fields.role_title).toBe("Software Engineer");
    });

    it("should extract company_name from h2[itemprop='name']", () => {
      const fields = extractFields();

      expect(fields.company_name).toBe("Remote Inc");
    });

    it("should extract location from .location span", () => {
      const fields = extractFields();

      expect(fields.location).toBe("Worldwide");
    });

    it("should always return 'remote' for remote_status regardless of location", () => {
      const fields = extractFields();

      expect(fields.remote_status).toBe("remote");
    });

    it("should return 'remote' for remote_status even when no location is present", () => {
      const html = `<html><body>
        <h1 itemprop="title">Engineer</h1>
        <h2 itemprop="name">Corp</h2>
      </body></html>`;
      const dom = new JSDOM(html, { url: REMOTEOK_JOB_URL });
      setGlobals(dom);

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

    it("should not throw when all selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: REMOTEOK_JOB_URL });
      setGlobals(dom);

      expect(() => extractFields()).not.toThrow();
    });

    it("should return nulls for role_title, company_name, and location when selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: REMOTEOK_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.role_title).toBeNull();
      expect(fields.company_name).toBeNull();
      expect(fields.location).toBeNull();
    });

    it("should still return 'remote' for remote_status even when all selectors are missing", () => {
      const html = "<html><body></body></html>";
      const dom = new JSDOM(html, { url: REMOTEOK_JOB_URL });
      setGlobals(dom);

      const fields = extractFields();

      expect(fields.remote_status).toBe("remote");
    });
  });
});
