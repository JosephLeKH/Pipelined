/** Search input for job board with debounced URL sync and ⌘K hint (PRD-06 §5). */

import { useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import SearchIcon from "lucide-react/dist/esm/icons/search";

import { JOB_SEARCH_DEBOUNCE_MS } from "../lib/constants";
import { Input } from "./ui/input";

export default function JobSearchInput({ onEnterKey }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef(null);

  const handleChange = useCallback(
    (e) => {
      const val = e.target.value;
      setSearchValue(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const next = new URLSearchParams(searchParams);
        if (val) next.set("q", val);
        else next.delete("q");
        next.set("page", "1");
        setSearchParams(next, { replace: true });
      }, JOB_SEARCH_DEBOUNCE_MS);
    },
    [searchParams, setSearchParams]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onEnterKey?.();
      }
    },
    [onEnterKey]
  );

  return (
    <div className="relative flex h-10 min-w-0 flex-1 items-center">
      <SearchIcon
        className="pointer-events-none absolute left-3 h-4 w-4 text-text-3"
        aria-hidden="true"
      />
      <Input
        type="text"
        aria-label="Search jobs"
        value={searchValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Role, company, description..."
        className="h-10 border-border-1 bg-surface-0 pl-9 pr-14 text-sm text-text-1 shadow-none focus-visible:ring-1 focus-visible:ring-brand-600 dark:focus-visible:ring-brand-500"
      />
      <kbd
        className="pointer-events-none absolute right-3 hidden rounded border border-border-1 bg-surface-1 px-1.5 py-0.5 text-[10px] font-medium text-text-3 sm:inline-block"
        aria-hidden="true"
      >
        ⌘K
      </kbd>
    </div>
  );
}
