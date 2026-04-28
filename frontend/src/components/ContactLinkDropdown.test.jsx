import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ContactLinkDropdown from "./ContactLinkDropdown";

vi.mock("../hooks/useContacts", () => ({
  useContacts: vi.fn(),
  useLinkContact: vi.fn(),
}));

import { useContacts, useLinkContact } from "../hooks/useContacts";

const MOCK_CONTACTS = [
  { id: "c1", name: "Alice Smith", role: "Engineer", company: "Acme" },
  { id: "c2", name: "Bob Jones", role: "PM", company: "Beta" },
];

const mockRefetch = vi.fn();
const mockLink = vi.fn();

function renderDropdown(props = {}) {
  return render(
    <ContactLinkDropdown
      applicationId="app1"
      linkedIds={[]}
      onDone={vi.fn()}
      {...props}
    />
  );
}

describe("ContactLinkDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLinkContact.mockReturnValue({ mutate: mockLink, isPending: false });
  });

  it("should show loading indicator while contacts are fetching", () => {
    useContacts.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: mockRefetch });

    renderDropdown();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("should show error state when contacts fetch fails", () => {
    useContacts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    renderDropdown();

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load contacts.");
    expect(screen.getByRole("button", { name: /retry loading contacts/i })).toBeInTheDocument();
  });

  it("should call refetch when retry is clicked", () => {
    useContacts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    renderDropdown();

    fireEvent.click(screen.getByRole("button", { name: /retry loading contacts/i }));

    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it("should filter and render matching contacts", () => {
    useContacts.mockReturnValue({ data: MOCK_CONTACTS, isLoading: false, error: null, refetch: mockRefetch });

    renderDropdown();

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("should show No contacts found when list is empty", () => {
    useContacts.mockReturnValue({ data: [], isLoading: false, error: null, refetch: mockRefetch });

    renderDropdown();

    expect(screen.getByText("No contacts found.")).toBeInTheDocument();
  });

  it("should call linkContact when a contact Link button is clicked", () => {
    useContacts.mockReturnValue({ data: MOCK_CONTACTS, isLoading: false, error: null, refetch: mockRefetch });

    renderDropdown();

    fireEvent.click(screen.getAllByText("Link")[0]);

    expect(mockLink).toHaveBeenCalledWith(
      { contactId: "c1", applicationId: "app1" },
      expect.any(Object)
    );
  });
});
