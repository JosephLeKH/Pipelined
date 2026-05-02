/** Grouped IANA timezone selector with optgroup regions. */

import { useMemo } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from "@/components/ui/select";

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
 * TimezoneSelector — IANA timezone selector grouped by continent/region.
 *
 * Props:
 *   value    {string}    Currently selected IANA timezone
 *   onChange {function}  Called with new timezone string on change
 */
function TimezoneSelector({ value, onChange }) {
  const groups = useMemo(getGroupedTimezones, []);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Timezone" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-60 overflow-auto">
        {Object.entries(groups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([region, zones]) => (
            <SelectGroup key={region}>
              <SelectLabel>{region}</SelectLabel>
              {zones.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
      </SelectContent>
    </Select>
  );
}

export default TimezoneSelector;
