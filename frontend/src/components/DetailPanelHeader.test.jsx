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
  it("should render role title and company name", () => {
    render(<DetailPanelHeader application={mockApp} onClose={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("should show AI status pills when fit score and prep are present", () => {
    render(
      <DetailPanelHeader
        application={{
          ...mockApp,
          ai_analysis: { fit_score: 82 },
          interview_prep_briefing: { company: "Acme Corp" },
          source: "email",
        }}
        onClose={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByLabelText("AI status")).toBeInTheDocument();
    expect(screen.getByText("Prep ready")).toBeInTheDocument();
    expect(screen.getByText("Gmail synced")).toBeInTheDocument();
    expect(screen.getByTestId("fit-badge")).toHaveTextContent("82%");
  });

  it("should call onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    render(<DetailPanelHeader application={mockApp} onClose={onClose} onDelete={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Close panel" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should call onDelete when delete button is clicked", async () => {
    const onDelete = vi.fn();
    render(<DetailPanelHeader application={mockApp} onClose={vi.fn()} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete application" }));

    expect(onDelete).toHaveBeenCalledOnce();
  });
  it("should show Researching pill when interview prep is generating", () => {
    render(
      <DetailPanelHeader
        application={{
          ...mockApp,
          interview_prep_status: "generating",
        }}
        onClose={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Researching")).toBeInTheDocument();
  });

});
