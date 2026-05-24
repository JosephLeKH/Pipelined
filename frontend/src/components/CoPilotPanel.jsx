/** Co-pilot slide-over chat panel — streaming, suggest-only. */

import { useEffect, useRef, useState } from "react";

import Bot from "lucide-react/dist/esm/icons/bot";
import Send from "lucide-react/dist/esm/icons/send";
import X from "lucide-react/dist/esm/icons/x";

import { useCopilotChat } from "../hooks/useCopilotChat";
import {
  COPILOT_PLACEHOLDER,
  COPILOT_SUBTITLE,
  COPILOT_SUGGESTED_PROMPTS,
  COPILOT_TITLE,
} from "../lib/aiConstants";
import {
  BUTTON_GHOST,
  BUTTON_PRIMARY,
  CARD_BASE,
  INPUT_BASE,
  TAG,
} from "../lib/designTokens";

function TypingIndicator() {
  return (
    <div className="flex justify-start" aria-live="polite" aria-label="Co-pilot is typing">
      <div className="flex items-center gap-1.5 rounded-xl border border-border-default bg-surface-secondary px-3 py-2.5">
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-500 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-500 [animation-delay:200ms]" />
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-500 [animation-delay:400ms]" />
      </div>
    </div>
  );
}

function ChatMessage({ message, onAction }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-md bg-brand-500 text-white"
            : "rounded-bl-md border border-border-default bg-white text-foreground dark:bg-gray-800"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && message.actions?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.actions.map((action) => (
              <button
                key={`${action.path}-${action.label}`}
                type="button"
                onClick={() => onAction(action)}
                className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-medium text-brand-800 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestedPrompts({ onSelect, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COPILOT_SUGGESTED_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
          className={`${TAG} cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}

function CoPilotPanel({ open, onClose }) {
  const { messages, errorMessage, sendMessage, runAction, isStreaming } = useCopilotChat();
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = draft;
    setDraft("");
    await sendMessage(text);
  };

  const handlePromptSelect = async (prompt) => {
    setDraft("");
    await sendMessage(prompt);
  };

  return (
    <div className="fixed inset-0 z-50 flex sm:justify-end">
      <button
        type="button"
        aria-label="Close co-pilot"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        aria-label="Co-pilot chat"
        className={`relative flex h-full w-full flex-col animate-slide-in-right sm:max-w-md ${CARD_BASE} shadow-modal`}
      >
        <header className="flex items-start justify-between border-b border-border px-4 py-3">
          <div className="flex items-start gap-2">
            <Bot className="mt-0.5 h-5 w-5 text-brand-600" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">{COPILOT_TITLE}</h2>
              <p className="text-xs text-muted-foreground">{COPILOT_SUBTITLE}</p>
            </div>
          </div>
          <button type="button" aria-label="Close panel" onClick={onClose} className={BUTTON_GHOST}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ask what to prioritize today, which applications need follow-up, or where to prep next.
              </p>
              <SuggestedPrompts onSelect={handlePromptSelect} disabled={isStreaming} />
            </div>
          )}
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id ?? `${message.role}-${index}`}
              message={message}
              onAction={runAction}
            />
          ))}
          {isStreaming && <TypingIndicator />}
        </div>

        {errorMessage && (
          <p role="alert" className="px-4 pb-2 text-sm text-destructive">{errorMessage}</p>
        )}

        <form onSubmit={handleSubmit} className="border-t border-border p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={COPILOT_PLACEHOLDER}
              disabled={isStreaming}
              className={INPUT_BASE}
              aria-label="Co-pilot message"
            />
            <button
              type="submit"
              disabled={isStreaming || !draft.trim()}
              className={`${BUTTON_PRIMARY} inline-flex items-center gap-1 px-3`}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Send
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default CoPilotPanel;
