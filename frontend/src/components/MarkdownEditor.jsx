/** Markdown editor with Write/Preview tabs and XSS-safe rendering. */

import { useState, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import HelpCircle from "lucide-react/dist/esm/icons/help-circle";

import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

const TAB_WRITE = "write";
const TAB_PREVIEW = "preview";

const CHEATSHEET_ITEMS = [
  { label: "Bold", syntax: "**bold**" },
  { label: "Italic", syntax: "_italic_" },
  { label: "Heading", syntax: "# Heading" },
  { label: "List", syntax: "- item" },
  { label: "Code", syntax: "`code`" },
  { label: "Link", syntax: "[text](url)" },
];

function MarkdownCheatsheet() {
  return (
    <div role="tooltip" className="absolute right-0 top-7 z-50 w-48 rounded-lg border border-border bg-card p-3 shadow-md">
      <p className="mb-2 text-xs font-semibold text-foreground">Markdown supported</p>
      <ul className="space-y-1">
        {CHEATSHEET_ITEMS.map(({ label, syntax }) => (
          <li key={label} className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">{syntax}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MarkdownTabBar({ activeTab, onTabChange }) {
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  return (
    <div className="flex items-center justify-between border-b border-border mb-2">
      <div className="flex gap-1" role="tablist">
        {[TAB_WRITE, TAB_PREVIEW].map((tab) => (
          <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => onTabChange(tab)}
            className={`px-3 py-1 text-xs font-medium capitalize transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 ${activeTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >{tab}</button>
        ))}
      </div>
      <div className="relative">
        <Button type="button" variant="ghost" size="icon" aria-label="Markdown supported" onClick={() => setShowCheatsheet((v) => !v)} className="h-7 w-7">
          <HelpCircle className="h-3.5 w-3.5" />
        </Button>
        {showCheatsheet && <MarkdownCheatsheet />}
      </div>
    </div>
  );
}

function MarkdownEditor({ id, value, onChange, maxLength, className }) {
  const [activeTab, setActiveTab] = useState(TAB_WRITE);
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    onChange(value.slice(0, start) + "  " + value.slice(end));
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 2; });
  };

  // Safe: DOMPurify strips all malicious HTML before rendering
  const safeHtml = DOMPurify.sanitize(marked.parse(value ?? ""));

  return (
    <div className={className}>
      <MarkdownTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === TAB_WRITE && (
        <Textarea ref={textareaRef} id={id}
          className="min-h-[120px] resize-y rounded-input bg-background text-foreground"
          value={value ?? ""} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown} maxLength={maxLength} data-testid="markdown-write-textarea"
        />
      )}
      {activeTab === TAB_PREVIEW && (
        // Safe: safeHtml is DOMPurify-sanitized above
        <div aria-label="Markdown preview" className="markdown-preview min-h-[120px] rounded-input border border-border bg-muted px-3 py-2 text-sm" dangerouslySetInnerHTML={{ __html: safeHtml }} />
      )}
    </div>
  );
}

export default MarkdownEditor;
