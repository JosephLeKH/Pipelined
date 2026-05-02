/** AppSelector state, pre-fill effect, and handlers for NewEventForm. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useAppSelector({ applicationId, apps, onApplicationChange }) {
  const [appSearch, setAppSearch] = useState("");
  const initializedRef = useRef(false);

  useEffect(() => {
    if (applicationId && apps.length > 0 && !initializedRef.current) {
      const found = apps.find((a) => a.id === applicationId);
      if (found) {
        setAppSearch(`${found.company} — ${found.role_title}`);
        initializedRef.current = true;
      }
    }
  }, [applicationId, apps]);

  const filteredApps = useMemo(() => {
    if (!appSearch.trim()) return apps;
    const lower = appSearch.toLowerCase();
    return apps.filter(
      (a) =>
        a.company?.toLowerCase().includes(lower) ||
        a.role_title?.toLowerCase().includes(lower)
    );
  }, [apps, appSearch]);

  const handleSearchChange = useCallback((e) => {
    setAppSearch(e.target.value);
  }, []);

  const handleSelectChange = useCallback(
    (e) => {
      const selected = apps.find((a) => a.id === e.target.value);
      onApplicationChange(e.target.value);
      if (selected) setAppSearch(`${selected.company} — ${selected.role_title}`);
    },
    [apps, onApplicationChange]
  );

  const handleSelectValueChange = useCallback(
    (value) => {
      const selected = apps.find((a) => a.id === value);
      onApplicationChange(value);
      if (selected) setAppSearch(`${selected.company} — ${selected.role_title}`);
    },
    [apps, onApplicationChange]
  );

  return { appSearch, filteredApps, handleSearchChange, handleSelectChange, handleSelectValueChange };
}
