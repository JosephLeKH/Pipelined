/** Tests for ManualAddForm — modal rendering, form submission, duplicate error, close behaviors. */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { toast } from "sonner";

import { AuthProvider } from "../context/AuthContext";
import ManualAddForm from "./ManualAddForm";
import { MANUAL_ADD_FORM_WIDTH_PX } from "../lib/constants";
import { passthroughHandlers } from "../test/passthroughHandlers";

const CREATED_APP = {
  id: "new-app-123",
  company: "Acme Corp",
  role_title: "Software Engineer",
  current_stage: "Applied",
  date_applied: "2026-03-26T00:00:00Z",
  source: "manual",
};

const server = setupServer(
  http.post("/api/applications", () =>
    HttpResponse.json({ data: CREATED_APP }, { status: 201 })
  ),
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "u1",
        email: "test@example.com",
        display_name: "Test User",
        default_stages: ["Applied", "Phone Screen", "Onsite", "Offer", "Rejected"],
      },
    })
  ),
  ...passthroughHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ManualAddForm", () => {
  it("should render form fields when isOpen is true", () => {
    // Arrange / Act
    render(<ManualAddForm isOpen onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert
    expect(screen.getByRole("textbox", { name: /role title/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /company/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /source/i })).toBeInTheDocument();
  });

  it("should default date_applied input to today", () => {
    // Arrange / Act
    render(<ManualAddForm isOpen onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert — must be the user's local date, not UTC.
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const dateInput = screen.getByLabelText(/date applied/i);
    expect(dateInput).toHaveValue(today);
  });

  it("should show validation error when role_title is empty on submit", async () => {
    // Arrange
    render(<ManualAddForm isOpen onClose={() => {}} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.type(screen.getByRole("textbox", { name: /company/i }), "Acme Corp");
    await userEvent.click(screen.getByRole("button", { name: /add application/i }));

    // Assert
    expect(screen.getByText(/role title is required/i)).toBeInTheDocument();
  });

  it("should show validation error when company is empty on submit", async () => {
    // Arrange
    render(<ManualAddForm isOpen onClose={() => {}} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.type(screen.getByRole("textbox", { name: /role title/i }), "Software Engineer");
    await userEvent.click(screen.getByRole("button", { name: /add application/i }));

    // Assert
    expect(screen.getByText(/company is required/i)).toBeInTheDocument();
  });

  it("should submit with source=manual and correct fields", async () => {
    // Arrange
    let requestBody = null;
    server.use(
      http.post("/api/applications", async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ data: CREATED_APP }, { status: 201 });
      })
    );
    render(<ManualAddForm isOpen onClose={() => {}} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.type(screen.getByRole("textbox", { name: /role title/i }), "Software Engineer");
    await userEvent.type(screen.getByRole("textbox", { name: /company/i }), "Acme Corp");
    await userEvent.click(screen.getByRole("button", { name: /add application/i }));

    // Assert
    await waitFor(() => expect(requestBody).not.toBeNull());
    expect(requestBody.source).toBe("manual");
    expect(requestBody.role_title).toBe("Software Engineer");
    expect(requestBody.company).toBe("Acme Corp");
  });

  it("should call onClose after successful submission", async () => {
    // Arrange
    const onClose = vi.fn();
    render(<ManualAddForm isOpen onClose={onClose} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.type(screen.getByRole("textbox", { name: /role title/i }), "Software Engineer");
    await userEvent.type(screen.getByRole("textbox", { name: /company/i }), "Acme Corp");
    await userEvent.click(screen.getByRole("button", { name: /add application/i }));

    // Assert
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("should show duplicate error and link when 409 DUPLICATE_APPLICATION returned", async () => {
    // Arrange
    server.use(
      http.post("/api/applications", () =>
        HttpResponse.json(
          {
            error: {
              code: "DUPLICATE_APPLICATION",
              message: "An application for this role and company already exists.",
              details: { existing_id: "existing-abc-123" },
            },
          },
          { status: 409 }
        )
      )
    );
    render(<ManualAddForm isOpen onClose={() => {}} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.type(screen.getByRole("textbox", { name: /role title/i }), "Software Engineer");
    await userEvent.type(screen.getByRole("textbox", { name: /company/i }), "Acme Corp");
    await userEvent.click(screen.getByRole("button", { name: /add application/i }));

    // Assert
    await screen.findByText(/already exists/i);
    expect(screen.getByRole("link", { name: /view existing/i })).toBeInTheDocument();
  });

  it("should call onClose when Cancel is clicked", async () => {
    // Arrange
    const onClose = vi.fn();
    render(<ManualAddForm isOpen onClose={onClose} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Assert
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should call onClose when clicking the overlay", async () => {
    // Arrange
    const onClose = vi.fn();
    render(<ManualAddForm isOpen onClose={onClose} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.click(document.querySelector('[data-slot="dialog-overlay"]'));

    // Assert
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("should disable submit button while mutation is pending", async () => {
    // Arrange — slow response so mutation stays in-flight
    server.use(http.post("/api/applications", () => new Promise(() => {})));
    render(<ManualAddForm isOpen onClose={() => {}} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.type(screen.getByRole("textbox", { name: /role title/i }), "Software Engineer");
    await userEvent.type(screen.getByRole("textbox", { name: /company/i }), "Acme Corp");
    await userEvent.click(screen.getByRole("button", { name: /add application/i }));

    // Assert — button becomes disabled with "Creating…" text
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });
  });

  it("should show generic error message inside form on non-duplicate mutation failure", async () => {
    // Arrange
    server.use(
      http.post("/api/applications", () =>
        HttpResponse.json(
          { error: { code: "SERVER_ERROR", message: "Internal server error" } },
          { status: 500 }
        )
      )
    );
    render(<ManualAddForm isOpen onClose={() => {}} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.type(screen.getByRole("textbox", { name: /role title/i }), "Software Engineer");
    await userEvent.type(screen.getByRole("textbox", { name: /company/i }), "Acme Corp");
    await userEvent.click(screen.getByRole("button", { name: /add application/i }));

    // Assert
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(/internal server error/i);
  });

  it("should submit with cmd+enter keyboard shortcut", async () => {
    // Arrange
    let requestBody = null;
    server.use(
      http.post("/api/applications", async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ data: CREATED_APP }, { status: 201 });
      })
    );
    render(<ManualAddForm isOpen onClose={() => {}} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.type(screen.getByRole("textbox", { name: /role title/i }), "Software Engineer");
    await userEvent.type(screen.getByRole("textbox", { name: /company/i }), "Acme Corp");
    fireEvent.keyDown(document.getElementById("manual-add-form"), { key: "Enter", metaKey: true });

    // Assert
    await waitFor(() => expect(requestBody).not.toBeNull());
    expect(requestBody.role_title).toBe("Software Engineer");
    expect(requestBody.company).toBe("Acme Corp");
  });

  it("should not submit twice on rapid cmd+enter presses during pending mutation", async () => {
    // Arrange — mutation stays pending
    let callCount = 0;
    server.use(
      http.post("/api/applications", async () => {
        callCount += 1;
        await new Promise(() => {}); // never resolves
        return HttpResponse.json({ data: CREATED_APP }, { status: 201 });
      })
    );
    render(<ManualAddForm isOpen onClose={() => {}} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.type(screen.getByRole("textbox", { name: /role title/i }), "Software Engineer");
    await userEvent.type(screen.getByRole("textbox", { name: /company/i }), "Acme Corp");
    const form = document.getElementById("manual-add-form");
    fireEvent.keyDown(form, { key: "Enter", metaKey: true });
    fireEvent.keyDown(form, { key: "Enter", metaKey: true });

    // Assert — should only call once even after two keydowns
    await waitFor(() => expect(callCount).toBe(1));
  });

  it("should render at the configured modal max-width", () => {
    render(<ManualAddForm isOpen onClose={() => {}} />, { wrapper: makeWrapper() });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveStyle({ maxWidth: `${MANUAL_ADD_FORM_WIDTH_PX}px` });
  });

  it("should move focus into the dialog when modal opens", async () => {
    // Arrange / Act
    render(<ManualAddForm isOpen onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert — Radix traps focus inside the open dialog
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toContainElement(document.activeElement);
    });
  });

  it("should trap focus: Tab from last focusable element wraps to first", () => {
    // Arrange
    render(<ManualAddForm isOpen onClose={() => {}} />, { wrapper: makeWrapper() });

    const dialog = screen.getByRole("dialog");
    const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
    const focusableEls = Array.from(dialog.querySelectorAll(FOCUSABLE));
    const lastEl = focusableEls[focusableEls.length - 1];

    // Act — focus last element and fire Tab on the inner card (which has onKeyDown)
    lastEl.focus();
    fireEvent.keyDown(dialog.firstElementChild, { key: "Tab", shiftKey: false });

    // Assert — focus wrapped to first element
    expect(document.activeElement).toBe(focusableEls[0]);
  });

  it("should send notes in the initial create POST so they cannot be lost by a failed follow-up", async () => {
    // Arrange — capture the create body; assert no PATCH is issued.
    let createBody = null;
    let patchCalled = false;
    server.use(
      http.post("/api/applications", async ({ request }) => {
        createBody = await request.json();
        return HttpResponse.json({ data: CREATED_APP }, { status: 201 });
      }),
      http.patch("/api/applications/new-app-123", () => {
        patchCalled = true;
        return HttpResponse.json({ data: CREATED_APP });
      })
    );
    render(<ManualAddForm isOpen onClose={() => {}} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.type(screen.getByRole("textbox", { name: /role title/i }), "Software Engineer");
    await userEvent.type(screen.getByRole("textbox", { name: /company/i }), "Acme Corp");
    const notesButton = screen.getByRole("button", { name: /notes/i });
    await userEvent.click(notesButton);
    const notesInput = await screen.findByPlaceholderText(/optional notes/i);
    await userEvent.type(notesInput, "Great opportunity");
    await userEvent.click(screen.getByRole("button", { name: /add application/i }));

    // Assert
    await waitFor(() => expect(createBody).not.toBeNull());
    expect(createBody.notes).toBe("Great opportunity");
    expect(patchCalled).toBe(false);
  });
});
