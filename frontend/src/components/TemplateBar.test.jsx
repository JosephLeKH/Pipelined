import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TemplateBar from "./TemplateBar";

vi.mock("../hooks/useTemplates", () => ({
  useTemplates: vi.fn(),
}));

vi.mock("./TemplateSaveModal", () => ({
  default: ({ isOpen }) =>
    isOpen ? <div data-testid="template-save-modal" /> : null,
}));

import { useTemplates } from "../hooks/useTemplates";

const TEMPLATES_FIXTURE = [
  { id: "t1", name: "Engineering", fields: { remote_status: "Remote" } },
  { id: "t2", name: "Product", fields: { remote_status: "Hybrid" } },
];

describe("TemplateBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTemplates.mockReturnValue({ data: [], isLoading: false, error: null });
  });

  it("should show error alert when templates fetch fails", () => {
    useTemplates.mockReturnValue({ data: undefined, isLoading: false, error: new Error("Network error") });

    render(<TemplateBar onApply={vi.fn()} fields={{}} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load templates.");
  });

  it("should render template dropdown when templates are available", () => {
    useTemplates.mockReturnValue({ data: TEMPLATES_FIXTURE, isLoading: false, error: null });

    render(<TemplateBar onApply={vi.fn()} fields={{}} />);

    expect(screen.getByRole("combobox", { name: /use template/i })).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Product")).toBeInTheDocument();
  });

  it("should call onApply with the selected template when one is chosen", () => {
    useTemplates.mockReturnValue({ data: TEMPLATES_FIXTURE, isLoading: false, error: null });
    const onApply = vi.fn();

    render(<TemplateBar onApply={onApply} fields={{}} />);
    fireEvent.change(screen.getByRole("combobox", { name: /use template/i }), { target: { value: "t1" } });

    expect(onApply).toHaveBeenCalledWith(TEMPLATES_FIXTURE[0]);
  });

  it("should open TemplateSaveModal when Save as template is clicked", () => {
    render(<TemplateBar onApply={vi.fn()} fields={{}} />);

    fireEvent.click(screen.getByRole("button", { name: /save as template/i }));

    expect(screen.getByTestId("template-save-modal")).toBeInTheDocument();
  });
});
