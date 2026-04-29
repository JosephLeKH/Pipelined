import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import JobSearchInput from "./JobSearchInput";

function renderWithRouter(initialSearch = "") {
  return render(
    <MemoryRouter initialEntries={[`/jobs${initialSearch}`]}>
      <JobSearchInput />
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

  it("should debounce URL update after typing", () => {
    renderWithRouter();

    const input = screen.getByRole("textbox", { name: /search jobs/i });
    fireEvent.change(input, { target: { value: "python" } });

    expect(input).toHaveValue("python");

    act(() => {
      vi.advanceTimersByTime(350);
    });
  });
});
