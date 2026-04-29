import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ManualAddFormFields } from "./ManualAddFormFields";

vi.mock("./TemplateBar", () => ({
  default: () => <div data-testid="template-bar" />,
}));

vi.mock("./DuplicateWarning", () => ({
  DuplicateWarning: () => <div data-testid="duplicate-warning" />,
}));

vi.mock("./FormField", () => ({
  default: ({ label, htmlFor, children, error }) => (
    <div>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <span role="alert">{error}</span>}
    </div>
  ),
}));

vi.mock("./TagInput", () => ({
  default: () => <div data-testid="tag-input" />,
}));

vi.mock("./ManualAddFormDateRow", () => ({
  ManualAddFormDateRow: () => <div data-testid="date-row" />,
}));

vi.mock("./ManualAddFormCategoryRow", () => ({
  ManualAddFormCategoryRow: () => <div data-testid="category-row" />,
}));

function buildHook(overrides = {}) {
  return {
    roleTitle: "",
    setRoleTitle: vi.fn(),
    company: "",
    setCompany: vi.fn(),
    sourceUrl: "",
    setSourceUrl: vi.fn(),
    dateApplied: "",
    setDateApplied: vi.fn(),
    compensation: "",
    setCompensation: vi.fn(),
    location: "",
    setLocation: vi.fn(),
    stage: "",
    setStage: vi.fn(),
    stageOptions: [],
    remoteStatus: "",
    setRemoteStatus: vi.fn(),
    companyType: "",
    setCompanyType: vi.fn(),
    tags: [],
    setTags: vi.fn(),
    fieldErrors: {},
    applyTemplate: vi.fn(),
    isDuplicate: false,
    existingId: null,
    mutationError: null,
    ...overrides,
  };
}

describe("ManualAddFormFields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render role title input with aria-required", () => {
    render(<ManualAddFormFields hook={buildHook()} />);

    expect(screen.getByLabelText(/role title/i)).toHaveAttribute("aria-required", "true");
  });

  it("should render company input with aria-required", () => {
    render(<ManualAddFormFields hook={buildHook()} />);

    expect(screen.getByLabelText(/company \*/i)).toHaveAttribute("aria-required", "true");
  });

  it("should show DuplicateWarning when isDuplicate is true", () => {
    render(<ManualAddFormFields hook={buildHook({ isDuplicate: true, existingId: "app-1" })} />);

    expect(screen.getByTestId("duplicate-warning")).toBeInTheDocument();
  });

  it("should show mutation error alert when mutationError is set and no duplicate", () => {
    render(<ManualAddFormFields hook={buildHook({ mutationError: new Error("Server error") })} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Server error");
  });

  it("should call setRoleTitle when role title input changes", () => {
    const setRoleTitle = vi.fn();

    render(<ManualAddFormFields hook={buildHook({ setRoleTitle })} />);
    fireEvent.change(screen.getByLabelText(/role title/i), { target: { value: "Software Engineer" } });

    expect(setRoleTitle).toHaveBeenCalledWith("Software Engineer");
  });
});
