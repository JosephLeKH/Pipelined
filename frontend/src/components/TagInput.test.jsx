/** Tests for TagInput — chip display, suggestions dropdown, keyboard navigation, chip removal. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";

import TagInput from "./TagInput";

const server = setupServer(
  http.get("/api/applications/tags", () =>
    HttpResponse.json({ data: { tags: [{ name: "faang", count: 3 }, { name: "referral", count: 2 }] } })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("TagInput", () => {
  it("should render the input with placeholder when no tags", () => {
    // Arrange / Act
    render(<TagInput value={[]} onChange={() => {}} />, { wrapper: makeWrapper() });

    // Assert
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Add a tag…")).toBeInTheDocument();
  });

  it("should render existing tags as chips", () => {
    // Arrange / Act
    render(<TagInput value={["referral", "startup"]} onChange={() => {}} />, {
      wrapper: makeWrapper(),
    });

    // Assert
    expect(screen.getByText("referral")).toBeInTheDocument();
    expect(screen.getByText("startup")).toBeInTheDocument();
  });

  it("should call onChange with new tag when user types and presses Enter", async () => {
    // Arrange
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.type(screen.getByRole("combobox"), "newtag{Enter}");

    // Assert
    expect(onChange).toHaveBeenCalledWith(["newtag"]);
  });

  it("should not add duplicate tags", async () => {
    // Arrange
    const onChange = vi.fn();
    render(<TagInput value={["referral"]} onChange={onChange} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.type(screen.getByRole("combobox"), "referral{Enter}");

    // Assert — onChange not called because tag already exists
    expect(onChange).not.toHaveBeenCalled();
  });

  it("should add tag when clicking a suggestion", async () => {
    // Arrange
    server.use(
      http.get("/api/applications/tags", () =>
        HttpResponse.json({ data: { tags: [] } })
      )
    );
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />, { wrapper: makeWrapper() });

    // Act — focus input to open suggestions (predefined tags)
    await userEvent.click(screen.getByRole("combobox"));

    // Assert — predefined suggestions appear
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("option", { name: "referral" }));

    // Assert
    expect(onChange).toHaveBeenCalledWith(["referral"]);
  });

  it("should remove a tag when clicking its X button", async () => {
    // Arrange
    const onChange = vi.fn();
    render(<TagInput value={["referral", "startup"]} onChange={onChange} />, {
      wrapper: makeWrapper(),
    });

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Remove tag referral" }));

    // Assert
    expect(onChange).toHaveBeenCalledWith(["startup"]);
  });

  it("should remove the last tag on Backspace when input is empty", async () => {
    // Arrange
    const onChange = vi.fn();
    render(<TagInput value={["referral", "startup"]} onChange={onChange} />, {
      wrapper: makeWrapper(),
    });

    // Act
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.keyboard("{Backspace}");

    // Assert
    expect(onChange).toHaveBeenCalledWith(["referral"]);
  });

  it("should not show already-selected tags in suggestions", async () => {
    // Arrange — "referral" is already selected
    render(<TagInput value={["referral"]} onChange={() => {}} />, { wrapper: makeWrapper() });

    // Act — open suggestions
    await userEvent.click(screen.getByRole("combobox"));

    // Assert — listbox open but referral not shown as option
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    const options = screen.queryAllByRole("option", { name: "referral" });
    expect(options).toHaveLength(0);
  });

  it("should filter suggestions based on typed input", async () => {
    // Arrange
    server.use(
      http.get("/api/applications/tags", () =>
        HttpResponse.json({ data: { tags: [] } })
      )
    );
    render(<TagInput value={[]} onChange={() => {}} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.type(screen.getByRole("combobox"), "ref");

    // Assert — only matching suggestions shown
    await waitFor(() => expect(screen.getByRole("option", { name: "referral" })).toBeInTheDocument());
    expect(screen.queryByRole("option", { name: "startup" })).not.toBeInTheDocument();
  });

  it("should close suggestions dropdown on Escape", async () => {
    // Arrange
    render(<TagInput value={[]} onChange={() => {}} />, { wrapper: makeWrapper() });
    await userEvent.click(screen.getByRole("combobox"));
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());

    // Act
    await userEvent.keyboard("{Escape}");

    // Assert
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
