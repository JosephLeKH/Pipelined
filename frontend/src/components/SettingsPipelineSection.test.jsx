import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsPipelineSection from "./SettingsPipelineSection";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useUpdateUser: vi.fn(),
}));

vi.mock("./PipelineStagesEditor", () => ({
  default: ({ onSave }) => (
    <button onClick={() => onSave(["Applied", "Phone Screen"])}>Stub Save Stages</button>
  ),
}));

vi.mock("./WeeklyGoalSection", () => ({
  default: () => <div data-testid="weekly-goal-stub" />,
}));

import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";

const mockMutateAsync = vi.fn();

const MOCK_USER = {
  default_stages: ["Applied", "Phone Screen"],
  weekly_goal: 5,
  weekly_streak: 0,
};

describe("SettingsPipelineSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: MOCK_USER });
    useUpdateUser.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false, error: null });
  });

  it("should render Pipeline Stages heading", () => {
    render(<SettingsPipelineSection />);

    expect(screen.getByRole("heading", { name: /pipeline stages/i })).toBeInTheDocument();
  });

  it("should show PipelineStagesEditor when user has stages", () => {
    render(<SettingsPipelineSection />);

    expect(screen.getByRole("button", { name: /stub save stages/i })).toBeInTheDocument();
  });

  it("should show success banner after save", async () => {
    mockMutateAsync.mockResolvedValue({ default_stages: ["Applied", "Phone Screen"] });

    render(<SettingsPipelineSection />);

    fireEvent.click(screen.getByRole("button", { name: /stub save stages/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Stages saved successfully.");
  });

  it("should show streak badge when user has a weekly streak", () => {
    useAuth.mockReturnValue({ user: { ...MOCK_USER, weekly_streak: 3 } });

    render(<SettingsPipelineSection />);

    expect(screen.getByText(/3-week streak/i)).toBeInTheDocument();
  });
});
