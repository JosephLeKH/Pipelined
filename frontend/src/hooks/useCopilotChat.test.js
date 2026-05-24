import { renderHook, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";

import { useCopilotChat } from "./useCopilotChat";

const SAVED_MESSAGES = [
  { role: "user", content: "Hello", actions: [] },
  { role: "assistant", content: "Hi there", actions: [] },
];

let sessionStore = [];

const server = setupServer(
  http.get("/api/copilot/session", () =>
    HttpResponse.json({ data: { messages: sessionStore } })
  ),
  http.post("/api/copilot/session", async ({ request }) => {
    const body = await request.json();
    sessionStore = body.messages ?? [];
    return HttpResponse.json({ data: { messages: sessionStore } });
  }),
  http.post("/api/copilot/chat", () =>
    HttpResponse.json({ data: { message: "" } })
  ),
);

function wrapper({ children }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  sessionStore = [];
});
afterAll(() => server.close());

describe("useCopilotChat", () => {
  it("should hydrate messages from server session on mount", async () => {
    sessionStore = SAVED_MESSAGES;

    const { result } = renderHook(() => useCopilotChat(), { wrapper });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });
    expect(result.current.messages[0].content).toBe("Hello");
    expect(result.current.messages[1].content).toBe("Hi there");
  });

  it("should clear server session on reset", async () => {
    sessionStore = SAVED_MESSAGES;

    const { result } = renderHook(() => useCopilotChat(), { wrapper });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.messages).toEqual([]);

    await waitFor(() => {
      expect(sessionStore).toEqual([]);
    });
  });

  it("should persist session after stream completes", async () => {
    vi.mock("../api/copilot", async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        streamCopilotChat: vi.fn(async (_payload, { onToken, onDone }) => {
          onToken({ content: "Hel" });
          onDone({ content: "Hello back", actions: [] });
        }),
      };
    });

    const { streamCopilotChat } = await import("../api/copilot");
    streamCopilotChat.mockImplementation(async (_payload, { onDone }) => {
      onDone({ content: "Hello back", actions: [] });
    });

    const { result } = renderHook(() => useCopilotChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    await waitFor(() => {
      expect(sessionStore.length).toBeGreaterThan(0);
    });
    expect(sessionStore.some((msg) => msg.content === "Hello back")).toBe(true);
  });
});
