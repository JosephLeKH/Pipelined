/** Tests for SettingsAccountSection — password change and account deletion flows. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { MemoryRouter } from "react-router-dom";

let mockChangePassword;
let mockDeleteAccount;

vi.mock("../hooks/useAuth", () => ({
  useChangePassword: vi.fn(() => ({ mutateAsync: mockChangePassword, isPending: false })),
  useDeleteAccount: vi.fn(() => ({ mutateAsync: mockDeleteAccount, isPending: false })),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useChangePassword, useDeleteAccount } from "../hooks/useAuth";
import { toast } from "sonner";
import SettingsAccountSection from "./SettingsAccountSection";
import { PASSWORD_MIN_LENGTH } from "../lib/constants";

const VALID_PASSWORD = "Str0ngPass!";

function renderSection() {
  render(
    <MemoryRouter>
      <SettingsAccountSection />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockChangePassword = vi.fn().mockResolvedValue({});
  mockDeleteAccount = vi.fn().mockResolvedValue({});
  vi.mocked(useChangePassword).mockReturnValue({ mutateAsync: mockChangePassword, isPending: false });
  vi.mocked(useDeleteAccount).mockReturnValue({ mutateAsync: mockDeleteAccount, isPending: false });
});

describe("ChangePasswordCard — validation", () => {
  it("should show error when current password is empty on submit", async () => {
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: /change password/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/current password is required/i);
  });

  it("should show error when new password is too short", async () => {
    renderSection();

    await userEvent.type(screen.getByLabelText(/current password/i), "mypassword");
    await userEvent.type(screen.getByLabelText(/^new password$/i), "short");
    await userEvent.click(screen.getByRole("button", { name: /change password/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(new RegExp(`at least ${PASSWORD_MIN_LENGTH}`, "i"));
  });

  it("should show error when passwords do not match", async () => {
    renderSection();

    await userEvent.type(screen.getByLabelText(/current password/i), "mypassword");
    await userEvent.type(screen.getByLabelText(/^new password$/i), VALID_PASSWORD);
    await userEvent.type(screen.getByLabelText(/confirm new password/i), "different");
    await userEvent.click(screen.getByRole("button", { name: /change password/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/do not match/i);
  });

  it("should not show error with valid matching passwords", async () => {
    renderSection();

    await userEvent.type(screen.getByLabelText(/current password/i), "mypassword");
    await userEvent.type(screen.getByLabelText(/^new password$/i), VALID_PASSWORD);
    await userEvent.type(screen.getByLabelText(/confirm new password/i), VALID_PASSWORD);
    await userEvent.click(screen.getByRole("button", { name: /change password/i }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ChangePasswordCard — submission", () => {
  it("should call changePassword mutation with valid inputs", async () => {
    renderSection();

    await userEvent.type(screen.getByLabelText(/current password/i), "mypassword");
    await userEvent.type(screen.getByLabelText(/^new password$/i), VALID_PASSWORD);
    await userEvent.type(screen.getByLabelText(/confirm new password/i), VALID_PASSWORD);
    await userEvent.click(screen.getByRole("button", { name: /change password/i }));

    expect(mockChangePassword).toHaveBeenCalledWith({
      current_password: "mypassword",
      new_password: VALID_PASSWORD,
    });
  });

  it("should show success toast after password change", async () => {
    renderSection();

    await userEvent.type(screen.getByLabelText(/current password/i), "mypassword");
    await userEvent.type(screen.getByLabelText(/^new password$/i), VALID_PASSWORD);
    await userEvent.type(screen.getByLabelText(/confirm new password/i), VALID_PASSWORD);
    await userEvent.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/password changed/i));
    });
  });

  it("should map CURRENT_PASSWORD_INCORRECT error code to friendly message", async () => {
    mockChangePassword = vi.fn().mockRejectedValue({
      response: { data: { detail: { code: "CURRENT_PASSWORD_INCORRECT" } } },
    });
    vi.mocked(useChangePassword).mockReturnValue({ mutateAsync: mockChangePassword, isPending: false });
    renderSection();

    await userEvent.type(screen.getByLabelText(/current password/i), "wrongpassword");
    await userEvent.type(screen.getByLabelText(/^new password$/i), VALID_PASSWORD);
    await userEvent.type(screen.getByLabelText(/confirm new password/i), VALID_PASSWORD);
    await userEvent.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/current password is incorrect/i);
    });
  });

  it("should map PASSWORD_TOO_WEAK error code to friendly message", async () => {
    mockChangePassword = vi.fn().mockRejectedValue({
      response: { data: { detail: { code: "PASSWORD_TOO_WEAK" } } },
    });
    vi.mocked(useChangePassword).mockReturnValue({ mutateAsync: mockChangePassword, isPending: false });
    renderSection();

    await userEvent.type(screen.getByLabelText(/current password/i), "mypassword");
    await userEvent.type(screen.getByLabelText(/^new password$/i), VALID_PASSWORD);
    await userEvent.type(screen.getByLabelText(/confirm new password/i), VALID_PASSWORD);
    await userEvent.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/password must have at least 8 characters/i);
    });
  });

  it("should show fallback error for unknown error codes", async () => {
    mockChangePassword = vi.fn().mockRejectedValue({ response: { data: { detail: { code: "UNKNOWN" } } } });
    vi.mocked(useChangePassword).mockReturnValue({ mutateAsync: mockChangePassword, isPending: false });
    renderSection();

    await userEvent.type(screen.getByLabelText(/current password/i), "mypassword");
    await userEvent.type(screen.getByLabelText(/^new password$/i), VALID_PASSWORD);
    await userEvent.type(screen.getByLabelText(/confirm new password/i), VALID_PASSWORD);
    await userEvent.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/failed to change password/i);
    });
  });
});

describe("DangerZone — modal interaction", () => {
  it("should not show delete modal on initial render", () => {
    renderSection();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should open delete modal when delete account button is clicked", async () => {
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: /delete account$/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/delete account\?/i)).toBeInTheDocument();
  });

  it("should have accessible dialog title when delete modal is open", async () => {
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: /delete account$/i }));

    expect(screen.getByRole("heading", { name: /delete account\?/i })).toBeInTheDocument();
  });

  it("should close modal when cancel is clicked", async () => {
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: /delete account$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should call deleteAccount mutation when confirm delete is clicked", async () => {
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: /delete account$/i }));
    await userEvent.click(screen.getByRole("button", { name: /delete my account/i }));

    expect(mockDeleteAccount).toHaveBeenCalledOnce();
  });

  it("should show success toast after account deletion", async () => {
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: /delete account$/i }));
    await userEvent.click(screen.getByRole("button", { name: /delete my account/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/account deleted/i));
    });
  });

  it("should show error toast when delete fails", async () => {
    mockDeleteAccount = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.mocked(useDeleteAccount).mockReturnValue({ mutateAsync: mockDeleteAccount, isPending: false });
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: /delete account$/i }));
    await userEvent.click(screen.getByRole("button", { name: /delete my account/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/failed to delete/i));
    });
  });
});
