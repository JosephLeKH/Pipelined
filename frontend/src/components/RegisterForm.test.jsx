/** Tests for RegisterForm — email validation, password strength indicator, submit button state. */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { RegisterForm } from "./RegisterForm";

function renderForm(overrides = {}) {
  const props = {
    displayName: "",
    setDisplayName: vi.fn(),
    email: "",
    setEmail: vi.fn(),
    password: "",
    setPassword: vi.fn(),
    error: null,
    isPending: false,
    onSubmit: vi.fn((e) => e.preventDefault()),
    ...overrides,
  };
  render(<RegisterForm {...props} />);
  return props;
}

describe("RegisterForm — email validation", () => {
  it("should not show email error before blur", () => {
    renderForm({ email: "notanemail" });

    expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
  });

  it("should show inline error for invalid email on blur", async () => {
    renderForm({ email: "notanemail" });

    fireEvent.blur(screen.getByLabelText(/email/i));

    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
  });

  it("should not show email error when email is valid after blur", async () => {
    renderForm({ email: "user@example.com" });

    fireEvent.blur(screen.getByLabelText(/email/i));

    expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
  });

  it("should show error via aria-describedby when present", () => {
    renderForm({ email: "bad" });

    fireEvent.blur(screen.getByLabelText(/email/i));

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute("aria-describedby", "email-error");
  });
});

describe("RegisterForm — password strength indicator", () => {
  it("should not show strength meter when password is empty", () => {
    renderForm({ password: "" });

    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
  });

  it("should show strength meter when password is non-empty", () => {
    renderForm({ password: "a" });

    expect(screen.getByRole("meter", { name: /password strength/i })).toBeInTheDocument();
  });

  it("should show Weak label for minimal password", () => {
    renderForm({ password: "abc" });

    expect(screen.getByText("Weak")).toBeInTheDocument();
  });

  it("should show Fair label when length requirement is met", () => {
    renderForm({ password: "abcdefgh" });

    expect(screen.getByText("Fair")).toBeInTheDocument();
  });

  it("should show Good label when length and uppercase are met", () => {
    renderForm({ password: "Abcdefgh" });

    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("should show Strong label when all requirements are met", () => {
    renderForm({ password: "Abcdefg1" });

    expect(screen.getByText("Strong")).toBeInTheDocument();
  });
});

describe("RegisterForm — submit button state", () => {
  it("should disable submit when email is invalid", () => {
    renderForm({ email: "bad", password: "Abcdefg1" });

    expect(screen.getByRole("button", { name: /create account/i })).toBeDisabled();
  });

  it("should disable submit when password does not meet requirements", () => {
    renderForm({ email: "user@example.com", password: "weak" });

    expect(screen.getByRole("button", { name: /create account/i })).toBeDisabled();
  });

  it("should enable submit when email is valid and password meets all requirements", () => {
    renderForm({ email: "user@example.com", password: "Abcdefg1" });

    expect(screen.getByRole("button", { name: /create account/i })).not.toBeDisabled();
  });

  it("should disable submit while isPending even with valid inputs", () => {
    renderForm({ email: "user@example.com", password: "Abcdefg1", isPending: true });

    expect(screen.getByRole("button", { name: /creating account/i })).toBeDisabled();
  });
});

describe("RegisterForm — server error display", () => {
  it("should show server error message via alert role", () => {
    renderForm({ error: "Email already in use." });

    expect(screen.getByRole("alert")).toHaveTextContent("Email already in use.");
  });
});
