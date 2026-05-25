import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsProfileSection from "./SettingsProfileSection";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useUpdateUser: vi.fn(),
}));

vi.mock("./TimezoneSelector", () => ({
  default: ({ value, onChange }) => (
    <select aria-label="Timezone" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="America/New_York">America/New_York</option>
      <option value="America/Los_Angeles">America/Los_Angeles</option>
    </select>
  ),
}));

import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";

const mockMutateAsync = vi.fn();

describe("SettingsProfileSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: { display_name: "Alice", email: "alice@example.com", timezone: "America/New_York" },
    });
    useUpdateUser.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });
  });

  it("should render Profile heading", () => {
    render(<SettingsProfileSection />);

    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
  });

  it("should display initials avatar when user has no avatar_url", () => {
    render(<SettingsProfileSection />);

    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("should display img avatar when user has avatar_url", () => {
    useAuth.mockReturnValue({
      user: {
        display_name: "Alice",
        email: "alice@example.com",
        avatar_url: "https://example.com/avatar.png",
        timezone: "America/New_York",
      },
    });

    render(<SettingsProfileSection />);

    const img = screen.getByRole("img", { name: "Alice" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  it("should hide save footer until form is dirty", () => {
    render(<SettingsProfileSection />);

    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("should show save footer when display name changes", () => {
    render(<SettingsProfileSection />);

    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Bob" } });

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("should show Saved microcopy after saving profile", async () => {
    mockMutateAsync.mockResolvedValue({});

    render(<SettingsProfileSection />);
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Bob" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("should show error message when save fails", async () => {
    mockMutateAsync.mockRejectedValue({ message: "Server error" });

    render(<SettingsProfileSection />);
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Bob" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("Server error");

    expect(screen.getByRole("alert")).toHaveTextContent("Server error");
  });

  it("should disable Save button while save is pending", () => {
    useUpdateUser.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: true });

    render(<SettingsProfileSection />);
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Bob" } });

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("should reset fields when Cancel is clicked", () => {
    render(<SettingsProfileSection />);

    const input = screen.getByLabelText("Display name");
    fireEvent.change(input, { target: { value: "Bob" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(input).toHaveValue("Alice");
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
});
