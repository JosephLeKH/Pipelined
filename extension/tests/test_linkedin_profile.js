/**
 * linkedin_profile board tests — isJobPage() detection and extractFields() extraction.
 * Uses JSDOM fixtures to simulate LinkedIn profile pages.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { JSDOM } from "jsdom";

const PROFILE_URL = "https://www.linkedin.com/in/jane-doe";
const NON_PROFILE_URL = "https://www.linkedin.com/jobs/view/12345";
const FEED_URL = "https://www.linkedin.com/feed/";

function setupDOM(url = PROFILE_URL, bodyHtml = "") {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${bodyHtml}</body></html>`, { url });
  global.document = dom.window.document;
  global.window = dom.window;
}

let isJobPage;
let extractFields;

beforeEach(async () => {
  setupDOM();
  // Re-import each test so window/document globals are fresh
  const mod = await import("../content/boards/linkedin_profile.js?v=" + Math.random());
  isJobPage = mod.isJobPage;
  extractFields = mod.extractFields;
});

// ── isJobPage() ───────────────────────────────────────────────────────────────

describe("isJobPage()", () => {
  it("should return false when URL is not a LinkedIn profile", () => {
    setupDOM(NON_PROFILE_URL, "<h1 class='text-heading-xlarge'>Jane Doe</h1>");

    expect(isJobPage()).toBe(false);
  });

  it("should return false for LinkedIn feed URLs", () => {
    setupDOM(FEED_URL, "<h1 class='text-heading-xlarge'>Jane Doe</h1>");

    expect(isJobPage()).toBe(false);
  });

  it("should return false when profile URL has no heading element", () => {
    setupDOM(PROFILE_URL, "<div>No heading here</div>");

    expect(isJobPage()).toBe(false);
  });

  it("should return true for profile URL with text-heading-xlarge h1", () => {
    setupDOM(PROFILE_URL, "<h1 class='text-heading-xlarge'>Jane Doe</h1>");

    expect(isJobPage()).toBe(true);
  });

  it("should return true for profile URL with text-heading class on h1", () => {
    setupDOM(PROFILE_URL, "<h1 class='text-heading-large ember-view'>Jane Doe</h1>");

    expect(isJobPage()).toBe(true);
  });
});

// ── extractFields() ───────────────────────────────────────────────────────────

describe("extractFields()", () => {
  it("should return type 'contact'", () => {
    setupDOM(PROFILE_URL, "<h1 class='text-heading-xlarge'>Jane Doe</h1>");

    const fields = extractFields();

    expect(fields.type).toBe("contact");
  });

  it("should extract name from h1.text-heading-xlarge", () => {
    setupDOM(PROFILE_URL, "<h1 class='text-heading-xlarge'>Jane Doe</h1>");

    const fields = extractFields();

    expect(fields.name).toBe("Jane Doe");
  });

  it("should return null name when no heading element is present", () => {
    setupDOM(PROFILE_URL, "<div>No heading</div>");

    const fields = extractFields();

    expect(fields.name).toBeNull();
  });

  it("should extract headline from .pv-text-details__left-panel .text-body-medium", () => {
    setupDOM(
      PROFILE_URL,
      `<h1 class="text-heading-xlarge">Jane Doe</h1>
       <div class="pv-text-details__left-panel">
         <div class="text-body-medium">Software Engineer at Acme</div>
       </div>`
    );

    const fields = extractFields();

    expect(fields.headline).toBe("Software Engineer at Acme");
  });

  it("should return null headline when element is absent", () => {
    setupDOM(PROFILE_URL, "<h1 class='text-heading-xlarge'>Jane Doe</h1>");

    const fields = extractFields();

    expect(fields.headline).toBeNull();
  });

  it("should include linkedin_url equal to current href", () => {
    setupDOM(PROFILE_URL, "<h1 class='text-heading-xlarge'>Jane Doe</h1>");

    const fields = extractFields();

    expect(fields.linkedin_url).toBe(PROFILE_URL);
  });
});
