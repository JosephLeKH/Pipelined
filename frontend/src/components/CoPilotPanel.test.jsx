import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import CoPilotPanel from "./CoPilotPanel";

const mockSendMessage = vi.fn();
const mockRunAction = vi.fn();
const mockReset = vi.fn();

vi.mock("../hooks/useCopilotChat", () => ({
  useCopilotChat: vi.fn(),
}));

import { useCopilotChat } from "../hooks/useCopilotChat";

function renderPanel(props = {}) {
  return render(
    <MemoryRouter>
      <CoPilotPanel open onClose={vi.fn()} {...props} />
    </MemoryRouter>
  );
}

describe("CoPilotPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCopilotChat.mockReturnValue({
      messages: [],
      errorMessage: null,
      sendMessage: mockSendMessage,
      runAction: mockRunAction,
      reset: mockReset,
      isStreaming: false,
    });
  });

  it("should render co-pilot header and input when open", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: /co-pilot/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/co-pilot message/i)).toBeInTheDocument();
    expect(screen.getByText(/answers based on your applications/i)).toBeInTheDocument();
  });

  it("should render suggested prompt chips when empty", () => {
    renderPanel();

    expect(screen.getByRole("button", { name: /what should i prioritize today/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /which applications need follow-up/i })).toBeInTheDocument();
  });

  it("should send message when suggested prompt is clicked", async () => {
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: /what should i prioritize today/i }));

    expect(mockSendMessage).toHaveBeenCalledWith("What should I prioritize today?");
  });

  it("should show typing indicator while streaming", () => {
    useCopilotChat.mockReturnValue({
      messages: [],
      errorMessage: null,
      sendMessage: mockSendMessage,
      runAction: mockRunAction,
      reset: mockReset,
      isStreaming: true,
    });

    renderPanel();

    expect(screen.getByLabelText(/co-pilot is typing/i)).toBeInTheDocument();
  });

  it("should send a message on submit", async () => {
    renderPanel();

    await userEvent.type(screen.getByLabelText(/co-pilot message/i), "What is stale?");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(mockSendMessage).toHaveBeenCalledWith("What is stale?");
  });

  it("should render open_app action buttons", async () => {
    useCopilotChat.mockReturnValue({
      messages: [{
        role: "assistant",
        content: "Check Today.",
        actions: [{ action: "open_app", path: "/today", label: "Open Today" }],
      }],
      errorMessage: null,
      sendMessage: mockSendMessage,
      runAction: mockRunAction,
      reset: mockReset,
      isStreaming: false,
    });

    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: /open today/i }));
    expect(mockRunAction).toHaveBeenCalledWith({
      action: "open_app",
      path: "/today",
      label: "Open Today",
    });
  });
});
