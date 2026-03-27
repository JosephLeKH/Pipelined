/** Tests for ErrorBoundary — verifies error catching, fallback UI, and reset behavior. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import ErrorBoundary from "./ErrorBoundary";

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
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );

    // Assert
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("should show fallback UI when a child throws", () => {
    // Arrange / Act
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    // Assert
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it("should show generic message when error has no message", () => {
    // Arrange
    function ThrowNoMessage() {
      const err = new Error();
      err.message = "";
      throw err;
    }

    // Act
    render(
      <ErrorBoundary>
        <ThrowNoMessage />
      </ErrorBoundary>
    );

    // Assert
    expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument();
  });

  it("should render custom fallback when fallback prop is provided", () => {
    // Arrange / Act
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    // Assert
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
  });

  it("should reset and re-render children when Try again is clicked after fixing the error", async () => {
    // Arrange — use a mutable ref so the child stops throwing when reset fires
    const user = userEvent.setup();
    let shouldThrow = true;

    function ControlledError() {
      if (shouldThrow) throw new Error("Test error message");
      return <div>No error</div>;
    }

    render(
      <ErrorBoundary>
        <ControlledError />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Act — fix the throw, then reset
    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: /try again/i }));

    // Assert
    expect(screen.getByText("No error")).toBeInTheDocument();
  });
});
