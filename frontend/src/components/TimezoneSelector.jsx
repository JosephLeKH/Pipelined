/** Grouped IANA timezone <select> with optgroup regions. */

import { useMemo } from "react";

import { INPUT_BASE } from "../lib/designTokens";

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
      className={INPUT_BASE}
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
