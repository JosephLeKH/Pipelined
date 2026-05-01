/** Floating feedback button and NPS survey banner for authenticated pages. */

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import X from "lucide-react/dist/esm/icons/x";
import Send from "lucide-react/dist/esm/icons/send";

import { trackEvent } from "../lib/analytics";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../hooks/useFeedback";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const FEEDBACK_MESSAGE_MAX = 500;
const FEEDBACK_CATEGORIES = ["Bug", "Feature Request", "General"];
const NPS_DISMISSED_KEY = "pipelined_nps_dismissed";
const NPS_DAYS_THRESHOLD = 7;
const NPS_SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const TEXTAREA_CLS = "border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/20 focus:outline-none transition-colors text-sm px-3 py-2 font-sans w-full";

function NPSBannerView({ onScore, onDismiss }) {
  return (
    <div
      role="banner"
      aria-label="NPS survey"
      className="fixed top-0 inset-x-0 z-40 flex items-center justify-between gap-4 bg-card px-4 py-3 shadow-md border-b border-border"
    >
      <p className="text-sm font-medium text-foreground shrink-0">
        How likely are you to recommend Pipelined to a friend?
      </p>
      <div className="flex items-center gap-1">
        {NPS_SCORES.map((score) => (
          <Button
            key={score}
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onScore(score)}
            className="h-8 w-8 text-xs font-semibold text-muted-foreground hover:bg-primary hover:text-primary-foreground"
          >
            {score}
          </Button>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDismiss}
        aria-label="Dismiss survey"
        className="shrink-0 h-7 w-7"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function NPSBanner({ user, onDismiss, onSubmit }) {
  const createdAt = user?.created_at ? new Date(user.created_at) : null;
  const daysSinceJoin = createdAt
    ? (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  if (localStorage.getItem(NPS_DISMISSED_KEY) || daysSinceJoin < NPS_DAYS_THRESHOLD) return null;

  const handleScore = async (score) => {
    localStorage.setItem(NPS_DISMISSED_KEY, "1");
    trackEvent("nps_responded", { score });
    try {
      await onSubmit({ message: String(score), email: user?.email ?? null, category: "nps", page: window.location.pathname });
    } catch {
      // silently ignore — NPS is best-effort
    }
    onDismiss();
    toast.success("Thanks for your feedback!");
  };

  const handleDismiss = () => { localStorage.setItem(NPS_DISMISSED_KEY, "1"); onDismiss(); };
  return <NPSBannerView onScore={handleScore} onDismiss={handleDismiss} />;
}

function useFeedbackForm(user, page, onClose, onSubmit) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [category, setCategory] = useState("General");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ message: message.trim(), email: email.trim() || null, category, page });
      trackEvent("feedback_submitted", { category });
      onClose();
      toast.success("Thanks for your feedback!");
    } catch {
      toast.error("Failed to send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [message, email, category, page, onClose, onSubmit]);

  return { message, setMessage, email, setEmail, category, setCategory, submitting, textareaRef, handleSubmit };
}

function FeedbackFormFields({ category, setCategory, message, setMessage, email, setEmail, textareaRef, submitting }) {
  return (
    <>
      <div>
        <label htmlFor="fb-category" className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="fb-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FEEDBACK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label htmlFor="fb-message" className="mb-1 block text-xs font-medium text-muted-foreground">Message</label>
        <textarea id="fb-message" ref={textareaRef} rows={4} maxLength={FEEDBACK_MESSAGE_MAX} value={message}
          onChange={(e) => setMessage(e.target.value)} placeholder="Describe your feedback…"
          className={`${TEXTAREA_CLS} resize-none`}
        />
        <p className="mt-0.5 text-right text-xs text-muted-foreground">{message.length}/{FEEDBACK_MESSAGE_MAX}</p>
      </div>
      <div>
        <label htmlFor="fb-email" className="mb-1 block text-xs font-medium text-muted-foreground">Email (optional)</label>
        <Input id="fb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <Button type="submit" disabled={submitting || !message.trim()} className="flex items-center justify-center gap-2 w-full">
        <Send className="h-3.5 w-3.5" aria-hidden="true" />
        {submitting ? "Sending…" : "Send"}
      </Button>
    </>
  );
}

function FeedbackPopover({ user, page, onClose, onSubmit }) {
  const { message, setMessage, email, setEmail, category, setCategory, submitting, textareaRef, handleSubmit } = useFeedbackForm(user, page, onClose, onSubmit);

  useEffect(() => {
    function onKeyDown(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send feedback"
      className="rounded-xl bg-card border border-border absolute bottom-14 right-0 w-80 p-4 animate-slideInUp shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-foreground">How can we improve?</h2>
        <Button type="button" variant="ghost" onClick={onClose} aria-label="Close" className="p-1 h-auto">
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <FeedbackFormFields
          category={category} setCategory={setCategory}
          message={message} setMessage={setMessage}
          email={email} setEmail={setEmail}
          textareaRef={textareaRef} submitting={submitting}
        />
      </form>
    </div>
  );
}

function FeedbackWidget() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [npsVisible, setNpsVisible] = useState(true);
  const { submit } = useFeedback();

  const handleClose = useCallback(() => setOpen(false), []);

  if (!user) return null;

  return (
    <>
      {npsVisible && <NPSBanner user={user} onDismiss={() => setNpsVisible(false)} onSubmit={submit} />}
      <div className="fixed bottom-6 right-6 z-30">
        {open && (
          <FeedbackPopover user={user} page={pathname} onClose={handleClose} onSubmit={submit} />
        )}
        <Button
          type="button"
          size="icon"
          onClick={() => setOpen((v) => !v)}
          aria-label="Send feedback"
          title="Send feedback"
          className="h-10 w-10 rounded-full shadow-sm active:scale-95"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
    </>
  );
}

export default FeedbackWidget;
