import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import TopBarScoutMenu from "./TopBarScoutMenu";

describe("TopBarScoutMenu", () => {
  it("renders Scout avatar with idle state by default", () => {
    render(<TopBarScoutMenu hasNew={false} onAskScout={() => {}} />);
    const button = screen.getByRole("button", { name: "Scout" });
    expect(button).toBeInTheDocument();
  });

  it("renders pulse state when hasNew=true", () => {
    render(<TopBarScoutMenu hasNew={true} onAskScout={() => {}} />);
    const button = screen.getByRole("button", { name: "Scout — has new" });
    expect(button).toBeInTheDocument();
  });

  it("calls onAskScout when avatar clicked", async () => {
    const onAskScout = vi.fn();
    render(<TopBarScoutMenu hasNew={false} onAskScout={onAskScout} />);
    await userEvent.click(screen.getByRole("button", { name: "Scout" }));
    expect(onAskScout).toHaveBeenCalledOnce();
  });
});
