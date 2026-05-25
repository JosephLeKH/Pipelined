/**
 * Scaffold smoke tests — verifies the extension manifest and file structure
 * are valid before board-module tests are added in later stories.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { API_BASE } from "../shared/constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

describe("Extension scaffold", () => {
  describe("manifest.json", () => {
    let manifest;

    beforeAll(() => {
      const raw = readFileSync(resolve(ROOT, "manifest.json"), "utf-8");
      manifest = JSON.parse(raw);
    });

    it("should be Manifest V3", () => {
      expect(manifest.manifest_version).toBe(3);
    });

    it("should have required permissions", () => {
      expect(manifest.permissions).toContain("storage");
      expect(manifest.permissions).toContain("activeTab");
    });

    it("should have API host_permissions", () => {
      expect(manifest.host_permissions).toContain(`${API_BASE}/*`);
    });

    it("should declare a service_worker", () => {
      expect(manifest.background.service_worker).toBe("background/background.js");
    });

    it("should declare content_scripts for job boards", () => {
      const matches = manifest.content_scripts[0].matches;
      expect(matches).toContain("https://www.linkedin.com/jobs/*");
      expect(matches).toContain("https://boards.greenhouse.io/*");
      expect(matches).toContain("https://jobs.lever.co/*");
      expect(matches).toContain("https://jobs.ashbyhq.com/*");
      expect(matches).toContain("https://*.myworkday.com/*");
    });

    it("should point content_scripts to content/content.js", () => {
      expect(manifest.content_scripts[0].js).toContain("content/content.js");
    });

    it("should declare popup HTML", () => {
      expect(manifest.action.default_popup).toBe("popup/popup.html");
    });
  });

  describe("file structure", () => {
    it("should have content/content.js", () => {
      expect(existsSync(resolve(ROOT, "content/content.js"))).toBe(true);
    });

    it("should have content/content.css", () => {
      expect(existsSync(resolve(ROOT, "content/content.css"))).toBe(true);
    });

    it("should have background/background.js", () => {
      expect(existsSync(resolve(ROOT, "background/background.js"))).toBe(true);
    });

    it("should have popup/popup.html", () => {
      expect(existsSync(resolve(ROOT, "popup/popup.html"))).toBe(true);
    });

    it("should have popup/popup.js", () => {
      expect(existsSync(resolve(ROOT, "popup/popup.js"))).toBe(true);
    });

    it("should have popup/popup.css", () => {
      expect(existsSync(resolve(ROOT, "popup/popup.css"))).toBe(true);
    });
  });
});
