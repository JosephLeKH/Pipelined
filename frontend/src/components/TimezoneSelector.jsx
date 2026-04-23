/** Grouped IANA timezone <select> with optgroup regions. */

import { useMemo } from "react";

const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";

function getGroupedTimezones() {
  const zones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [BROWSER_TZ, "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Tokyo"];

  const groups = {};
  for (const tz of zones) {
    const region = tz.includes("/") ? tz.split("/")[0] : "Other";
    if (!groups[region]) groups[region] = [];
    groups[region].push(tz);
  }
  return groups;
}

/**
 * TimezoneSelector — IANA timezone <select> grouped by continent/region.
 *
 * Props:
 *   value    {string}    Currently selected IANA timezone
 *   onChange {function}  Called with new timezone string on change
 */
function TimezoneSelector({ value, onChange }) {
  const groups = useMemo(getGroupedTimezones, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Timezone"
      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
    >
      {Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([region, zones]) => (
          <optgroup key={region} label={region}>
            {zones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </optgroup>
        ))}
    </select>
  );
}

export default TimezoneSelector;
