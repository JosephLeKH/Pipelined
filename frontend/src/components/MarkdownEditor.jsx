/** Markdown editor with Write/Preview tabs and XSS-safe rendering. */

import { useState, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import HelpCircle from "lucide-react/dist/esm/icons/help-circle";

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

function MarkdownEditor({ id, value, onChange, maxLength, className }) {
  const [activeTab, setActiveTab] = useState(TAB_WRITE);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = value.slice(0, start) + "  " + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  const safeHtml = DOMPurify.sanitize(marked.parse(value ?? ""));

  return (
    <div className={className}>
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 mb-2">
        <div className="flex gap-1" role="tablist">
          {[TAB_WRITE, TAB_PREVIEW].map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs font-medium capitalize transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
                activeTab === tab
                  ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-400"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Help icon with cheatsheet popover */}
        <div className="relative">
          <button
            type="button"
            aria-label="Markdown supported"
            onClick={() => setShowCheatsheet((v) => !v)}
            className="rounded p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:hover:text-gray-300"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
          {showCheatsheet && (
            <div
              role="tooltip"
              className="absolute right-0 top-7 z-50 w-48 rounded-lg border border-gray-200 bg-white p-3 shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                Markdown supported
              </p>
              <ul className="space-y-1">
                {CHEATSHEET_ITEMS.map(({ label, syntax }) => (
                  <li key={label} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    <code className="rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                      {syntax}
                    </code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Write panel — plain textarea so label association (htmlFor) from parent works */}
      {activeTab === TAB_WRITE && (
        <textarea
          ref={textareaRef}
          id={id}
          className="w-full min-h-[120px] resize-y border border-gray-300 bg-white rounded-input px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          data-testid="markdown-write-textarea"
        />
      )}

      {/* Preview panel */}
      {activeTab === TAB_PREVIEW && (
        <div
          aria-label="Markdown preview"
          className="markdown-preview min-h-[120px] rounded-input border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/50"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      )}
    </div>
  );
}

export default MarkdownEditor;
