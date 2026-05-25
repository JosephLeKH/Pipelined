import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DetailPanelHeader } from "./DetailPanelHeader";

const mockApp = {
  role_title: "Software Engineer",
  company: "Acme Corp",
  company_domain: "acme.com",
  source: "manual",
  fit_score: null,
  ai_analysis: null,
  interview_prep_briefing: null,
};

describe("DetailPanelHeader", () => {
  it("should render inline company and role title", () => {
    render(<DetailPanelHeader application={mockApp} onClose={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Acme Corp · Software Engineer" })).toBeInTheDocument();
  });

  it("should call onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    render(<DetailPanelHeader application={mockApp} onClose={onClose} onDelete={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Close panel" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should call onDelete from the actions menu", async () => {
    const onDelete = vi.fn();
    render(<DetailPanelHeader application={mockApp} onClose={vi.fn()} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole("button", { name: "Application actions" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /delete application/i }));

    expect(onDelete).toHaveBeenCalledOnce();
  });
});
