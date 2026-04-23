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
  it("should not show strength list when password is empty", () => {
    renderForm({ password: "" });

    expect(screen.queryByRole("list", { name: /password requirements/i })).not.toBeInTheDocument();
  });

  it("should show requirements list when password is non-empty", () => {
    renderForm({ password: "a" });

    expect(screen.getByRole("list", { name: /password requirements/i })).toBeInTheDocument();
  });

  it("should show length requirement as unmet when password is short", () => {
    renderForm({ password: "abc" });

    const items = screen.getAllByRole("listitem");
    const lengthItem = items.find((el) => el.textContent.includes("characters"));
    expect(lengthItem).toHaveClass("text-gray-500");
  });

  it("should show length requirement as met when password is 8+ chars", () => {
    renderForm({ password: "abcdefgh" });

    const items = screen.getAllByRole("listitem");
    const lengthItem = items.find((el) => el.textContent.includes("characters"));
    expect(lengthItem).toHaveClass("text-green-600");
  });

  it("should show uppercase requirement as met when password has uppercase", () => {
    renderForm({ password: "Abcdefgh1" });

    const items = screen.getAllByRole("listitem");
    const uppercaseItem = items.find((el) => el.textContent.includes("uppercase"));
    expect(uppercaseItem).toHaveClass("text-green-600");
  });

  it("should show number requirement as met when password has a digit", () => {
    renderForm({ password: "Abcdefg1" });

    const items = screen.getAllByRole("listitem");
    const numberItem = items.find((el) => el.textContent.includes("number"));
    expect(numberItem).toHaveClass("text-green-600");
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
