/** Search input for job board with debounced URL sync. */

import { useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import SearchIcon from "lucide-react/dist/esm/icons/search";

import { SEARCH_DEBOUNCE_MS } from "../lib/constants";
import { INPUT_BASE } from "../lib/designTokens";

export default function JobSearchInput() {
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
        if (val) {
          next.set("q", val);
        } else {
          next.delete("q");
        }
        next.set("page", "1");
        setSearchParams(next, { replace: true });
      }, SEARCH_DEBOUNCE_MS);
    },
    [searchParams, setSearchParams]
  );

  return (
    <div className="relative flex items-center">
      <SearchIcon className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400" aria-hidden="true" />
      <input
        type="text"
        aria-label="search jobs"
        value={searchValue}
        onChange={handleChange}
        placeholder="Role, company, description..."
        className={`pl-9 ${INPUT_BASE}`}
      />
    </div>
  );
}
