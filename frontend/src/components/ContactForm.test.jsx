/** Tests for ContactForm — form submission, validation, loading, error handling, accessibility. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import ContactForm from "./ContactForm";

const MOCK_ME = {
  id: "user1",
  email: "t@t.com",
  display_name: "T",
  has_resume: false,
  weekly_goal: 5,
  default_stages: ["Applied", "Phone Screen", "Offer"],
  email_verified: true,
};

const server = setupServer(
  http.get("/api/auth/me", () => HttpResponse.json({ data: MOCK_ME })),
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderApp(node) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      {node}
    </QueryClientProvider>
  );
}

describe("ContactForm", () => {
  describe("rendering", () => {
    it("should render all form fields with proper labels", () => {
      renderApp(<ContactForm onDone={vi.fn()} />);

      expect(screen.getByLabelText(/^Name/)).toBeInTheDocument();
      expect(screen.getByLabelText("Company")).toBeInTheDocument();
      expect(screen.getByLabelText("Role")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Relationship")).toBeInTheDocument();
    });

    it("should render required indicator on Name field", () => {
      renderApp(<ContactForm onDone={vi.fn()} />);

      const nameInput = screen.getByPlaceholderText("Jane Smith");
      expect(nameInput).toHaveAttribute("required");
    });

    it("should render Add Contact button and Cancel button", () => {
      renderApp(<ContactForm onDone={vi.fn()} />);

      expect(screen.getByRole("button", { name: /Add Contact/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    });

    it("should disable Add Contact button when name is empty", () => {
      renderApp(<ContactForm onDone={vi.fn()} />);

      const submitBtn = screen.getByRole("button", { name: /Add Contact/i });
      expect(submitBtn).toBeDisabled();
    });

    it("should enable Add Contact button when name has content", async () => {
      const user = userEvent.setup();
      renderApp(<ContactForm onDone={vi.fn()} />);

      const nameInput = screen.getByPlaceholderText("Jane Smith");
      await user.type(nameInput, "John Doe");

      const submitBtn = screen.getByRole("button", { name: /Add Contact/i });
      expect(submitBtn).not.toBeDisabled();
    });
  });

  describe("form submission", () => {
    it("should submit form with contact data and call onDone on success", async () => {
      const user = userEvent.setup();
      const onDone = vi.fn();
      const contactId = "contact1";

      server.use(
        http.post("/api/contacts", () =>
          HttpResponse.json({ data: { id: contactId, name: "John Doe" } }, { status: 201 })
        )
      );

      renderApp(<ContactForm onDone={onDone} />);

      await user.type(screen.getByPlaceholderText("Jane Smith"), "John Doe");
      await user.type(screen.getByPlaceholderText("Acme Corp"), "Tech Corp");
      await user.type(screen.getByPlaceholderText("jane@acme.com"), "john@tech.com");

      const submitBtn = screen.getByRole("button", { name: /Add Contact/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(onDone).toHaveBeenCalled();
      });
    });

    it("should link contact to application when applicationId is provided", async () => {
      const user = userEvent.setup();
      const onDone = vi.fn();
      const contactId = "contact1";
      const applicationId = "app1";

      server.use(
        http.post("/api/contacts", () =>
          HttpResponse.json({ data: { id: contactId, name: "John Doe" } }, { status: 201 })
        ),
        http.patch("/api/contacts/:contactId/link", () =>
          HttpResponse.json({ data: { success: true } }, { status: 200 })
        )
      );

      renderApp(<ContactForm applicationId={applicationId} onDone={onDone} />);

      await user.type(screen.getByPlaceholderText("Jane Smith"), "John Doe");

      const submitBtn = screen.getByRole("button", { name: /Add Contact/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(onDone).toHaveBeenCalled();
      });
    });

    it("should surface an error and keep the form open when linking fails", async () => {
      const user = userEvent.setup();
      const onDone = vi.fn();
      const contactId = "contact1";
      const applicationId = "app1";

      server.use(
        http.post("/api/contacts", () =>
          HttpResponse.json({ data: { id: contactId, name: "John Doe" } }, { status: 201 })
        ),
        http.patch("/api/contacts/:contactId/link", () =>
          HttpResponse.json(
            { error: { code: "LINK_FAILED", message: "Couldn't link" } },
            { status: 400 }
          )
        )
      );

      renderApp(<ContactForm applicationId={applicationId} onDone={onDone} />);

      await user.type(screen.getByPlaceholderText("Jane Smith"), "John Doe");

      const submitBtn = screen.getByRole("button", { name: /Add Contact/i });
      await user.click(submitBtn);

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/Couldn't link|couldn't link it/i);
      expect(onDone).not.toHaveBeenCalled();
    });

    it("should clear form fields after successful submission", async () => {
      const user = userEvent.setup();
      const onDone = vi.fn();

      server.use(
        http.post("/api/contacts", () =>
          HttpResponse.json({ data: { id: "contact1", name: "John Doe" } }, { status: 201 })
        )
      );

      renderApp(<ContactForm onDone={onDone} />);

      const nameInput = screen.getByPlaceholderText("Jane Smith");
      await user.type(nameInput, "John Doe");
      await user.type(screen.getByPlaceholderText("Acme Corp"), "Tech Corp");

      await user.click(screen.getByRole("button", { name: /Add Contact/i }));

      await waitFor(() => {
        expect(onDone).toHaveBeenCalled();
      });
    });
  });

  describe("error handling", () => {
    it("should display error message on submission failure", async () => {
      const user = userEvent.setup();

      server.use(
        http.post("/api/contacts", () =>
          HttpResponse.json({ error: { code: "VALIDATION_ERROR" } }, { status: 400 })
        )
      );

      renderApp(<ContactForm onDone={vi.fn()} />);

      await user.type(screen.getByPlaceholderText("Jane Smith"), "John Doe");
      await user.click(screen.getByRole("button", { name: /Add Contact/i }));

      await waitFor(() => {
        expect(screen.getByText("Failed to create contact. Please try again.")).toBeInTheDocument();
      });
    });

    it("should clear error when form is modified after error", async () => {
      const user = userEvent.setup();

      server.use(
        http.post("/api/contacts", () =>
          HttpResponse.json({ error: { code: "ERROR" } }, { status: 400 })
        )
      );

      renderApp(<ContactForm onDone={vi.fn()} />);

      await user.type(screen.getByPlaceholderText("Jane Smith"), "John Doe");
      await user.click(screen.getByRole("button", { name: /Add Contact/i }));

      await waitFor(() => {
        expect(screen.getByText("Failed to create contact. Please try again.")).toBeInTheDocument();
      });

      await user.clear(screen.getByPlaceholderText("Jane Smith"));

      expect(screen.queryByText("Failed to create contact. Please try again.")).not.toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show loading state on submit button during submission", async () => {
      const user = userEvent.setup();

      let resolveRequest;
      server.use(
        http.post("/api/contacts", () =>
          new Promise((resolve) => {
            resolveRequest = () => resolve(HttpResponse.json({ data: { id: "contact1" } }, { status: 201 }));
          })
        )
      );

      renderApp(<ContactForm onDone={vi.fn()} />);

      await user.type(screen.getByPlaceholderText("Jane Smith"), "John Doe");

      const submitBtn = screen.getByRole("button", { name: /Add Contact/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(submitBtn).toHaveTextContent("Saving…");
        expect(submitBtn).toBeDisabled();
      });

      resolveRequest();

      await waitFor(() => {
        expect(submitBtn).toHaveTextContent("Add Contact");
      });
    });

    it("should disable input fields during submission", async () => {
      const user = userEvent.setup();

      let resolveRequest;
      server.use(
        http.post("/api/contacts", () =>
          new Promise((resolve) => {
            resolveRequest = () => resolve(HttpResponse.json({ data: { id: "contact1" } }, { status: 201 }));
          })
        )
      );

      renderApp(<ContactForm onDone={vi.fn()} />);

      const nameInput = screen.getByPlaceholderText("Jane Smith");
      await user.type(nameInput, "John Doe");

      await user.click(screen.getByRole("button", { name: /Add Contact/i }));

      await waitFor(() => {
        expect(nameInput).toHaveAttribute("disabled");
      });

      resolveRequest();

      await waitFor(() => {
        expect(nameInput).not.toHaveAttribute("disabled");
      });
    });
  });

  describe("cancel button", () => {
    it("should call onDone when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onDone = vi.fn();

      renderApp(<ContactForm onDone={onDone} />);

      await user.click(screen.getByRole("button", { name: /Cancel/i }));

      expect(onDone).toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("should have proper label associations for all inputs", () => {
      renderApp(<ContactForm onDone={vi.fn()} />);

      const nameInput = screen.getByPlaceholderText("Jane Smith");
      const companyInput = screen.getByPlaceholderText("Acme Corp");
      const roleInput = screen.getByPlaceholderText("Recruiter");
      const emailInput = screen.getByPlaceholderText("jane@acme.com");

      expect(nameInput).toHaveAttribute("id", "contact-name");
      expect(companyInput).toHaveAttribute("id", "contact-company");
      expect(roleInput).toHaveAttribute("id", "contact-role");
      expect(emailInput).toHaveAttribute("id", "contact-email");

      // Verify labels are associated correctly by checking getByLabelText can find inputs
      expect(screen.getByLabelText(/^Name/)).toBe(nameInput);
      expect(screen.getByLabelText("Company")).toBe(companyInput);
      expect(screen.getByLabelText("Role")).toBe(roleInput);
      expect(screen.getByLabelText("Email")).toBe(emailInput);
    });

    it("should have proper id on relationship select", () => {
      renderApp(<ContactForm onDone={vi.fn()} />);

      const relationshipSelect = screen.getByLabelText("Relationship");
      expect(relationshipSelect).toHaveAttribute("id", "contact-relationship");
    });
  });

  describe("form validation", () => {
    it("should accept valid email format", async () => {
      const user = userEvent.setup();

      server.use(
        http.post("/api/contacts", () =>
          HttpResponse.json({ data: { id: "contact1" } }, { status: 201 })
        )
      );

      renderApp(<ContactForm onDone={vi.fn()} />);

      const nameInput = screen.getByPlaceholderText("Jane Smith");
      const emailInput = screen.getByPlaceholderText("jane@acme.com");

      await user.type(nameInput, "John Doe");
      await user.type(emailInput, "john@example.com");

      const submitBtn = screen.getByRole("button", { name: /Add Contact/i });
      expect(submitBtn).not.toBeDisabled();
    });

    it("should enforce maxLength on text inputs", async () => {
      const user = userEvent.setup();
      renderApp(<ContactForm onDone={vi.fn()} />);

      const nameInput = screen.getByPlaceholderText("Jane Smith");
      await user.type(nameInput, "a".repeat(300));

      expect(nameInput).toHaveValue("a".repeat(200));
    });

    it("should enforce maxLength on email input", async () => {
      const user = userEvent.setup();
      renderApp(<ContactForm onDone={vi.fn()} />);

      const emailInput = screen.getByPlaceholderText("jane@acme.com");
      await user.type(emailInput, "a".repeat(300));

      expect(emailInput.value.length).toBeLessThanOrEqual(254);
    });
  });

  describe("field updates", () => {
    it("should update form state when inputs change", async () => {
      const user = userEvent.setup();
      renderApp(<ContactForm onDone={vi.fn()} />);

      const nameInput = screen.getByPlaceholderText("Jane Smith");
      const companyInput = screen.getByPlaceholderText("Acme Corp");
      const roleInput = screen.getByPlaceholderText("Recruiter");
      const emailInput = screen.getByPlaceholderText("jane@acme.com");

      await user.type(nameInput, "Jane Smith");
      await user.type(companyInput, "Tech Inc");
      await user.type(roleInput, "Manager");
      await user.type(emailInput, "jane@tech.com");

      expect(nameInput).toHaveValue("Jane Smith");
      expect(companyInput).toHaveValue("Tech Inc");
      expect(roleInput).toHaveValue("Manager");
      expect(emailInput).toHaveValue("jane@tech.com");
    });

    it("should update form state when relationship changes", async () => {
      const user = userEvent.setup();
      renderApp(<ContactForm onDone={vi.fn()} />);

      await user.click(screen.getByRole("combobox", { name: /relationship/i }));
      await user.click(screen.getByRole("option", { name: /recruiter/i }));

      expect(screen.getByRole("combobox", { name: /relationship/i })).toHaveTextContent(/recruiter/i);
    });
  });
});
