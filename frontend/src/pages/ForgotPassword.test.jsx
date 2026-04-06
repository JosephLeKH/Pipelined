/** Tests for ForgotPassword page: form rendering, validation, submit, success state. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import ForgotPassword from "./ForgotPassword";

const server = setupServer(
  http.post("/api/auth/forgot-password", () =>
    HttpResponse.json({ data: { message: "If that email is registered, a reset link has been sent." } })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <Routes>
            <Route path="/forgot-password" element={children} />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("ForgotPassword", () => {
  it("should render email field and submit button", () => {
    render(<ForgotPassword />, { wrapper: makeWrapper() });

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeInTheDocument();
  });

  it("should render back to sign in link", () => {
    render(<ForgotPassword />, { wrapper: makeWrapper() });

    expect(screen.getByRole("link", { name: "Back to sign in" })).toBeInTheDocument();
  });

  it("should show error when email is empty on submit", async () => {
    render(<ForgotPassword />, { wrapper: makeWrapper() });

    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email is required.");
  });

  it("should show success message after submitting a valid email", async () => {
    render(<ForgotPassword />, { wrapper: makeWrapper() });

    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("reset link has been sent");
    });
  });

  it("should show error on server failure", async () => {
    server.use(
      http.post("/api/auth/forgot-password", () =>
        HttpResponse.json({ error: { code: "SERVER_ERROR", message: "Server error" } }, { status: 500 })
      )
    );

    render(<ForgotPassword />, { wrapper: makeWrapper() });

    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  });
});
