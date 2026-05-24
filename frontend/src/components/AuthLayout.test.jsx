import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuthLayout from "./AuthLayout";

describe("AuthLayout", () => {
  it("should render Pipelined brand heading", () => {
    render(<MemoryRouter><AuthLayout><div /></AuthLayout></MemoryRouter>);

    expect(screen.getByText("Pipelined")).toBeInTheDocument();
  });

  it("should render children", () => {
    render(<MemoryRouter><AuthLayout><p data-testid="child">Hello</p></AuthLayout></MemoryRouter>);

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
