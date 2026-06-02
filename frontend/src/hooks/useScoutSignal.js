/** Memoized hook combining application + email events into a Scout signal. */

import { useMemo } from "react";

import { computeScoutSignal } from "../lib/scoutSignals";

export function useScoutSignal(application, emailEvents = []) {
  return useMemo(
    () => computeScoutSignal(application, emailEvents),
    [application, emailEvents]
  );
}
