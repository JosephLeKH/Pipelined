import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SettingsWatchlistSection from "./SettingsWatchlistSection";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useUpdateUser: vi.fn(),
}));

import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";

const mockMutateAsync = vi.fn();

describe("SettingsWatchlistSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUpdateUser.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });
    useAuth.mockReturnValue({
      user: {
        watchlist_companies: [{ name: "Acme", careers_url: "https://example.com/careers" }],
      },
    });
  });

  it("should render existing watchlist companies", () => {
    render(<SettingsWatchlistSection />);

    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/careers")).toBeInTheDocument();
  });

  it("should add a company and save watchlist", async () => {
    useAuth.mockReturnValue({ user: { watchlist_companies: [] } });
    mockMutateAsync.mockResolvedValue({});
    render(<SettingsWatchlistSection />);

    await userEvent.type(screen.getByLabelText(/company name/i), "Beta");
    await userEvent.type(
      screen.getByLabelText(/careers page url/i),
      "https://jobs.lever.co/beta",
    );
    await userEvent.click(screen.getByRole("button", { name: /add company/i }));
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      watchlist_companies: [
        { name: "Beta", careers_url: "https://jobs.lever.co/beta" },
      ],
    });
  });

  it("should remove a company from the list", async () => {
    render(<SettingsWatchlistSection />);

    await userEvent.click(screen.getByRole("button", { name: /remove acme/i }));

    expect(screen.queryByText("Acme")).not.toBeInTheDocument();
  });
});
