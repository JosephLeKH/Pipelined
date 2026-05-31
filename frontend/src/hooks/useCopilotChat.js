/** React hook for co-pilot streaming chat state. */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { getCopilotSession, saveCopilotSession, streamCopilotChat } from "../api/copilot";
import {
  COPILOT_ERROR_FALLBACK,
  COPILOT_RATE_LIMIT_MESSAGE,
  isAiLimitError,
} from "../lib/aiConstants";
import { executeCopilotAction } from "../lib/copilotActions";

const STATUS = { IDLE: "idle", STREAMING: "streaming", ERROR: "error" };

function toSessionPayload(messages) {
  return messages.map(({ role, content, actions = [] }) => ({
    role,
    content,
    actions,
  }));
}

function fromSessionMessages(messages) {
  return messages.map((msg, index) => ({
    ...(msg.role === "assistant" ? { id: `assistant-${index}` } : {}),
    role: msg.role,
    content: msg.content,
    actions: msg.actions ?? [],
    reasoningSteps: msg.reasoningSteps ?? [],
  }));
}

export function useCopilotChat() {
  const navigate = useNavigate();
  const abortRef = useRef(null);
  const persistToastRef = useRef(false);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [errorMessage, setErrorMessage] = useState(null);
  const [hydrationFailed, setHydrationFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await getCopilotSession();
        if (!cancelled && session?.messages?.length) {
          setMessages(fromSessionMessages(session.messages));
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to hydrate copilot session:", err);
          setHydrationFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistSession = useCallback((nextMessages) => {
    saveCopilotSession(toSessionPayload(nextMessages)).catch((err) => {
      console.error("Failed to persist copilot session:", err);
      if (!persistToastRef.current) {
        persistToastRef.current = true;
        toast.error("Couldn't save chat — refresh may lose history.");
      }
    });
  }, []);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || status === STATUS.STREAMING) return;

    const userMessage = { role: "user", content: trimmed };
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: "assistant", content: "", actions: [], reasoningSteps: [] },
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
        onStep: (data) => {
          const step = data?.content ?? "";
          if (!step) return;
          setMessages((prev) => prev.map((msg) => (
            msg.id === assistantId
              ? { ...msg, reasoningSteps: [...(msg.reasoningSteps ?? []), step] }
              : msg
          )));
        },
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
          setMessages((prev) => {
            const updated = prev.map((msg) => (
              msg.id === assistantId
                ? {
                    ...msg,
                    content: data?.content ?? msg.content,
                    actions: data?.actions ?? [],
                  }
                : msg
            ));
            persistSession(updated);
            return updated;
          });
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
  }, [messages, persistSession, status]);

  const runAction = useCallback((action) => {
    executeCopilotAction(action, navigate);
  }, [navigate]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setStatus(STATUS.IDLE);
    setErrorMessage(null);
    persistSession([]);
  }, [persistSession]);

  return {
    messages,
    status,
    errorMessage,
    sendMessage,
    runAction,
    reset,
    isStreaming: status === STATUS.STREAMING,
    hydrationFailed,
    STATUS,
  };
}
