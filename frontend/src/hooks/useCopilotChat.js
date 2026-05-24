/** React hook for co-pilot streaming chat state. */

import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { streamCopilotChat } from "../api/copilot";
import {
  COPILOT_ERROR_FALLBACK,
  COPILOT_RATE_LIMIT_MESSAGE,
  isAiLimitError,
} from "../lib/aiConstants";
import { executeCopilotAction } from "../lib/copilotActions";

const STATUS = { IDLE: "idle", STREAMING: "streaming", ERROR: "error" };

export function useCopilotChat() {
  const navigate = useNavigate();
  const abortRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [errorMessage, setErrorMessage] = useState(null);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || status === STATUS.STREAMING) return;

    const userMessage = { role: "user", content: trimmed };
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: "assistant", content: "", actions: [] },
    ]);
    setStatus(STATUS.STREAMING);
    setErrorMessage(null);

    const history = messages.map(({ role, content }) => ({ role, content }));
    const controller = new AbortController();
    abortRef.current = controller;

    await streamCopilotChat(
      { message: trimmed, history },
      {
        signal: controller.signal,
        onToken: (data) => {
          const chunk = data?.content ?? "";
          if (!chunk) return;
          setMessages((prev) => prev.map((msg) => (
            msg.id === assistantId
              ? { ...msg, content: `${msg.content}${chunk}` }
              : msg
          )));
        },
        onDone: (data) => {
          setMessages((prev) => prev.map((msg) => (
            msg.id === assistantId
              ? {
                  ...msg,
                  content: data?.content ?? msg.content,
                  actions: data?.actions ?? [],
                }
              : msg
          )));
          setStatus(STATUS.IDLE);
          abortRef.current = null;
        },
        onError: (error) => {
          const fallback = error?.status === 429 ? COPILOT_RATE_LIMIT_MESSAGE : COPILOT_ERROR_FALLBACK;
          const message = isAiLimitError(error) ? COPILOT_RATE_LIMIT_MESSAGE : (error?.message ?? fallback);
          setErrorMessage(message);
          setStatus(STATUS.ERROR);
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantId));
          abortRef.current = null;
        },
      },
    );
  }, [messages, status]);

  const runAction = useCallback((action) => {
    executeCopilotAction(action, navigate);
  }, [navigate]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setStatus(STATUS.IDLE);
    setErrorMessage(null);
  }, []);

  return {
    messages,
    status,
    errorMessage,
    sendMessage,
    runAction,
    reset,
    isStreaming: status === STATUS.STREAMING,
    STATUS,
  };
}
