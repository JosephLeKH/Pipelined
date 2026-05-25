/** Job board filter bar: horizontal scrollable filter chips. */

import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import {
  ROLE_TYPE_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  REMOTE_STATUS_OPTIONS,
} from "../lib/constants";

const FILTER_GROUPS = [
  { label: "Role", paramKey: "role_type", options: ROLE_TYPE_OPTIONS },
  { label: "Experience", paramKey: "experience_level", options: EXPERIENCE_LEVEL_OPTIONS },
  { label: "Remote", paramKey: "remote_status", options: REMOTE_STATUS_OPTIONS },
];

function FilterChip({ label, active, onClick }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize h-auto",
        active
          ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70"
      )}
    >
      {label.replace(/_/g, " ")}
    </Button>
  );
}

export function JobFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const toggleFilter = useCallback(
    (paramKey, value) => {
      const next = new URLSearchParams(searchParams);
      if (searchParams.get(paramKey) === value) {
        next.delete(paramKey);
      } else {
        next.set(paramKey, value);
      }
      next.set("page", "1");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-1"
      aria-label="Filter chips"
    >
      {FILTER_GROUPS.map(({ label: groupLabel, paramKey, options }) => (
        <div key={paramKey} className="flex shrink-0 items-center gap-1.5">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">{groupLabel}:</span>
          {options.map((opt) => (
            <FilterChip
              key={opt}
              label={opt}
              active={searchParams.get(paramKey) === opt}
              onClick={() => toggleFilter(paramKey, opt)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
