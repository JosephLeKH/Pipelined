import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
    </select>
  ),
}));

import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";

const mockMutateAsync = vi.fn();

describe("SettingsProfileSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { display_name: "Alice", email: "alice@example.com" } });
    useUpdateUser.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });
  });

  it("should render Profile heading", () => {
    render(<SettingsProfileSection />);

    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("should display initials avatar when user has no avatar_url", () => {
    render(<SettingsProfileSection />);

    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("should display img avatar when user has avatar_url", () => {
    useAuth.mockReturnValue({
      user: { display_name: "Alice", email: "alice@example.com", avatar_url: "https://example.com/avatar.png" },
    });

    render(<SettingsProfileSection />);

    const img = screen.getByRole("img", { name: "Alice" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  it("should show success banner after saving profile", async () => {
    mockMutateAsync.mockResolvedValue({});

    render(<SettingsProfileSection />);
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await screen.findByText("Profile saved.");

    expect(screen.getByRole("alert")).toHaveTextContent("Profile saved.");
  });

  it("should show error message when save fails", async () => {
    mockMutateAsync.mockRejectedValue({ message: "Server error" });

    render(<SettingsProfileSection />);
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await screen.findByText("Server error");

    expect(screen.getByRole("alert")).toHaveTextContent("Server error");
  });

  it("should disable Save profile button while save is pending", () => {
    useUpdateUser.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: true });

    render(<SettingsProfileSection />);

    expect(screen.getByRole("button", { name: /save profile/i })).toBeDisabled();
  });
});
