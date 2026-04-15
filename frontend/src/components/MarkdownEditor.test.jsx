/** Tests for MarkdownEditor — XSS sanitization and core behavior. */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import MarkdownEditor from "./MarkdownEditor";

describe("MarkdownEditor", () => {
  it("should render Write tab as active by default with a textarea", () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);

    expect(screen.getByRole("tab", { name: /write/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /preview/i })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByTestId("markdown-write-textarea")).toBeInTheDocument();
  });

  it("should switch to Preview tab on click", async () => {
    const user = userEvent.setup();
    render(<MarkdownEditor value="**hello**" onChange={vi.fn()} />);

    await user.click(screen.getByRole("tab", { name: /preview/i }));

    expect(screen.getByLabelText(/markdown preview/i)).toBeInTheDocument();
    expect(screen.queryByTestId("markdown-write-textarea")).not.toBeInTheDocument();
  });

  it("should strip script tags from preview output", async () => {
    const user = userEvent.setup();
    const xssInput = 'Hello <script>alert("xss")</script> world';

    render(<MarkdownEditor value={xssInput} onChange={vi.fn()} />);

    await user.click(screen.getByRole("tab", { name: /preview/i }));

    const preview = screen.getByLabelText(/markdown preview/i);
    expect(preview.innerHTML).not.toContain("<script>");
    expect(preview.innerHTML).not.toContain("alert(");
    expect(preview.textContent).toContain("Hello");
    expect(preview.textContent).toContain("world");
  });

  it("should strip onerror event handlers from preview output", async () => {
    const user = userEvent.setup();
    const xssInput = '<img src=x onerror="alert(1)">';

    render(<MarkdownEditor value={xssInput} onChange={vi.fn()} />);

    await user.click(screen.getByRole("tab", { name: /preview/i }));

    const preview = screen.getByLabelText(/markdown preview/i);
    expect(preview.innerHTML).not.toContain("onerror");
    expect(preview.innerHTML).not.toContain("alert(1)");
  });

  it("should insert 2 spaces on Tab key press in textarea", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="hello" onChange={onChange} />);

    const textarea = screen.getByTestId("markdown-write-textarea");
    fireEvent.keyDown(textarea, { key: "Tab" });

    expect(onChange).toHaveBeenCalled();
    const newValue = onChange.mock.calls[0][0];
    expect(newValue).toContain("  ");
  });

  it("should call onChange when typing in the textarea", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MarkdownEditor value="" onChange={onChange} />);

    const textarea = screen.getByTestId("markdown-write-textarea");
    await user.type(textarea, "a");

    expect(onChange).toHaveBeenCalled();
  });

  it("should show cheatsheet popover when help icon is clicked", async () => {
    const user = userEvent.setup();
    render(<MarkdownEditor value="" onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /markdown supported/i }));

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Bold");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Italic");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Heading");
  });

  it("should render markdown in preview as HTML", async () => {
    const user = userEvent.setup();
    render(<MarkdownEditor value="**bold text**" onChange={vi.fn()} />);

    await user.click(screen.getByRole("tab", { name: /preview/i }));

    const preview = screen.getByLabelText(/markdown preview/i);
    expect(preview.innerHTML).toContain("<strong>");
    expect(preview.textContent).toContain("bold text");
  });
});
