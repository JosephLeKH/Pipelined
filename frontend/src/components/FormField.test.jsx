import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FormField from "./FormField";

describe("FormField", () => {
  it("should render label text", () => {
    render(<FormField label="Email" htmlFor="email"><input id="email" /></FormField>);

    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("should associate label with input via htmlFor", () => {
    render(<FormField label="Email" htmlFor="email"><input id="email" /></FormField>);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("should render error message when error prop is set", () => {
    render(<FormField label="Email" htmlFor="email" error="Required"><input id="email" /></FormField>);

    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("should not render error element when error is absent", () => {
    render(<FormField label="Email" htmlFor="email"><input id="email" /></FormField>);

    expect(screen.queryByText("Required")).not.toBeInTheDocument();
  });

  it("should give error element a unique id based on htmlFor", () => {
    render(<FormField label="Email" htmlFor="email" error="Required"><input id="email" /></FormField>);

    expect(screen.getByText("Required")).toHaveAttribute("id", "email-error");
  });

  it("should set aria-describedby on input pointing to error id when error exists", () => {
    render(<FormField label="Email" htmlFor="email" error="Required"><input id="email" /></FormField>);

    expect(screen.getByRole("textbox")).toHaveAttribute("aria-describedby", "email-error");
  });

  it("should omit aria-describedby on input when no error is present", () => {
    render(<FormField label="Email" htmlFor="email"><input id="email" /></FormField>);

    expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-describedby");
  });
});
