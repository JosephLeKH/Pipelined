/** Tests for MarkdownEditor (Tiptap WYSIWYG). JSDOM can't fully simulate
 * contentEditable, so behavior tests live in Playwright e2e. */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import MarkdownEditor from "./MarkdownEditor";

describe("MarkdownEditor", () => {
  it("renders a formatting toolbar with bold, italic, underline, and list buttons", () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);

    expect(screen.getByRole("toolbar", { name: /formatting options/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^bold$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^italic$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^underline$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bulleted list/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /numbered list/i })).toBeInTheDocument();
  });

  it("does not render Write/Preview tabs", () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);

    expect(screen.queryByRole("tab", { name: /write/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /preview/i })).not.toBeInTheDocument();
  });

  it("renders an editable region for content", () => {
    render(<MarkdownEditor value="hello" onChange={vi.fn()} />);

    expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
  });

  it("applies the provided className to the wrapper", () => {
    const { container } = render(
      <MarkdownEditor value="" onChange={vi.fn()} className="custom-wrapper" />,
    );

    expect(container.querySelector(".custom-wrapper")).toBeInTheDocument();
  });
});
