import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { DetailPanelHeader } from "./DetailPanelHeader";

const mockApp = {
  role_title: "Software Engineer",
  company: "Acme Corp",
  company_domain: "acme.com",
};

describe("DetailPanelHeader", () => {
  it("should render role title and company name", () => {
    render(<DetailPanelHeader application={mockApp} onClose={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
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
});
