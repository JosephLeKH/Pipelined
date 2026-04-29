import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsTemplatesSection from "./SettingsTemplatesSection";

vi.mock("../hooks/useTemplates", () => ({
  useTemplates: vi.fn(),
  useUpdateTemplate: vi.fn(),
  useDeleteTemplate: vi.fn(),
}));

import { useTemplates, useUpdateTemplate, useDeleteTemplate } from "../hooks/useTemplates";

const mockRefetch = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

const TEMPLATE_FIXTURE = {
  id: "t1",
  name: "Engineering",
  fields: { remote_status: "Remote", company_type: null, role_type: null, compensation: null, tags: [] },
};

describe("SettingsTemplatesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTemplates.mockReturnValue({ data: [], isLoading: false, error: null, refetch: mockRefetch });
    useUpdateTemplate.mockReturnValue({ mutate: mockUpdateMutate, isPending: false });
    useDeleteTemplate.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
  });

  it("should show loading state while templates are fetching", () => {
    useTemplates.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: mockRefetch });

    render(<SettingsTemplatesSection />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("should show error state with retry button when fetch fails", () => {
    useTemplates.mockReturnValue({ data: undefined, isLoading: false, error: new Error("Network error"), refetch: mockRefetch });

    render(<SettingsTemplatesSection />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load templates.");
    expect(screen.getByRole("button", { name: /retry loading templates/i })).toBeInTheDocument();
  });

  it("should call refetch when retry is clicked", () => {
    useTemplates.mockReturnValue({ data: undefined, isLoading: false, error: new Error("Network error"), refetch: mockRefetch });

    render(<SettingsTemplatesSection />);
    fireEvent.click(screen.getByRole("button", { name: /retry loading templates/i }));

    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it("should show empty state when no templates exist", () => {
    render(<SettingsTemplatesSection />);

    expect(screen.getByText(/no templates yet/i)).toBeInTheDocument();
  });

  it("should render a TemplateRow for each template", () => {
    useTemplates.mockReturnValue({
      data: [TEMPLATE_FIXTURE, { ...TEMPLATE_FIXTURE, id: "t2", name: "Product" }],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SettingsTemplatesSection />);

    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Product")).toBeInTheDocument();
  });

  it("should enter edit mode when rename button is clicked", () => {
    useTemplates.mockReturnValue({ data: [TEMPLATE_FIXTURE], isLoading: false, error: null, refetch: mockRefetch });

    render(<SettingsTemplatesSection />);
    fireEvent.click(screen.getByRole("button", { name: /rename engineering/i }));

    expect(screen.getByRole("textbox", { name: /rename template/i })).toBeInTheDocument();
  });

  it("should call updateMutate when confirm rename is clicked", () => {
    useTemplates.mockReturnValue({ data: [TEMPLATE_FIXTURE], isLoading: false, error: null, refetch: mockRefetch });

    render(<SettingsTemplatesSection />);
    fireEvent.click(screen.getByRole("button", { name: /rename engineering/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /rename template/i }), { target: { value: "SWE" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm rename/i }));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { id: "t1", body: { name: "SWE" } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it("should call deleteMutate when delete button is clicked", () => {
    useTemplates.mockReturnValue({ data: [TEMPLATE_FIXTURE], isLoading: false, error: null, refetch: mockRefetch });

    render(<SettingsTemplatesSection />);
    fireEvent.click(screen.getByRole("button", { name: /delete engineering/i }));

    expect(mockDeleteMutate).toHaveBeenCalledWith("t1");
  });
});
