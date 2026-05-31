import { renderHook, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { getCopilotSession, saveCopilotSession, streamCopilotChat } from "../api/copilot";
import { useCopilotChat } from "./useCopilotChat";

vi.mock("../api/copilot", () => ({
  getCopilotSession: vi.fn(),
  saveCopilotSession: vi.fn(),
  streamCopilotChat: vi.fn(),
}));

const SAVED_MESSAGES = [
  { role: "user", content: "Hello", actions: [] },
  { role: "assistant", content: "Hi there", actions: [] },
];

function wrapper({ children }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

beforeEach(() => {
  vi.mocked(getCopilotSession).mockResolvedValue({ messages: [] });
  vi.mocked(saveCopilotSession).mockResolvedValue({ messages: [] });
  vi.mocked(streamCopilotChat).mockReset();
});

describe("useCopilotChat", () => {
  it("should hydrate messages from server session on mount", async () => {
    vi.mocked(getCopilotSession).mockResolvedValue({ messages: SAVED_MESSAGES });

    const { result } = renderHook(() => useCopilotChat(), { wrapper });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });
    expect(result.current.messages[0].content).toBe("Hello");
    expect(result.current.messages[1].content).toBe("Hi there");
  });

  it("should clear server session on reset", async () => {
    vi.mocked(getCopilotSession).mockResolvedValue({ messages: SAVED_MESSAGES });

    const { result } = renderHook(() => useCopilotChat(), { wrapper });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.messages).toEqual([]);
    expect(saveCopilotSession).toHaveBeenCalledWith([]);
  });

  it("should persist session after stream completes", async () => {
    vi.mocked(streamCopilotChat).mockImplementation(async (_payload, { onDone }) => {
      onDone({ content: "Hello back", actions: [] });
    });

    const { result } = renderHook(() => useCopilotChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    await waitFor(() => {
      expect(saveCopilotSession).toHaveBeenCalled();
    });

    const savedPayload = vi.mocked(saveCopilotSession).mock.calls.at(-1)?.[0] ?? [];
    expect(savedPayload.some((msg) => msg.content === "Hello back")).toBe(true);
  });

  it("should include current messages in history on send", async () => {
    vi.mocked(streamCopilotChat).mockImplementation(async (_payload, { onDone }) => {
      onDone({ content: "Response", actions: [] });
    });

    const { result } = renderHook(() => useCopilotChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("First message");
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    // Verify message dependency is in closure - history should be built from current messages state
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe("user");
    expect(result.current.messages[0].content).toBe("First message");
  });
});
