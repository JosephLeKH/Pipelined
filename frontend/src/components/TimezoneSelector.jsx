/** Grouped IANA timezone <select> with optgroup regions. */

import { useMemo } from "react";

const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";

const SELECT_CLS = "border border-input rounded-md bg-background text-foreground focus:border-ring focus:ring-1 focus:ring-ring/20 focus:outline-none transition-colors text-sm px-3 py-2 font-sans w-full";

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
      className={SELECT_CLS}
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
