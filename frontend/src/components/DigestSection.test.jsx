import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DigestSection from "./DigestSection";

describe("DigestSection", () => {
  it("should show Enabled label when digestEnabled is true", () => {
    render(<DigestSection digestEnabled={true} isDigestPending={false} onDigestToggle={vi.fn()} />);

    expect(screen.getByText("Enabled")).toBeInTheDocument();
  });

  it("should show Disabled label when digestEnabled is false", () => {
    render(<DigestSection digestEnabled={false} isDigestPending={false} onDigestToggle={vi.fn()} />);

    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("should have aria-checked=true when digestEnabled is true", () => {
    render(<DigestSection digestEnabled={true} isDigestPending={false} onDigestToggle={vi.fn()} />);

    expect(screen.getByRole("switch", { name: /weekly digest email/i })).toHaveAttribute("aria-checked", "true");
  });

  it("should call onDigestToggle with toggled value when switch is clicked", () => {
    const onDigestToggle = vi.fn();

    render(<DigestSection digestEnabled={false} isDigestPending={false} onDigestToggle={onDigestToggle} />);
    fireEvent.click(screen.getByRole("switch"));

    expect(onDigestToggle).toHaveBeenCalledWith(true);
  });

  it("should disable switch when isDigestPending is true", () => {
    render(<DigestSection digestEnabled={false} isDigestPending={true} onDigestToggle={vi.fn()} />);

    expect(screen.getByRole("switch")).toBeDisabled();
  });
});
