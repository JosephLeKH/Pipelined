/** Tests for ApplyPackSection — generate, display, copy per field. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";

import ApplyPackSection from "./ApplyPackSection";

vi.mock("../api/applications", () => ({
  generateApplyPack: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { generateApplyPack } from "../api/applications";

const MOCK_PACK = {
  cover_letter: "Dear hiring team,\n\nI am excited to apply.",
  short_answers: [{ question: "Why this company?", answer: "Mission alignment." }],
  linkedin_note: "Hi. Would love to connect about the SWE role.",
  talking_points: ["5 years Python", "Led API migration"],
};

describe("ApplyPackSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("should generate apply pack and show copy buttons per field", async () => {
    generateApplyPack.mockResolvedValue(MOCK_PACK);
    const onPackGenerated = vi.fn();
    render(
      <ApplyPackSection
        application={{
          id: "app1",
          job_description: "Python engineer role",
          apply_pack: null,
        }}
        onPackGenerated={onPackGenerated}
      />
    );

    expect(screen.getByText(/no auto-send — review and send manually/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /generate apply pack/i }));

    await waitFor(() => {
      expect(screen.getByText(/Dear hiring team/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Mission alignment.")).toBeInTheDocument();
    expect(screen.getByText("5 years Python")).toBeInTheDocument();
    expect(onPackGenerated).toHaveBeenCalledWith(MOCK_PACK);

    await userEvent.click(screen.getByRole("button", { name: /copy cover letter/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(MOCK_PACK.cover_letter);
  });

  it("should show rate limit toast on 429", async () => {
    const { toast } = await import("sonner");
    generateApplyPack.mockRejectedValue({ code: "RATE_LIMIT_EXCEEDED", message: "Rate limit exceeded" });

    render(
      <ApplyPackSection
        application={{ id: "app1", job_description: "Role", apply_pack: null }}
        onPackGenerated={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /generate apply pack/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/daily ai limit/i)
      );
    });
  });

  it("should render cached apply pack without generating", () => {
    render(
      <ApplyPackSection
        application={{ id: "app1", job_description: "Role", apply_pack: MOCK_PACK }}
        onPackGenerated={vi.fn()}
      />
    );

    expect(screen.getByText(/Dear hiring team/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh apply pack/i })).toBeInTheDocument();
  });

  it("should show source attribution line", () => {
    render(
      <ApplyPackSection
        application={{ id: "app1", job_description: "Role", apply_pack: null }}
        onPackGenerated={vi.fn()}
      />
    );

    expect(screen.getByText(/based on your resume, profile, and this job/i)).toBeInTheDocument();
  });

  it("should display unified 'no auto-send' message", () => {
    render(
      <ApplyPackSection
        application={{ id: "app1", job_description: "Role", apply_pack: null }}
        onPackGenerated={vi.fn()}
      />
    );

    expect(screen.getByText(/no auto-send — review and send manually/i)).toBeInTheDocument();
  });
});
