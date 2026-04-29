import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthLayout from "./AuthLayout";

describe("AuthLayout", () => {
  it("should render Pipelined brand heading", () => {
    render(<AuthLayout><div /></AuthLayout>);

    expect(screen.getByText("Pipelined")).toBeInTheDocument();
  });

  it("should render children", () => {
    render(<AuthLayout><p data-testid="child">Hello</p></AuthLayout>);

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
