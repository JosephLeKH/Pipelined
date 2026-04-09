/** Job board filter bar: category selects and salary range inputs. */

import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import {
  ROLE_TYPE_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  REMOTE_STATUS_OPTIONS,
  COMPANY_TYPE_OPTIONS,
  SALARY_FILTER_MIN,
  SALARY_FILTER_MAX,
  SALARY_FILTER_STEP,
} from "../lib/constants";

function SelectFilter({ label, paramKey, options }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(paramKey) ?? "";

  const handleChange = useCallback(
    (e) => {
      const next = new URLSearchParams(searchParams);
      if (e.target.value) {
        next.set(paramKey, e.target.value);
      } else {
        next.delete(paramKey);
      }
      next.set("page", "1");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, paramKey]
  );

  return (
    <label className="flex flex-col gap-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
      {label}
      <select
        value={value}
        onChange={handleChange}
        className="mt-0.5 rounded border border-gray-300 px-2 py-1.5 text-sm font-normal capitalize text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        aria-label={label}
      >
        <option value="">Any</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function SalaryInput({ label, paramKey }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(paramKey) ?? "";

  const handleChange = useCallback(
    (e) => {
      const next = new URLSearchParams(searchParams);
      if (e.target.value) {
        next.set(paramKey, e.target.value);
      } else {
        next.delete(paramKey);
      }
      next.set("page", "1");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, paramKey]
  );

  return (
    <label className="flex flex-col gap-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
      {label}
      <input
        type="number"
        value={value}
        onChange={handleChange}
        min={SALARY_FILTER_MIN}
        max={SALARY_FILTER_MAX}
        step={SALARY_FILTER_STEP}
        placeholder="Any"
        aria-label={label}
        className="mt-0.5 w-28 rounded border border-gray-300 px-2 py-1.5 text-sm font-normal text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
      />
    </label>
  );
}

export function JobFilters() {
  return (
    <div className="flex flex-wrap gap-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
      <SelectFilter label="Role Type" paramKey="role_type" options={ROLE_TYPE_OPTIONS} />
      <SelectFilter label="Experience" paramKey="experience_level" options={EXPERIENCE_LEVEL_OPTIONS} />
      <SelectFilter label="Remote" paramKey="remote_status" options={REMOTE_STATUS_OPTIONS} />
      <SelectFilter label="Company Type" paramKey="company_type" options={COMPANY_TYPE_OPTIONS} />
      <SalaryInput label="Min Salary ($)" paramKey="salary_min" />
      <SalaryInput label="Max Salary ($)" paramKey="salary_max" />
    </div>
  );
}
