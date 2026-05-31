/** Tests for error toast feedback in ApplicationPrepSection. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { toast } from "sonner";

import { ApplicationPrepSection } from "./DetailPanelSections";

vi.mock("sonner");

const server = setupServer(
  http.patch("/api/applications/:id", () => HttpResponse.error())
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers() && vi.clearAllMocks());
afterAll(() => server.close());

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const CHECKLIST = [
  { id: "item1", text: "Research company", checked: false },
];

describe("ApplicationPrepSection – checklist error toasts", () => {
  it("should show toast.error on toggle failure", async () => {
    const user = userEvent.setup();
    render(
      <ApplicationPrepSection applicationId="app1" initialChecklist={CHECKLIST} />,
      { wrapper }
    );

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn't update checklist");
    });
  });

  it("should show toast.error on add failure", async () => {
    const user = userEvent.setup();
    render(
      <ApplicationPrepSection applicationId="app1" initialChecklist={CHECKLIST} />,
      { wrapper }
    );

    const addInput = screen.getByPlaceholderText(/add item/i);
    await user.type(addInput, "New task");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn't add item");
    });
  });

  it("should show toast.error on delete failure", async () => {
    const user = userEvent.setup();
    render(
      <ApplicationPrepSection applicationId="app1" initialChecklist={CHECKLIST} />,
      { wrapper }
    );

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Couldn't delete item");
    });
  });
});
