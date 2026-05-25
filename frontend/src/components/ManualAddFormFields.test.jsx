import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ManualAddFormFields } from "./ManualAddFormFields";

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

vi.mock("./ManualAddFormDateRow", () => ({
  ManualAddFormDateRow: () => <div data-testid="date-row" />,
}));

vi.mock("./ManualAddFormStagePicker", () => ({
  ManualAddFormStagePicker: () => <div data-testid="stage-picker" />,
}));

vi.mock("./ManualAddFormSourcePicker", () => ({
  ManualAddFormSourcePicker: () => <div data-testid="source-picker" />,
}));

vi.mock("./ManualAddFormCollapsibleField", () => ({
  ManualAddFormCollapsibleField: ({ label }) => <div data-testid={`collapsible-${label}`} />,
}));

function buildHook(overrides = {}) {
  return {
    company: "",
    setCompany: vi.fn(),
    roleTitle: "",
    setRoleTitle: vi.fn(),
    sourceUrl: "",
    setSourceUrl: vi.fn(),
    dateApplied: "",
    setDateApplied: vi.fn(),
    stage: "",
    setStage: vi.fn(),
    stageOptions: [],
    source: "manual",
    setSource: vi.fn(),
    jobDescription: "",
    setJobDescription: vi.fn(),
    notes: "",
    setNotes: vi.fn(),
    fieldErrors: {},
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

  it("should render company input with aria-required", () => {
    render(<ManualAddFormFields hook={buildHook()} />);

    expect(screen.getByLabelText(/company/i)).toHaveAttribute("aria-required", "true");
  });

  it("should render role title input with aria-required", () => {
    render(<ManualAddFormFields hook={buildHook()} />);

    expect(screen.getByLabelText(/role title/i)).toHaveAttribute("aria-required", "true");
  });

  it("should render stage and source pickers", () => {
    render(<ManualAddFormFields hook={buildHook()} />);

    expect(screen.getByTestId("stage-picker")).toBeInTheDocument();
    expect(screen.getByTestId("source-picker")).toBeInTheDocument();
  });

  it("should show DuplicateWarning when isDuplicate is true", () => {
    render(<ManualAddFormFields hook={buildHook({ isDuplicate: true, existingId: "app-1" })} />);

    expect(screen.getByTestId("duplicate-warning")).toBeInTheDocument();
  });

  it("should show mutation error alert when mutationError is set and no duplicate", () => {
    render(<ManualAddFormFields hook={buildHook({ mutationError: new Error("Server error") })} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Server error");
  });

  it("should call setCompany when company input changes", () => {
    const setCompany = vi.fn();

    render(<ManualAddFormFields hook={buildHook({ setCompany })} />);
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: "Acme Corp" } });

    expect(setCompany).toHaveBeenCalledWith("Acme Corp");
  });
});
