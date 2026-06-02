/** Linear-style inline filter row for the application pipeline dashboard. */

import SearchIcon from "lucide-react/dist/esm/icons/search";
import { useTags } from "../hooks/useApplications";
import {
  datePresetLabel,
  DATE_PRESET_OPTIONS,
  useFilterBarParams,
} from "../hooks/useFilterBarParams";
import { Input } from "./ui/input";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import {
  MultiSelectFilterDropdown,
  SingleSelectFilterDropdown,
} from "./FilterBarDropdown";
import { SavedViewsDropdown } from "./FilterBarSavedViews";
import {
  STAGE_COLORS,
  COMPANY_TYPE_OPTIONS,
  REMOTE_STATUS_OPTIONS,
} from "../lib/constants";

const STAGE_OPTIONS = Object.keys(STAGE_COLORS);

function ArchivedBanner() {
  return (
    <div
      role="status"
      className="mb-2 flex items-center gap-2 rounded-md border border-border-1 bg-surface-1 px-3 py-1.5 text-xs text-text-1"
    >
      <span className="font-medium">Viewing archived applications.</span>
      <span className="text-text-3">Clear filters to return to active view.</span>
    </div>
  );
}

function FilterBar() {
  const { data: tagsData } = useTags();
  const {
    stages,
    companyTypes,
    remoteStatuses,
    selectedTags,
    includeArchived,
    searchValue,
    handleSearchChange,
    toggleMulti,
    applyDatePreset,
    toggleArchived,
    clearAll,
    currentFilters,
    activeFilterCount,
    datePreset,
  } = useFilterBarParams();

  const filterSummary =
    activeFilterCount === 0
      ? "No filters active"
      : `${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""} active`;

  return (
    <div
      role="region"
      aria-label="Filter Controls"
      className="sticky top-[calc(2.75rem+3.5rem)] z-10 border-b border-border-1 bg-surface-0/90 px-4 py-2 backdrop-blur motion-reduce:backdrop-blur-none"
    >
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {filterSummary}
      </span>
      {includeArchived && <ArchivedBanner />}
      <div className="flex min-h-7 flex-nowrap items-center gap-y-2 gap-x-1 overflow-x-auto md:flex-wrap md:overflow-visible">
        <MultiSelectFilterDropdown
          label="Stage"
          paramKey="stage"
          options={STAGE_OPTIONS}
          selected={stages}
          onToggle={toggleMulti}
        />
        <MultiSelectFilterDropdown
          label="Company"
          paramKey="company_type"
          options={COMPANY_TYPE_OPTIONS}
          selected={companyTypes}
          onToggle={toggleMulti}
        />
        <MultiSelectFilterDropdown
          label="Remote"
          paramKey="remote_status"
          options={REMOTE_STATUS_OPTIONS}
          selected={remoteStatuses}
          onToggle={toggleMulti}
        />
        <SingleSelectFilterDropdown
          label="Updated"
          displayValue={datePresetLabel(datePreset)}
          isActive={datePreset !== "all"}
        >
          <DropdownMenuLabel>Updated</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {DATE_PRESET_OPTIONS.map(({ id, label }) => (
            <DropdownMenuItem key={id} onSelect={() => applyDatePreset(id)}>
              {label}
              {datePreset === id && (
                <span className="ml-auto text-[0.625rem] text-brand-600">●</span>
              )}
            </DropdownMenuItem>
          ))}
        </SingleSelectFilterDropdown>
        {tagsData?.tags?.length > 0 && (
          <MultiSelectFilterDropdown
            label="Tags"
            paramKey="tags"
            options={tagsData.tags.map((t) => t.name)}
            selected={selectedTags}
            onToggle={toggleMulti}
          />
        )}
        <SingleSelectFilterDropdown
          label="Archive"
          displayValue={includeArchived ? "Archived" : "Active only"}
          isActive={includeArchived}
        >
          <DropdownMenuCheckboxItem
            checked={includeArchived}
            onCheckedChange={toggleArchived}
            onSelect={(e) => e.preventDefault()}
          >
            Show archived
          </DropdownMenuCheckboxItem>
        </SingleSelectFilterDropdown>
        <SavedViewsDropdown
          currentFilters={currentFilters}
          hasActiveFilters={activeFilterCount > 0}
        />
        <div className="relative ml-auto flex min-w-[8rem] shrink-0 items-center">
          <SearchIcon
            className="pointer-events-none absolute left-2 h-3 w-3 text-text-3"
            aria-hidden="true"
          />
          <Input
            type="text"
            aria-label="search applications"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search…"
            className="h-7 border-0 bg-transparent pl-7 pr-2 text-xs shadow-none focus-visible:ring-1"
          />
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            aria-label={`Clear ${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""}`}
            className="shrink-0 text-xs text-text-3 hover:text-brand-700 dark:hover:text-brand-300 motion-reduce:transition-none transition-colors duration-hover ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
          >
            Clear ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  );
}

export default FilterBar;
