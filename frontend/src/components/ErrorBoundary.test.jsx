/** Tests for ErrorBoundary — verifies error catching, fallback UI, and reset behavior. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import ErrorBoundary from "./ErrorBoundary";

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function ThrowError({ shouldThrow }) {
  if (shouldThrow) throw new Error("Test error message");
  return <div>No error</div>;
}

beforeEach(() => {
  // Suppress expected console.error output from error boundary
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe("ErrorBoundary", () => {
  it("should render children when there is no error", () => {
    // Arrange / Act
    renderWithRouter(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );

    // Assert
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("should show fallback UI when a child throws", () => {
    // Arrange / Act
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    // Assert
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
  });

  it("should render custom fallback when fallback prop is provided", () => {
    // Arrange / Act
    renderWithRouter(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    // Assert
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
  });

  it("should reset and re-render children when Refresh is clicked after fixing the error", async () => {
    // Arrange — use a mutable ref so the child stops throwing when reset fires
    const user = userEvent.setup();
    let shouldThrow = true;

    function ControlledError() {
      if (shouldThrow) throw new Error("Test error message");
      return <div>No error</div>;
    }

    renderWithRouter(
      <ErrorBoundary>
        <ControlledError />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Act — fix the throw, then reset
    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: /refresh/i }));

    // Assert
    expect(screen.getByText("No error")).toBeInTheDocument();
  });
});
