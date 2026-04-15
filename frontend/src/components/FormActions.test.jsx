import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FormActions } from "./FormActions";

describe("FormActions", () => {
  it("should render Cancel and Add Application buttons", () => {
    render(<FormActions isPending={false} onCancel={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Application" })).toBeInTheDocument();
  });

  it("should call onCancel when Cancel is clicked", async () => {
    const onCancel = vi.fn();
    render(<FormActions isPending={false} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("should disable submit and show spinner when isPending", () => {
    render(<FormActions isPending={true} onCancel={vi.fn()} />);

    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
  });
});
