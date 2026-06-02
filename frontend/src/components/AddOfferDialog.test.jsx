import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AddOfferDialog } from "./AddOfferDialog";

vi.mock("../hooks/useApplications", () => ({
  useApplications: vi.fn(),
  useCreateApplication: vi.fn(),
  useUpdateApplication: vi.fn(),
}));

import {
  useApplications,
  useCreateApplication,
  useUpdateApplication,
} from "../hooks/useApplications";

const makeApp = (overrides = {}) => ({
  id: "a1",
  company: "Stripe",
  role_title: "Backend Engineer",
  current_stage: "Interview",
  ...overrides,
});

function setupMocks({ apps = [], create, update } = {}) {
  const createMutateAsync = create ?? vi.fn().mockResolvedValue({ id: "new1" });
  const updateMutateAsync = update ?? vi.fn().mockResolvedValue({});
  useApplications.mockReturnValue({ data: { data: apps } });
  useCreateApplication.mockReturnValue({ mutateAsync: createMutateAsync, isPending: false });
  useUpdateApplication.mockReturnValue({ mutateAsync: updateMutateAsync, isPending: false });
  return { createMutateAsync, updateMutateAsync };
}

describe("AddOfferDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders both Existing and New tabs", () => {
    setupMocks();
    render(<AddOfferDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByRole("tab", { name: "Existing" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "New" })).toBeInTheDocument();
  });

  it("filters out apps already in Offer or Rejected stage", () => {
    setupMocks({
      apps: [
        makeApp({ id: "a1", company: "Stripe", current_stage: "Interview" }),
        makeApp({ id: "a2", company: "OpenAI", current_stage: "Offer" }),
        makeApp({ id: "a3", company: "Datadog", current_stage: "Rejected" }),
      ],
    });
    render(<AddOfferDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Stripe")).toBeInTheDocument();
    expect(screen.queryByText("OpenAI")).not.toBeInTheDocument();
    expect(screen.queryByText("Datadog")).not.toBeInTheDocument();
  });

  it("promotes an existing app to Offer and closes the dialog", async () => {
    const onOpenChange = vi.fn();
    const { updateMutateAsync } = setupMocks({
      apps: [makeApp({ id: "a1", company: "Stripe" })],
    });
    render(<AddOfferDialog open={true} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByText("Stripe"));

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: "a1",
        body: { current_stage: "Offer" },
      });
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("filters candidate list by search query", () => {
    setupMocks({
      apps: [
        makeApp({ id: "a1", company: "Stripe", role_title: "Backend" }),
        makeApp({ id: "a2", company: "Datadog", role_title: "SRE" }),
      ],
    });
    render(<AddOfferDialog open={true} onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("searchbox", { name: /search applications/i }), {
      target: { value: "stripe" },
    });
    expect(screen.getByText("Stripe")).toBeInTheDocument();
    expect(screen.queryByText("Datadog")).not.toBeInTheDocument();
  });

  it("shows empty state when no candidates exist", () => {
    setupMocks({ apps: [] });
    render(<AddOfferDialog open={true} onOpenChange={vi.fn()} />);
    expect(
      screen.getByText(/no other applications yet/i)
    ).toBeInTheDocument();
  });

  it("rejects new-offer submission with missing company or role", async () => {
    const user = userEvent.setup();
    const { createMutateAsync } = setupMocks();
    render(<AddOfferDialog open={true} onOpenChange={vi.fn()} />);
    await user.click(screen.getByRole("tab", { name: "New" }));

    await user.click(await screen.findByRole("button", { name: /add offer/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/required/i);
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it("creates new offer with base salary + signing bonus and PATCHes offer_details", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { createMutateAsync, updateMutateAsync } = setupMocks();
    render(<AddOfferDialog open={true} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("tab", { name: "New" }));

    await user.type(await screen.findByLabelText(/company \*/i), "Anthropic");
    await user.type(screen.getByLabelText(/role \*/i), "MTS");
    await user.type(screen.getByLabelText(/base salary/i), "220000");
    await user.type(screen.getByLabelText(/signing bonus/i), "25000");
    await user.click(screen.getByRole("button", { name: /add offer/i }));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith({
        company: "Anthropic",
        role_title: "MTS",
        source: "manual",
        current_stage: "Offer",
      });
    });
    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: "new1",
        body: { offer_details: { base_salary: 220000, signing_bonus: 25000 } },
      });
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("creates new offer without comp fields and skips the PATCH", async () => {
    const user = userEvent.setup();
    const { createMutateAsync, updateMutateAsync } = setupMocks();
    render(<AddOfferDialog open={true} onOpenChange={vi.fn()} />);
    await user.click(screen.getByRole("tab", { name: "New" }));

    await user.type(await screen.findByLabelText(/company \*/i), "Acme");
    await user.type(screen.getByLabelText(/role \*/i), "SWE");
    await user.click(screen.getByRole("button", { name: /add offer/i }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).not.toHaveBeenCalled();
  });
});
