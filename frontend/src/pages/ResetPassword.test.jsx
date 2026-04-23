/** Tests for ResetPassword page: form rendering, validation, success, error states. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import ResetPassword from "./ResetPassword";

const server = setupServer(
  http.post("/api/auth/reset-password", async ({ request }) => {
    const body = await request.json();
    if (body.new_password && body.new_password.length >= 8) {
      return HttpResponse.json({ data: { message: "Password reset successfully." } });
    }
    return HttpResponse.json(
      { detail: { code: "TOKEN_MISSING", message: "No reset token found." } },
      { status: 400 }
    );
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/reset-password"]}>
          <Routes>
            <Route path="/reset-password" element={children} />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("ResetPassword", () => {
  it("should render new password and confirm password fields", () => {
    render(<ResetPassword />, { wrapper: makeWrapper() });

    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset password" })).toBeInTheDocument();
  });

  it("should show error when new password is empty", async () => {
    render(<ResetPassword />, { wrapper: makeWrapper() });

    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("New password is required.");
  });

  it("should show error when passwords do not match", async () => {
    render(<ResetPassword />, { wrapper: makeWrapper() });

    await userEvent.type(screen.getByLabelText("New password"), "Password1!");
    await userEvent.type(screen.getByLabelText("Confirm password"), "Different1!");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Passwords do not match.");
  });

  it("should show error when password is too short", async () => {
    render(<ResetPassword />, { wrapper: makeWrapper() });

    await userEvent.type(screen.getByLabelText("New password"), "short");
    await userEvent.type(screen.getByLabelText("Confirm password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("at least 8 characters");
  });

  it("should show success message on valid reset", async () => {
    render(<ResetPassword />, { wrapper: makeWrapper() });

    await userEvent.type(screen.getByLabelText("New password"), "NewPass123!");
    await userEvent.type(screen.getByLabelText("Confirm password"), "NewPass123!");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Password reset successfully");
    });
  });

  it("should show error when reset cookie is missing", async () => {
    server.use(
      http.post("/api/auth/reset-password", () =>
        HttpResponse.json(
          { detail: { code: "TOKEN_MISSING", message: "No reset token found." } },
          { status: 400 }
        )
      )
    );
    render(<ResetPassword />, { wrapper: makeWrapper() });

    await userEvent.type(screen.getByLabelText("New password"), "NewPass123!");
    await userEvent.type(screen.getByLabelText("Confirm password"), "NewPass123!");
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No reset session found");
  });
});
