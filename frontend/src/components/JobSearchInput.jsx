/** Search input for job board with debounced URL sync. */

import { useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import SearchIcon from "lucide-react/dist/esm/icons/search";

import { SEARCH_DEBOUNCE_MS } from "../lib/constants";

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
    <div className="flex items-center rounded-lg bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
      <div className="relative flex items-center">
        <SearchIcon className="absolute left-2 h-4 w-4 text-gray-400" aria-hidden="true" />
        <input
          type="text"
          aria-label="search jobs"
          value={searchValue}
          onChange={handleChange}
          placeholder="Role, company, description..."
          className="rounded border border-gray-300 pl-8 pr-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400"
        />
      </div>
    </div>
  );
}
