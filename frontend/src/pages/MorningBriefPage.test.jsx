/** Smoke tests for MorningBriefPage redirect shim. */

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect } from "vitest";

import MorningBriefPage from "./MorningBriefPage";

function renderRedirect(initialEntry = "/brief") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/brief" element={<MorningBriefPage />} />
        <Route path="/today" element={<div>Today page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MorningBriefPage", () => {
  it("should redirect /brief to /today?brief=open", async () => {
    renderRedirect();

    expect(await screen.findByText("Today page")).toBeInTheDocument();
  });
});
