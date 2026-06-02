import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import ScoutAvatar from "./ScoutAvatar";

describe("ScoutAvatar", () => {
  it("renders the Scout glyph with default md size", () => {
    render(<ScoutAvatar />);
    const avatar = screen.getByLabelText("Scout");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveClass("h-6", "w-6");
  });

  it("renders small (sm) variant", () => {
    render(<ScoutAvatar size="sm" />);
    const avatar = screen.getByLabelText("Scout");
    expect(avatar).toHaveClass("h-4", "w-4");
  });

  it("renders large (lg) variant", () => {
    render(<ScoutAvatar size="lg" />);
    const avatar = screen.getByLabelText("Scout");
    expect(avatar).toHaveClass("h-8", "w-8");
  });

  it("uses pulse state aria label when state=pulse", () => {
    render(<ScoutAvatar state="pulse" />);
    expect(screen.getByLabelText("Scout — has new")).toBeInTheDocument();
  });

  it("uses working state aria label when state=working", () => {
    render(<ScoutAvatar state="working" />);
    expect(screen.getByLabelText("Scout — working")).toBeInTheDocument();
  });

  it("respects prefers-reduced-motion class on pulse state", () => {
    render(<ScoutAvatar state="pulse" />);
    const avatar = screen.getByLabelText("Scout — has new");
    expect(avatar.className).toMatch(/motion-safe:animate-pulse/);
  });
});
