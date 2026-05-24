/** React hook for mock interview chat state. */

import { useCallback, useRef, useState } from "react";

import { streamMockInterview } from "../api/mockInterview";
import { COPILOT_ERROR_FALLBACK, COPILOT_RATE_LIMIT_MESSAGE, isAiLimitError } from "../lib/aiConstants";

const STATUS = {
  IDLE: "idle",
  STREAMING: "streaming",
  DEBRIEF: "debrief",
  ERROR: "error",
};

const MAX_TURNS = 10;

export function useMockInterview(applicationId) {
  const abortRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [errorMessage, setErrorMessage] = useState(null);
  const [turnCount, setTurnCount] = useState(0);
  const [debrief, setDebrief] = useState(null);

  const streamTurn = useCallback(async (payload) => {
    const assistantId = `assistant-${Date.now()}`;
    if (!payload.end_session) {
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    }
    setStatus(STATUS.STREAMING);
    setErrorMessage(null);

    const controller = new AbortController();
    abortRef.current = controller;

    await streamMockInterview(applicationId, payload, {
      signal: controller.signal,
      onToken: (data) => {
        const chunk = data?.content ?? "";
        if (!chunk) return;
        setMessages((prev) => prev.map((msg) => (
          msg.id === assistantId ? { ...msg, content: `${msg.content}${chunk}` } : msg
        )));
      },
      onDone: (data) => {
        if (data?.is_debrief) {
          setDebrief(data?.content ?? "");
          setStatus(STATUS.DEBRIEF);
        } else {
          setTurnCount(data?.turn_count ?? 0);
          setStatus(STATUS.IDLE);
        }
        abortRef.current = null;
      },
      onError: (error) => {
        const fallback = error?.status === 429 ? COPILOT_RATE_LIMIT_MESSAGE : COPILOT_ERROR_FALLBACK;
        const message = isAiLimitError(error) ? COPILOT_RATE_LIMIT_MESSAGE : (error?.message ?? fallback);
        setErrorMessage(message);
        setStatus(STATUS.ERROR);
        if (!payload.end_session) {
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantId));
        }
        abortRef.current = null;
      },
    });
  }, [applicationId]);

  const startSession = useCallback(async () => {
    setMessages([]);
    setDebrief(null);
    setTurnCount(0);
    await streamTurn({ message: "", history: [] });
  }, [streamTurn]);

  const sendAnswer = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || status === STATUS.STREAMING || turnCount >= MAX_TURNS) return;

    const userMessage = { id: `user-${Date.now()}`, role: "user", content: trimmed };
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, userMessage]);
    await streamTurn({ message: trimmed, history });
  }, [messages, status, streamTurn, turnCount]);

  const endSession = useCallback(async () => {
    if (!messages.length || status === STATUS.STREAMING) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    await streamTurn({ message: "", history, end_session: true });
  }, [messages, status, streamTurn]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setDebrief(null);
    setTurnCount(0);
    setStatus(STATUS.IDLE);
    setErrorMessage(null);
  }, []);

  return {
    messages,
    debrief,
    turnCount,
    status,
    errorMessage,
    startSession,
    sendAnswer,
    endSession,
    reset,
    isStreaming: status === STATUS.STREAMING,
    maxTurns: MAX_TURNS,
    STATUS,
  };
}
