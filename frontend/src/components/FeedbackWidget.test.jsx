/** Tests for FeedbackWidget: renders button, opens popover, submits, and closes. */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

import { AuthContext } from "../context/AuthContext";
import FeedbackWidget from "./FeedbackWidget";
import { withTooltipProvider } from "../test/testProviders";

const server = setupServer(
  http.post("/api/feedback", () =>
    HttpResponse.json({ data: { id: "fb1", message: "Thank you for your feedback!" } }, { status: 201 })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper(user = { id: "u1", email: "test@example.com", email_verified: true }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const authValue = { user, isInitialized: true, login: vi.fn(), logout: vi.fn(), updateUser: vi.fn() };
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <AuthContext.Provider value={authValue}>
            {withTooltipProvider(children)}
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("FeedbackWidget", () => {
  it("should render the feedback button for authenticated users", () => {
    render(<FeedbackWidget />, { wrapper: makeWrapper() });

    expect(screen.getByRole("button", { name: /send feedback/i })).toBeInTheDocument();
  });

  it("should not render when user is null", () => {
    render(<FeedbackWidget />, { wrapper: makeWrapper(null) });

    expect(screen.queryByRole("button", { name: /send feedback/i })).not.toBeInTheDocument();
  });

  it("should open popover when button is clicked", async () => {
    render(<FeedbackWidget />, { wrapper: makeWrapper() });

    fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));

    expect(screen.getByRole("dialog", { name: /send feedback/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it("should close popover when X button is clicked", async () => {
    render(<FeedbackWidget />, { wrapper: makeWrapper() });

    fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should submit feedback and close popover on success", async () => {
    render(<FeedbackWidget />, { wrapper: makeWrapper() });

    fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));
    await userEvent.type(screen.getByLabelText(/message/i), "This is great feedback!");
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
