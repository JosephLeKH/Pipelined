/** Markdown editor with Write/Preview tabs, formatting toolbar, and XSS-safe rendering. */

import { useState, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import HelpCircle from "lucide-react/dist/esm/icons/help-circle";
import Bold from "lucide-react/dist/esm/icons/bold";
import Italic from "lucide-react/dist/esm/icons/italic";
import Heading1 from "lucide-react/dist/esm/icons/heading-1";
import Heading2 from "lucide-react/dist/esm/icons/heading-2";
import List from "lucide-react/dist/esm/icons/list";
import ListOrdered from "lucide-react/dist/esm/icons/list-ordered";
import Code from "lucide-react/dist/esm/icons/code";
import LinkIcon from "lucide-react/dist/esm/icons/link";
import Quote from "lucide-react/dist/esm/icons/quote";

import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

const TAB_WRITE = "write";
const TAB_PREVIEW = "preview";

const TOOLBAR_ACTIONS = [
  { label: "Bold", icon: Bold, wrap: { before: "**", after: "**" }, placeholder: "bold text" },
  { label: "Italic", icon: Italic, wrap: { before: "_", after: "_" }, placeholder: "italic text" },
  { label: "Heading 1", icon: Heading1, wrap: { before: "# ", after: "" }, placeholder: "Heading" },
  { label: "Heading 2", icon: Heading2, wrap: { before: "## ", after: "" }, placeholder: "Heading" },
  { label: "Bulleted list", icon: List, wrap: { before: "- ", after: "" }, placeholder: "list item" },
  { label: "Numbered list", icon: ListOrdered, wrap: { before: "1. ", after: "" }, placeholder: "list item" },
  { label: "Inline code", icon: Code, wrap: { before: "`", after: "`" }, placeholder: "code" },
  { label: "Insert link", icon: LinkIcon, wrap: { before: "[", after: "](url)" }, placeholder: "link text" },
  { label: "Blockquote", icon: Quote, wrap: { before: "> ", after: "" }, placeholder: "quoted text" },
];

const CHEATSHEET_ITEMS = [
  { label: "Bold", syntax: "**bold**" },
  { label: "Italic", syntax: "_italic_" },
  { label: "Heading", syntax: "# Heading" },
  { label: "List", syntax: "- item" },
  { label: "Code", syntax: "`code`" },
  { label: "Link", syntax: "[text](url)" },
];

function applyWrap(value, selStart, selEnd, action) {
  const { before, after } = action.wrap;
  const selected = value.slice(selStart, selEnd) || action.placeholder;
  const newValue = value.slice(0, selStart) + before + selected + after + value.slice(selEnd);
  const cursorStart = selStart + before.length;
  return { newValue, cursorStart, cursorEnd: cursorStart + selected.length };
}

function MarkdownToolbar({ textareaRef, value, onChange }) {
  const handleAction = (action) => {
    const el = textareaRef.current;
    if (!el) return;
    const { newValue, cursorStart, cursorEnd } = applyWrap(value, el.selectionStart, el.selectionEnd, action);
    onChange(newValue);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = cursorStart;
      el.selectionEnd = cursorEnd;
    });
  };

  return (
    <div className="flex flex-wrap gap-0.5 border-b border-border pb-1 mb-1" role="toolbar" aria-label="Formatting options">
      {TOOLBAR_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Button key={action.label} type="button" variant="ghost" size="icon" aria-label={action.label} className="h-7 w-7" onClick={() => handleAction(action)}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}

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
            className={`px-3 py-1 text-xs font-medium capitalize transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >{tab}</button>
        ))}
      </div>
      <div className="relative">
        <Button type="button" variant="ghost" size="icon" aria-label="Markdown supported" onClick={() => setShowCheatsheet((v) => !v)} className="h-7 w-7">
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
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
        <>
          <MarkdownToolbar textareaRef={textareaRef} value={value ?? ""} onChange={onChange} />
          <Textarea ref={textareaRef} id={id}
          className="min-h-[120px] resize-y rounded-input bg-background text-foreground"
          value={value ?? ""} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown} maxLength={maxLength} data-testid="markdown-write-textarea"
          />
        </>
      )}
      {activeTab === TAB_PREVIEW && (
        // Safe: safeHtml is DOMPurify-sanitized above
        <div aria-label="Markdown preview" className="markdown-preview min-h-[120px] rounded-input border border-border bg-muted px-3 py-2 text-sm" dangerouslySetInnerHTML={{ __html: safeHtml }} />
      )}
    </div>
  );
}

export default MarkdownEditor;
