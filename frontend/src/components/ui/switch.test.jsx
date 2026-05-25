import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "./switch";

describe("Switch", () => {
  it("should render as switch with aria-checked false by default", () => {
    render(<Switch aria-label="Test switch" />);

    expect(screen.getByRole("switch", { name: "Test switch" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("should call onCheckedChange when clicked", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <Switch checked={false} onCheckedChange={onCheckedChange} aria-label="Toggle" />
    );

    await user.click(screen.getByRole("switch"));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("should not fire when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <Switch
        checked={false}
        disabled
        onCheckedChange={onCheckedChange}
        aria-label="Disabled"
      />
    );

    await user.click(screen.getByRole("switch"));

    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
