/** Tests for LoginForm — email/password validation, submit gating, error display, loading state. */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { MemoryRouter } from "react-router-dom";

import { LoginForm } from "./LoginForm";
import { PASSWORD_MIN_LENGTH } from "../lib/constants";

function renderForm(overrides = {}) {
  const props = {
    email: "",
    setEmail: vi.fn(),
    password: "",
    setPassword: vi.fn(),
    error: null,
    isPending: false,
    onSubmit: vi.fn((e) => e.preventDefault()),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <LoginForm {...props} />
    </MemoryRouter>
  );
  return props;
}

const VALID_EMAIL = "user@example.com";
const VALID_PASSWORD = "a".repeat(PASSWORD_MIN_LENGTH);

describe("LoginForm — email validation", () => {
  it("should not show email error before blur", () => {
    renderForm({ email: "notanemail" });

    expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
  });

  it("should show inline error for invalid email on blur", () => {
    renderForm({ email: "notanemail" });

    fireEvent.blur(screen.getByLabelText(/email/i));

    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
  });

  it("should not show email error when email is valid after blur", () => {
    renderForm({ email: VALID_EMAIL });

    fireEvent.blur(screen.getByLabelText(/email/i));

    expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
  });

  it("should link email input to error via aria-describedby", () => {
    renderForm({ email: "bad" });

    fireEvent.blur(screen.getByLabelText(/email/i));

    expect(screen.getByLabelText(/email/i)).toHaveAttribute("aria-describedby", "email-error");
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("should not set aria-invalid on a valid email", () => {
    renderForm({ email: VALID_EMAIL });

    fireEvent.blur(screen.getByLabelText(/email/i));

    expect(screen.getByLabelText(/email/i)).toHaveAttribute("aria-invalid", "false");
  });
});

describe("LoginForm — password validation", () => {
  it("should not show password error before blur", () => {
    renderForm({ password: "short" });

    expect(screen.queryByText(/at least/i)).not.toBeInTheDocument();
  });

  it("should show inline error for short password on blur", () => {
    renderForm({ password: "short" });

    fireEvent.blur(screen.getByLabelText(/^password$/i));

    expect(screen.getByText(new RegExp(`at least ${PASSWORD_MIN_LENGTH}`, "i"))).toBeInTheDocument();
  });

  it("should not show password error when password meets minimum length", () => {
    renderForm({ password: VALID_PASSWORD });

    fireEvent.blur(screen.getByLabelText(/^password$/i));

    expect(screen.queryByText(/at least/i)).not.toBeInTheDocument();
  });

  it("should link password input to error via aria-describedby on error", () => {
    renderForm({ password: "x" });

    fireEvent.blur(screen.getByLabelText(/^password$/i));

    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("aria-describedby", "password-error");
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("aria-invalid", "true");
  });
});

describe("LoginForm — submit button state", () => {
  it("should disable submit when email is invalid", () => {
    renderForm({ email: "bad", password: VALID_PASSWORD });

    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
  });

  it("should disable submit when password is too short", () => {
    renderForm({ email: VALID_EMAIL, password: "short" });

    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
  });

  it("should enable submit when email is valid and password meets length", () => {
    renderForm({ email: VALID_EMAIL, password: VALID_PASSWORD });

    expect(screen.getByRole("button", { name: /sign in/i })).not.toBeDisabled();
  });

  it("should disable submit while isPending even with valid inputs", () => {
    renderForm({ email: VALID_EMAIL, password: VALID_PASSWORD, isPending: true });

    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
  });
});

describe("LoginForm — submission behavior", () => {
  it("should call onSubmit when form is valid", async () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    renderForm({ email: VALID_EMAIL, password: VALID_PASSWORD, onSubmit });

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("should not call onSubmit when email is invalid", async () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    renderForm({ email: "bad", password: VALID_PASSWORD, onSubmit });

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should show validation errors on submit attempt with invalid inputs", () => {
    renderForm({ email: "bad", password: "" });

    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form"));

    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    expect(screen.getByText(/at least/i)).toBeInTheDocument();
  });
});

describe("LoginForm — server error display", () => {
  it("should show server error message via alert role", () => {
    renderForm({ error: "Invalid credentials." });

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials.");
  });

  it("should not render alert when error is null", () => {
    renderForm({ error: null });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
