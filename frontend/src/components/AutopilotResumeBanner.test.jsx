import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import AutopilotResumeBanner from "./AutopilotResumeBanner";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../context/AuthContext";

describe("AutopilotResumeBanner", () => {
  it("should show banner when user has no resume", () => {
    useAuth.mockReturnValue({ user: { has_resume: false } });

    render(
      <MemoryRouter>
        <AutopilotResumeBanner />
      </MemoryRouter>
    );

    expect(screen.getByTestId("autopilot-resume-banner")).toBeInTheDocument();
    expect(screen.getByText(/upload a resume to enable autopilot/i)).toBeInTheDocument();
  });

  it("should hide banner when user has resume", () => {
    useAuth.mockReturnValue({ user: { has_resume: true } });

    render(
      <MemoryRouter>
        <AutopilotResumeBanner />
      </MemoryRouter>
    );

    expect(screen.queryByTestId("autopilot-resume-banner")).not.toBeInTheDocument();
  });
});
