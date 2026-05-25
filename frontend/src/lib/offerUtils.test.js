import { describe, it, expect } from "vitest";

import { computeTotalY1, findBestOfferId } from "./offerUtils";

describe("computeTotalY1", () => {
  it("should sum base, equity annual, and signing bonus", () => {
    expect(
      computeTotalY1({ base_salary: 200000, equity_annual_value: 80000, signing_bonus: 30000 })
    ).toBe(310000);
  });

  it("should treat missing fields as zero", () => {
    expect(computeTotalY1({ base_salary: 175000 })).toBe(175000);
  });
});

describe("findBestOfferId", () => {
  it("should return id of offer with highest Total Y1", () => {
    const apps = [
      { id: "a", offer_details: { base_salary: 200000, equity_annual_value: 80000, signing_bonus: 30000 } },
      { id: "b", offer_details: { base_salary: 175000, equity_annual_value: 120000, signing_bonus: 20000 } },
    ];

    expect(findBestOfferId(apps)).toBe("b");
  });

  it("should return null when all totals are zero", () => {
    expect(findBestOfferId([{ id: "a", offer_details: {} }])).toBeNull();
  });
});
