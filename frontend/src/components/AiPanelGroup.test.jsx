import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AiPanelGroup from "./AiPanelGroup";

describe("AiPanelGroup", () => {
  it("should hide children when collapsed by default", () => {
    render(
      <AiPanelGroup>
        <p>Fit section</p>
      </AiPanelGroup>
    );

    expect(screen.queryByText("Fit section")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^ai$/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("should expand and show children when toggled open", async () => {
    render(
      <AiPanelGroup>
        <p>Hidden content</p>
      </AiPanelGroup>
    );

    await userEvent.click(screen.getByRole("button", { name: /^ai$/i }));

    expect(screen.getByText("Hidden content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^ai$/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("should render children when defaultOpen is true", () => {
    render(
      <AiPanelGroup defaultOpen>
        <p>Fit section</p>
      </AiPanelGroup>
    );

    expect(screen.getByText("Fit section")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^ai$/i })).toHaveAttribute("aria-expanded", "true");
  });
});
