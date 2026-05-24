/** Mock interview chat panel with end-session debrief. */

import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import Send from "lucide-react/dist/esm/icons/send";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import { useEffect, useRef, useState } from "react";

import { useMockInterview } from "../hooks/useMockInterview";
import { Button } from "./ui/button";

function ChatBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-muted/40 text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

export function MockInterviewPanel({ applicationId, interviewRound = null }) {
  const {
    messages,
    debrief,
    turnCount,
    status,
    errorMessage,
    startSession,
    sendAnswer,
    endSession,
    reset,
    isStreaming,
    maxTurns,
    STATUS,
  } = useMockInterview(applicationId);
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isStreaming, debrief]);

  const roundLabel = interviewRound
    ? interviewRound.replace("_", " ")
    : "general";

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = draft;
    setDraft("");
    await sendAnswer(text);
  };

  if (status === STATUS.IDLE && messages.length === 0 && !debrief) {
    return (
      <div className="flex flex-col gap-3 rounded-card border border-border bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15">
            <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">Mock Interview</span>
            <span className="text-xs text-muted-foreground leading-relaxed">
              Practice with an AI interviewer tailored to your {roundLabel} round. Up to {maxTurns} turns.
            </span>
          </div>
        </div>
        <Button onClick={startSession} size="sm" className="w-full gap-2" disabled={isStreaming}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Start Mock Interview
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span className="text-xs font-medium text-foreground">Mock Interview</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Turn {turnCount}/{maxTurns}
        </span>
      </div>

      <div ref={listRef} className="flex max-h-64 flex-col gap-2 overflow-y-auto px-3 py-3">
        {messages.map((message, index) => (
          <ChatBubble key={message.id ?? `${message.role}-${index}`} message={message} />
        ))}
        {isStreaming && (
          <p className="text-xs text-muted-foreground">Interviewer is typing…</p>
        )}
        {debrief && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Debrief</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{debrief}</p>
          </div>
        )}
      </div>

      {errorMessage && (
        <p role="alert" className="px-3 text-sm text-destructive">{errorMessage}</p>
      )}

      {status !== STATUS.DEBRIEF && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-border p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type your answer…"
              disabled={isStreaming || turnCount >= maxTurns}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              aria-label="Mock interview answer"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isStreaming || !draft.trim() || turnCount >= maxTurns}
              className="gap-1"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              Send
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={endSession}
              disabled={isStreaming || messages.length === 0}
            >
              End session &amp; debrief
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={isStreaming}>
              Reset
            </Button>
          </div>
        </form>
      )}

      {status === STATUS.DEBRIEF && (
        <div className="border-t border-border p-3">
          <Button type="button" size="sm" onClick={reset} className="w-full">
            Start new session
          </Button>
        </div>
      )}
    </div>
  );
}
