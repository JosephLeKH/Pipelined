import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DuplicateWarning } from "./DuplicateWarning";

describe("DuplicateWarning", () => {
  it("should display duplicate warning text", () => {
    render(<DuplicateWarning existingId="abc123" />);

    expect(screen.getByText(/already exists/i)).toBeInTheDocument();
  });

  it("should render a link pointing to the existing application", () => {
    render(<DuplicateWarning existingId="abc123" />);

    const link = screen.getByRole("link", { name: /view existing application/i });
    expect(link).toHaveAttribute("href", "/dashboard?application=abc123");
  });
});
