/** Tests for csvImport utilities — parse, mapping, preview, blob transform. */

import { describe, it, expect } from "vitest";

import {
  buildMappedCsvBlob,
  getMappedPreviewRows,
  guessColumnMapping,
  isMappingValid,
  parseCsvText,
} from "./csvImport";

describe("parseCsvText", () => {
  it("should parse headers and rows from CSV text", () => {
    const text = "company,role_title\nAcme,Engineer\nBeta,Designer";
    const parsed = parseCsvText(text);

    expect(parsed.headers).toEqual(["company", "role_title"]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toEqual(["Acme", "Engineer"]);
  });

  it("should handle quoted fields with commas", () => {
    const text = 'company,role_title\n"Acme, Inc",Engineer';
    const parsed = parseCsvText(text);

    expect(parsed.rows[0]).toEqual(["Acme, Inc", "Engineer"]);
  });
});

describe("guessColumnMapping", () => {
  it("should auto-map common header aliases", () => {
    const mapping = guessColumnMapping(["Employer", "Job Title", "City"]);

    expect(mapping.company).toBe("Employer");
    expect(mapping.role_title).toBe("Job Title");
    expect(mapping.location).toBe("City");
  });
});

describe("isMappingValid", () => {
  it("should require company and role_title mappings", () => {
    expect(isMappingValid({ company: "Employer", role_title: "Title" })).toBe(true);
    expect(isMappingValid({ company: "Employer" })).toBe(false);
  });
});

describe("getMappedPreviewRows", () => {
  it("should return mapped preview rows", () => {
    const parsed = parseCsvText("Employer,Title\nAcme,SWE");
    const mapping = { company: "Employer", role_title: "Title" };
    const preview = getMappedPreviewRows(parsed, mapping);

    expect(preview).toEqual([{ company: "Acme", role_title: "SWE" }]);
  });
});

describe("buildMappedCsvBlob", () => {
  it("should produce CSV with target field headers", async () => {
    const parsed = parseCsvText("Employer,Title\nAcme,SWE");
    const mapping = { company: "Employer", role_title: "Title" };
    const blob = buildMappedCsvBlob(parsed, mapping);
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });

    expect(text).toBe("company,role_title\nAcme,SWE");
  });
});
