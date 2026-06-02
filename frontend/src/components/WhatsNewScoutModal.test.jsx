import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";

import WhatsNewScoutModal from "./WhatsNewScoutModal";

describe("WhatsNewScoutModal", () => {
  beforeEach(() => localStorage.clear());

  it("shows on first mount when flag is unset", () => {
    render(<WhatsNewScoutModal />);
    expect(screen.getByRole("dialog", { name: /Meet Scout/i })).toBeInTheDocument();
  });

  it("does not show after being dismissed", async () => {
    const { unmount } = render(<WhatsNewScoutModal />);
    await userEvent.click(screen.getByRole("button", { name: /Got it/i }));
    unmount();

    render(<WhatsNewScoutModal />);
    expect(screen.queryByRole("dialog", { name: /Meet Scout/i })).not.toBeInTheDocument();
  });
});
