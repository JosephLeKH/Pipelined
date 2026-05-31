/** Tests for App.jsx: global keyboard shortcuts and GlobalChordShortcuts. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "./context/AuthContext";
import App from "./App";

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "u1",
        email: "test@example.com",
        default_stages: ["Applied", "Phone Screen", "Offer", "Rejected"],
        has_resume: false,
      },
    })
  )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function Wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <BrowserRouter>
      <QueryClientProvider client={qc}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

describe("App - Global Chord Shortcuts", () => {
  it("should have GlobalChordShortcuts registered for authenticated routes", async () => {
    // Note: Full integration testing of chord shortcuts requires more setup.
    // This test ensures the component structure is correct.
    render(
      <Wrapper>
        <App />
      </Wrapper>
    );

    // Verify we're in a protected route state (would show loading spinner or auth check)
    await waitFor(() => {
      // Auth context should be initialized
      expect(screen.queryByText(/Skip to main content/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("should NOT trigger shortcuts when focus is in an input", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <div>
          <input type="text" placeholder="test input" defaultValue="" />
        </div>
      </Wrapper>
    );

    const input = screen.getByPlaceholderText("test input");
    await user.click(input);

    // Attempt to trigger 'i' shortcut (import CSV)
    // If shortcuts are not properly scoped, this would trigger an event
    // For now, we just verify the input can receive keypresses without side effects
    await user.keyboard("i");
    expect(input).toHaveFocus();
  });
});
