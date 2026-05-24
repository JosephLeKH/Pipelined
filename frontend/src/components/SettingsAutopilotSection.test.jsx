import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import SettingsAutopilotSection from "./SettingsAutopilotSection";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useUpdateUser: vi.fn(),
}));

import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";

const mockMutateAsync = vi.fn();

function renderSection() {
  return render(
    <MemoryRouter>
      <SettingsAutopilotSection />
    </MemoryRouter>
  );
}

describe("SettingsAutopilotSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUpdateUser.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });
    useAuth.mockReturnValue({
      user: {
        has_resume: true,
        autopilot_enabled: false,
        autopilot_min_match_score: 80,
        autopilot_max_daily: 5,
        timezone: "America/New_York",
      },
    });
  });

  it("should render explainer copy about never submitting", () => {
    renderSection();

    expect(screen.getByText(/we never submit applications for you/i)).toBeInTheDocument();
  });

  it("should show resume-required alert when user has no resume", () => {
    useAuth.mockReturnValue({
      user: { has_resume: false, autopilot_enabled: false },
    });

    renderSection();

    expect(screen.getByRole("alert")).toHaveTextContent(/upload a resume/i);
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("should show next scan preview", () => {
    renderSection();

    expect(screen.getByText(/next scan:/i)).toBeInTheDocument();
    expect(screen.getByText(/america\/new_york/i)).toBeInTheDocument();
  });

  it("should save all autopilot preferences with one Save button", async () => {
    mockMutateAsync.mockResolvedValue({});
    renderSection();

    await userEvent.click(screen.getByRole("switch"));
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      autopilot_enabled: true,
      autopilot_min_match_score: 80,
      autopilot_max_daily: 5,
    });
  });

  it("should label minimum score as Minimum fit score", () => {
    renderSection();

    expect(screen.getByText(/minimum fit score/i)).toBeInTheDocument();
  });
});
