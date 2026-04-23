/** Combobox tag input with chip display, predefined suggestions, and keyboard navigation. */

import { useEffect, useRef, useState } from "react";

import XIcon from "lucide-react/dist/esm/icons/x";

import { useTags } from "../hooks/useApplications";
import { DROPDOWN_CLOSE_DELAY_MS } from "../lib/constants";

const PREDEFINED_TAGS = [
  "referral",
  "dream company",
  "remote",
  "hybrid",
  "in-office",
  "startup",
  "faang",
  "contract",
  "internship",
  "return offer",
];

const MAX_SUGGESTIONS = 8;

/**
 * TagInput combobox.
 *
 * Props:
 *   value       – string[] of current tags
 *   onChange    – (tags: string[]) => void
 *   placeholder – string  (optional)
 *   id          – string  (optional, for htmlFor association)
 */
function TagInput({ value = [], onChange, placeholder = "Add a tag…", id }) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const { data: tagsData } = useTags();
  const userTags = tagsData?.tags?.map((t) => t.name) ?? [];

  const allSuggestions = [
    ...new Set([...PREDEFINED_TAGS, ...userTags]),
  ].filter((t) => !value.includes(t));

  const filtered = inputValue.trim()
    ? allSuggestions.filter((t) =>
        t.toLowerCase().includes(inputValue.trim().toLowerCase())
      )
    : allSuggestions;

  const suggestions = filtered.slice(0, MAX_SUGGESTIONS);

  function addTag(tag) {
    const normalized = tag.trim().toLowerCase();
    if (!normalized || value.includes(normalized)) return;
    onChange([...value, normalized]);
    setInputValue("");
    setActiveIndex(-1);
  }

  function removeTag(tag) {
    onChange(value.filter((t) => t !== tag));
  }

  function removeLastTag() {
    if (value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        addTag(suggestions[activeIndex]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Backspace" && inputValue === "") {
      removeLastTag();
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex];
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  return (
    <div className="relative">
      <div
        className="flex min-h-[38px] flex-wrap gap-1.5 rounded-input border border-gray-300 bg-white px-2.5 py-1.5 text-sm transition-colors focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="rounded-full hover:bg-brand-200 dark:hover:bg-brand-800 p-0.5"
            >
              <XIcon className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), DROPDOWN_CLOSE_DELAY_MS)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[120px] flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
          role="combobox"
          aria-haspopup="listbox"
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-input border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {suggestions.map((tag, i) => (
            <li
              key={tag}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => { e.preventDefault(); addTag(tag); }}
              className={`cursor-pointer px-3 py-1.5 text-sm ${
                i === activeIndex
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TagInput;
