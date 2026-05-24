import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import SettingsAgentProfileSection from "./SettingsAgentProfileSection";

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
      <SettingsAgentProfileSection />
    </MemoryRouter>
  );
}

describe("SettingsAgentProfileSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUpdateUser.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });
    useAuth.mockReturnValue({
      user: {
        agent_profile: {
          target_roles: ["Software Engineer"],
          preferred_locations: ["Remote"],
          career_goals: "Staff IC track",
          communication_style: "balanced",
          memory_notes: "Prefer startups",
        },
      },
    });
  });

  it("should render agent profile fields and policy note", () => {
    renderSection();

    expect(screen.getByRole("heading", { name: /agent profile/i })).toBeInTheDocument();
    expect(screen.getByText(/suggests only/i)).toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Staff IC track")).toBeInTheDocument();
  });

  it("should save agent profile via PATCH payload", async () => {
    mockMutateAsync.mockResolvedValue({});
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      agent_profile: {
        target_roles: ["Software Engineer"],
        preferred_locations: ["Remote"],
        career_goals: "Staff IC track",
        communication_style: "balanced",
        memory_notes: "Prefer startups",
      },
    });
  });
});
