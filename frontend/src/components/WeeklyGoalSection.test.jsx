import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WeeklyGoalSection from "./WeeklyGoalSection";

describe("WeeklyGoalSection", () => {
  const onSaveGoal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render input with initial weekly goal value", () => {
    render(<WeeklyGoalSection weeklyGoal={5} isGoalPending={false} onSaveGoal={onSaveGoal} />);

    const input = screen.getByRole("spinbutton", { name: /weekly application goal/i });
    expect(input.value).toBe("5");
  });

  it("should show validation error when goal is out of range", () => {
    render(<WeeklyGoalSection weeklyGoal={5} isGoalPending={false} onSaveGoal={onSaveGoal} />);

    const input = screen.getByRole("spinbutton", { name: /weekly application goal/i });
    fireEvent.change(input, { target: { value: "100" } });

    fireEvent.click(screen.getByRole("button", { name: /save goal/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/must be between/i);
    expect(onSaveGoal).not.toHaveBeenCalled();
  });

  it("should call onSaveGoal with parsed number when save is clicked", async () => {
    onSaveGoal.mockResolvedValue(undefined);

    render(<WeeklyGoalSection weeklyGoal={5} isGoalPending={false} onSaveGoal={onSaveGoal} />);

    const input = screen.getByRole("spinbutton", { name: /weekly application goal/i });
    fireEvent.change(input, { target: { value: "7" } });

    fireEvent.click(screen.getByRole("button", { name: /save goal/i }));

    expect(onSaveGoal).toHaveBeenCalledWith(7);
  });

  it("should show success message after save", async () => {
    onSaveGoal.mockResolvedValue(undefined);

    render(<WeeklyGoalSection weeklyGoal={5} isGoalPending={false} onSaveGoal={onSaveGoal} />);

    fireEvent.click(screen.getByRole("button", { name: /save goal/i }));

    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("Weekly goal saved.");
  });

  it("should show error message when save fails", async () => {
    onSaveGoal.mockRejectedValue(new Error("Server error"));

    render(<WeeklyGoalSection weeklyGoal={5} isGoalPending={false} onSaveGoal={onSaveGoal} />);

    fireEvent.click(screen.getByRole("button", { name: /save goal/i }));

    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to save goal.");
  });

  it("should render compact progress bar on Today", () => {
    render(
      <WeeklyGoalSection compact appliedThisWeek={5} weeklyGoal={10} timezone="America/Los_Angeles" />,
    );

    expect(screen.getByText("5 / 10 applications this week")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should show Set goal link in compact mode when goal is zero", () => {
    render(
      <MemoryRouter>
        <WeeklyGoalSection compact appliedThisWeek={0} weeklyGoal={0} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Set goal" })).toHaveAttribute(
      "href",
      "/settings?section=pipeline",
    );
  });
});
