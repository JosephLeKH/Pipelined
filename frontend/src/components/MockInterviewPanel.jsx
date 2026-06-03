/** Mock interview chat panel with end-session debrief. */

import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import Send from "lucide-react/dist/esm/icons/send";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useMockInterview } from "../hooks/useMockInterview";
import { CARD_BASE, INPUT_BASE } from "../lib/designTokens";
import AiSection from "./AiSection";
import { Button } from "./ui/button";

function ChatBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-md bg-brand-500 text-white"
            : "rounded-bl-md border border-border-1 bg-white text-foreground dark:bg-gray-800"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start" aria-live="polite" aria-label="Interviewer is typing">
      <div className="flex items-center gap-1.5 rounded-xl border border-border-1 bg-surface-1 px-3 py-2.5">
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-500 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-500 [animation-delay:200ms]" />
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-500 [animation-delay:400ms]" />
      </div>
    </div>
  );
}

function DebriefCard({ debrief }) {
  return (
    <div className={`${CARD_BASE} border-l-4 border-brand-500 bg-brand-50/60 p-4 dark:bg-brand-900/20`}>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
        Debrief
      </p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{debrief}</p>
    </div>
  );
}

export function MockInterviewPanel({ applicationId, application, interviewRound = null }) {
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
  const [viewingSaved, setViewingSaved] = useState(false);
  const [isGeneratingDebrief, setIsGeneratingDebrief] = useState(false);
  const listRef = useRef(null);

  const savedSession = application?.mock_interview;
  const hasSavedSession = savedSession?.debrief && savedSession?.transcript?.length > 0;

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isStreaming, debrief]);

  useEffect(() => {
    if (status === STATUS.DEBRIEF && isGeneratingDebrief) {
      setIsGeneratingDebrief(false);
      toast.success("Session saved — view debrief below");
    }
  }, [status, isGeneratingDebrief]);

  const roundLabel = interviewRound
    ? interviewRound.replace("_", " ")
    : "general";

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = draft;
    setDraft("");
    await sendAnswer(text);
  };

  const handleEndSession = async () => {
    setIsGeneratingDebrief(true);
    await endSession();
  };

  if (status === STATUS.IDLE && messages.length === 0 && !debrief) {
    return (
      <AiSection title="Mock Interview" icon={MessageSquare} id="mock-interview">
        <p className="text-xs text-muted-foreground">Based on the role, job description, and interview prep notes</p>
        {hasSavedSession && !viewingSaved && (
          <div className="mb-3 space-y-2">
            <p className="text-xs font-medium text-text-1">Last session saved</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewingSaved(true)}
              className="w-full"
            >
              View saved session
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground leading-relaxed">
          Practice with an AI interviewer tailored to your {roundLabel} round. Up to {maxTurns} turns.
        </p>
        <Button onClick={startSession} size="sm" className="w-full gap-2 sm:w-auto" disabled={isStreaming}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Start Mock Interview
        </Button>
      </AiSection>
    );
  }

  if (viewingSaved && hasSavedSession) {
    return (
      <AiSection title="Mock Interview" icon={MessageSquare} id="mock-interview-saved">
        <div className="mb-3 text-xs text-muted-foreground">
          <p className="font-medium text-text-1 mb-1">Last session</p>
          {savedSession.completed_at && (
            <p className="text-text-2">
              {new Date(savedSession.completed_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <div ref={listRef} className="flex max-h-64 flex-col gap-2 overflow-y-auto mb-3">
          {savedSession.transcript.map((turn, idx) => (
            <ChatBubble key={idx} message={turn} />
          ))}
          {savedSession.debrief && <DebriefCard debrief={savedSession.debrief} />}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setViewingSaved(false);
            reset();
          }}
          className="w-full sm:w-auto"
        >
          Start new session
        </Button>
      </AiSection>
    );
  }

  return (
    <AiSection
      title="Mock Interview"
      icon={MessageSquare}
      id="mock-interview-active"
      headerExtra={
        <span className="text-[0.6875rem] text-muted-foreground">
          Turn {turnCount}/{maxTurns}
        </span>
      }
    >
      <div ref={listRef} className="flex max-h-64 flex-col gap-2 overflow-y-auto">
        {messages.map((message, index) => (
          <ChatBubble key={message.id ?? `${message.role}-${index}`} message={message} />
        ))}
        {isStreaming && <TypingIndicator />}
        {debrief && <DebriefCard debrief={debrief} />}
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm text-destructive">{errorMessage}</p>
      )}

      {status !== STATUS.DEBRIEF && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-border-1 pt-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type your answer…"
              disabled={isStreaming || turnCount >= maxTurns}
              className={INPUT_BASE}
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
              onClick={handleEndSession}
              disabled={isStreaming || messages.length === 0 || isGeneratingDebrief}
              className="flex items-center gap-1"
            >
              {isGeneratingDebrief && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {isGeneratingDebrief ? "Generating debrief…" : "End session & debrief"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={isStreaming || isGeneratingDebrief}>
              Reset
            </Button>
          </div>
        </form>
      )}

      {status === STATUS.DEBRIEF && (
        <Button type="button" size="sm" onClick={reset} className="w-full sm:w-auto">
          Start new session
        </Button>
      )}
    </AiSection>
  );
}
