import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AiPanelGroup from "./AiPanelGroup";

describe("AiPanelGroup", () => {
  it("should render children when expanded by default", () => {
    render(
      <AiPanelGroup>
        <p>Fit section</p>
      </AiPanelGroup>
    );

    expect(screen.getByText("Fit section")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ai insights/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("should collapse and hide children when toggled", async () => {
    render(
      <AiPanelGroup>
        <p>Hidden content</p>
      </AiPanelGroup>
    );

    await userEvent.click(screen.getByRole("button", { name: /ai insights/i }));

    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ai insights/i })).toHaveAttribute("aria-expanded", "false");
  });
});
