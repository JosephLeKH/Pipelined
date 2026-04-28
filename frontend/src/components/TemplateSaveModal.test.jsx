import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TemplateSaveModal from "./TemplateSaveModal";

vi.mock("../hooks/useTemplates", () => ({
  useCreateTemplate: vi.fn(),
}));

import { useCreateTemplate } from "../hooks/useTemplates";

const mockMutate = vi.fn();
const FIELDS = { company: "Acme", role_title: "Engineer" };

describe("TemplateSaveModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCreateTemplate.mockReturnValue({ mutate: mockMutate, isPending: false });
  });

  it("should not render when isOpen is false", () => {
    render(<TemplateSaveModal isOpen={false} onClose={vi.fn()} fields={FIELDS} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should render template name input when open", () => {
    render(<TemplateSaveModal isOpen={true} onClose={vi.fn()} fields={FIELDS} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/template name/i)).toBeInTheDocument();
  });

  it("should show validation error when name is empty", () => {
    render(<TemplateSaveModal isOpen={true} onClose={vi.fn()} fields={FIELDS} />);

    fireEvent.click(screen.getByRole("button", { name: /save template/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("Template name is required.");
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("should call createTemplate mutation with trimmed name", () => {
    render(<TemplateSaveModal isOpen={true} onClose={vi.fn()} fields={FIELDS} />);

    fireEvent.change(screen.getByLabelText(/template name/i), {
      target: { value: "  Remote SWE  " },
    });

    fireEvent.click(screen.getByRole("button", { name: /save template/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      { name: "Remote SWE", fields: FIELDS },
      expect.any(Object)
    );
  });

  it("should call onClose when Cancel is clicked", () => {
    const onClose = vi.fn();

    render(<TemplateSaveModal isOpen={true} onClose={onClose} fields={FIELDS} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
