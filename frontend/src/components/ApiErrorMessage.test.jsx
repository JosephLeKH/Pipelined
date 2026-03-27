/** Tests for ApiErrorMessage — verifies error display and retry callback. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import ApiErrorMessage from "./ApiErrorMessage";

describe("ApiErrorMessage", () => {
  it("should display the error message from the error object", () => {
    // Arrange / Act
    render(<ApiErrorMessage error={{ message: "Failed to load applications." }} />);

    // Assert
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Failed to load applications.")).toBeInTheDocument();
  });

  it("should display fallback message when error has no message", () => {
    // Arrange / Act
    render(<ApiErrorMessage error={{}} />);

    // Assert
    expect(screen.getByText("An unexpected error occurred. Please try again.")).toBeInTheDocument();
  });

  it("should display fallback message when error is null", () => {
    // Arrange / Act
    render(<ApiErrorMessage error={null} />);

    // Assert
    expect(screen.getByText("An unexpected error occurred. Please try again.")).toBeInTheDocument();
  });

  it("should not render a Retry button when onRetry is not provided", () => {
    // Arrange / Act
    render(<ApiErrorMessage error={{ message: "Oops" }} />);

    // Assert
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });

  it("should render a Retry button and call onRetry when clicked", async () => {
    // Arrange
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(<ApiErrorMessage error={{ message: "Oops" }} onRetry={onRetry} />);

    // Act
    await user.click(screen.getByRole("button", { name: /retry/i }));

    // Assert
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
