import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import JobSearchInput from "./JobSearchInput";
import { JOB_SEARCH_DEBOUNCE_MS } from "../lib/constants";

function renderWithRouter(initialSearch = "", props = {}) {
  return render(
    <MemoryRouter initialEntries={[`/jobs${initialSearch}`]}>
      <JobSearchInput {...props} />
    </MemoryRouter>
  );
}

describe("JobSearchInput", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render search input with aria-label", () => {
    renderWithRouter();

    expect(screen.getByRole("textbox", { name: /search jobs/i })).toBeInTheDocument();
  });

  it("should render 40px tall search input", () => {
    renderWithRouter();

    expect(screen.getByRole("textbox", { name: /search jobs/i })).toHaveClass("h-10");
  });

  it("should show cmd+k hint", () => {
    renderWithRouter();

    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });

  it("should initialize value from q search param", () => {
    renderWithRouter("?q=engineer");

    expect(screen.getByRole("textbox", { name: /search jobs/i })).toHaveValue("engineer");
  });

  it("should update controlled input value on change", () => {
    renderWithRouter();

    const input = screen.getByRole("textbox", { name: /search jobs/i });
    fireEvent.change(input, { target: { value: "react developer" } });

    expect(input).toHaveValue("react developer");
  });

  it("should debounce URL update at 200ms", () => {
    renderWithRouter();

    const input = screen.getByRole("textbox", { name: /search jobs/i });
    fireEvent.change(input, { target: { value: "python" } });

    expect(input).toHaveValue("python");

    act(() => {
      vi.advanceTimersByTime(JOB_SEARCH_DEBOUNCE_MS);
    });
  });

  it("should call onEnterKey when Enter is pressed", () => {
    const onEnterKey = vi.fn();
    renderWithRouter("", { onEnterKey });

    const input = screen.getByRole("textbox", { name: /search jobs/i });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onEnterKey).toHaveBeenCalledOnce();
  });
});
