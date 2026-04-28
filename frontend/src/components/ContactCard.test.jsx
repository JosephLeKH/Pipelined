import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ContactCard from "./ContactCard";

vi.mock("../hooks/useContacts", () => ({
  usePingContact: vi.fn(),
  useUnlinkContact: vi.fn(),
}));

vi.mock("../lib/dateUtils", () => ({
  isStaleContact: vi.fn(),
}));

import { usePingContact, useUnlinkContact } from "../hooks/useContacts";
import { isStaleContact } from "../lib/dateUtils";

const mockPing = vi.fn();
const mockUnlink = vi.fn();

const CONTACT = {
  id: "c1",
  name: "Alice Smith",
  role: "Engineer",
  company: "Acme Corp",
  relationship: "recruiter",
  last_contacted_at: new Date(Date.now() - 86_400_000).toISOString(),
};

describe("ContactCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePingContact.mockReturnValue({ mutate: mockPing, isPending: false });
    useUnlinkContact.mockReturnValue({ mutate: mockUnlink, isPending: false });
    isStaleContact.mockReturnValue(false);
  });

  it("should render contact name, role, and company", () => {
    render(<ContactCard contact={CONTACT} applicationId="app1" />);

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Engineer · Acme Corp")).toBeInTheDocument();
  });

  it("should render relationship badge with correct label", () => {
    render(<ContactCard contact={CONTACT} applicationId="app1" />);

    expect(screen.getByText("recruiter")).toBeInTheDocument();
  });

  it("should show stale dot when contact has not been contacted in 14+ days", () => {
    isStaleContact.mockReturnValue(true);

    render(<ContactCard contact={CONTACT} applicationId="app1" />);

    expect(screen.getByRole("img", { name: /stale contact/i })).toBeInTheDocument();
  });

  it("should not show stale dot when contact is recent", () => {
    isStaleContact.mockReturnValue(false);

    render(<ContactCard contact={CONTACT} applicationId="app1" />);

    expect(screen.queryByRole("img", { name: /stale contact/i })).not.toBeInTheDocument();
  });

  it("should call ping mutation when Mark as pinged is clicked", () => {
    render(<ContactCard contact={CONTACT} applicationId="app1" />);

    fireEvent.click(screen.getByRole("button", { name: /mark as pinged/i }));

    expect(mockPing).toHaveBeenCalledWith({ contactId: "c1" });
  });

  it("should call unlink mutation when Unlink contact is clicked", () => {
    render(<ContactCard contact={CONTACT} applicationId="app1" />);

    fireEvent.click(screen.getByRole("button", { name: /unlink contact/i }));

    expect(mockUnlink).toHaveBeenCalledWith({ contactId: "c1", applicationId: "app1" });
  });

  it("should not render unlink button when applicationId is not provided", () => {
    render(<ContactCard contact={CONTACT} />);

    expect(screen.queryByRole("button", { name: /unlink contact/i })).not.toBeInTheDocument();
  });
});
