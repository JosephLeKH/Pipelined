/** Tests for useMockInterview hook SSE quota error handling. */

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMockInterview } from "./useMockInterview";
import * as mockInterviewApi from "../api/mockInterview";

vi.mock("../api/mockInterview");

describe("useMockInterview — quota error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set errorMessage when quota exceeded error is received", async () => {
    mockInterviewApi.streamMockInterview.mockImplementation((appId, payload, handlers) => {
      setTimeout(() => {
        handlers.onError({ code: "ai_quota_exceeded", message: "AI quota reached — try again in a few minutes." });
      }, 0);
    });

    const { result } = renderHook(() => useMockInterview("app-123"));

    await act(async () => {
      await result.current.startSession();
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe("AI quota reached. Try again in a minute.");
    });
    expect(result.current.status).toBe("error");
  });

  it("should handle rate limit 429 errors with fallback message", async () => {
    mockInterviewApi.streamMockInterview.mockImplementation((appId, payload, handlers) => {
      setTimeout(() => {
        handlers.onError({ status: 429 });
      }, 0);
    });

    const { result } = renderHook(() => useMockInterview("app-123"));

    await act(async () => {
      await result.current.startSession();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
      expect(result.current.errorMessage).toBeTruthy();
    });
  });

  it("should transition to DEBRIEF status when debrief event arrives", async () => {
    mockInterviewApi.streamMockInterview.mockImplementation((appId, payload, handlers) => {
      return new Promise((resolve) => {
        if (payload.end_session) {
          setTimeout(() => {
            handlers.onDebrief({ content: "Here is your debrief..." });
            resolve();
          }, 0);
        } else {
          setTimeout(() => {
            handlers.onDone({ content: "Question", turn_count: 0 });
            resolve();
          }, 0);
        }
      });
    });

    const { result } = renderHook(() => useMockInterview("app-123"));

    await act(async () => {
      await result.current.startSession();
    });

    await act(async () => {
      await result.current.endSession();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("debrief");
      expect(result.current.debrief).toBe("Here is your debrief...");
    });
  });

  it("should track turn count when receiving done event", async () => {
    let callCount = 0;
    mockInterviewApi.streamMockInterview.mockImplementation((appId, payload, handlers) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          handlers.onToken({ content: "Response " });
          const turnNum = callCount++;
          handlers.onDone({ content: "Full response", turn_count: turnNum });
          resolve();
        }, 0);
      });
    });

    const { result } = renderHook(() => useMockInterview("app-123"));

    await act(async () => {
      await result.current.startSession();
    });

    await waitFor(() => {
      expect(result.current.turnCount).toBe(0);
    });

    await act(async () => {
      await result.current.sendAnswer("Test answer");
    });

    await waitFor(() => {
      expect(result.current.turnCount).toBe(1);
    });
  });
});
