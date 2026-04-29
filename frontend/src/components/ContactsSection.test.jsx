import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ContactsSection from "./ContactsSection";

vi.mock("../hooks/useContacts", () => ({
  useApplicationContacts: vi.fn(),
}));

vi.mock("./ContactCard", () => ({
  default: ({ contact }) => <div data-testid="contact-card">{contact.name}</div>,
}));

vi.mock("./ContactLinkDropdown", () => ({
  default: () => <div data-testid="contact-link-dropdown" />,
}));

vi.mock("./ContactForm", () => ({
  default: () => <div data-testid="contact-form" />,
}));

import { useApplicationContacts } from "../hooks/useContacts";

const mockRefetch = vi.fn();

describe("ContactsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useApplicationContacts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it("should show loading state while contacts are fetching", () => {
    useApplicationContacts.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ContactsSection applicationId="app-1" />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("should show error state with retry when contacts fetch fails", () => {
    useApplicationContacts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    render(<ContactsSection applicationId="app-1" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load contacts.");
    expect(screen.getByRole("button", { name: /retry loading contacts/i })).toBeInTheDocument();
  });

  it("should call refetch when retry is clicked", () => {
    useApplicationContacts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    render(<ContactsSection applicationId="app-1" />);

    fireEvent.click(screen.getByRole("button", { name: /retry loading contacts/i }));

    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it("should show empty state when no contacts", () => {
    render(<ContactsSection applicationId="app-1" />);

    expect(screen.getByText("No contacts yet.")).toBeInTheDocument();
  });

  it("should render a ContactCard for each contact", () => {
    useApplicationContacts.mockReturnValue({
      data: [
        { id: "c1", name: "Alice" },
        { id: "c2", name: "Bob" },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ContactsSection applicationId="app-1" />);

    expect(screen.getAllByTestId("contact-card")).toHaveLength(2);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("should toggle to link mode when Link button is clicked", () => {
    render(<ContactsSection applicationId="app-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Link" }));

    expect(screen.getByTestId("contact-link-dropdown")).toBeInTheDocument();
  });

  it("should toggle to new mode when New button is clicked", () => {
    render(<ContactsSection applicationId="app-1" />);

    fireEvent.click(screen.getByRole("button", { name: /add contact/i }));

    expect(screen.getByTestId("contact-form")).toBeInTheDocument();
  });
});
