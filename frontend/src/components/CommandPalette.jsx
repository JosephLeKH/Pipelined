/** Global command palette — opens on Cmd+K / Ctrl+K for instant search and actions. */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { OPEN_COMMAND_PALETTE_EVENT } from "../lib/constants";
import { COMMAND_PALETTE_NAV } from "../lib/commandPaletteNav";
import { recordRecentApplication } from "../lib/recentApplications";
import { useApplications } from "../hooks/useApplications";
import { useCommandPaletteSearch, PALETTE_CLIENT_LIMIT } from "../hooks/useCommandPaletteSearch";
import { useCommandPaletteActions } from "../hooks/useCommandPaletteActions";
import { useCommandPaletteSettings } from "../hooks/useCommandPaletteSettings";
import { useCommandPaletteKeyboard } from "../hooks/useCommandPaletteKeyboard";
import { useRecentApplications } from "../hooks/useRecentApplications";
import CommandPaletteDialog from "./CommandPaletteDialog";
import CsvImportModal from "./CsvImportModal";
import ManualAddForm from "./ManualAddForm";

const PALETTE_DEBOUNCE_MS = 200;

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debQuery, setDebQuery] = useState("");
  const [idx, setIdx] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const highlightRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setDebQuery(query), PALETTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: env } = useApplications({ limit: PALETTE_CLIENT_LIMIT });
  const applications = env?.data ?? [];
  const filteredApps = useCommandPaletteSearch({ query, debQuery, env });
  const quickActions = useCommandPaletteActions({ setFormOpen, setImportOpen });
  const settingsItems = useCommandPaletteSettings();
  const recentApps = useRecentApplications(applications);

  const items = useMemo(() => {
    if (query) return filteredApps.map((app) => ({ type: "app", ...app }));
    return [...quickActions, ...COMMAND_PALETTE_NAV, ...recentApps.map((app) => ({ type: "app", ...app })), ...settingsItems];
  }, [query, filteredApps, quickActions, recentApps, settingsItems]);

  useEffect(() => {
    setIdx(0);
  }, [items]);

  useEffect(() => {
    highlightRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [idx]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  const activate = useCallback(
    (item) => {
      if (item.type === "app") {
        recordRecentApplication(item.id);
        navigate(`/applications/${item.id}`);
      } else if (item.type === "nav") {
        navigate(item.path);
      } else if (item.type === "action") {
        item.fn();
      }
      close();
    },
    [navigate, close],
  );

  useCommandPaletteKeyboard({ isOpen, setIsOpen, items, idx, setIdx, activate, close });

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, open);
    return () => window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, open);
  }, []);

  return (
    <>
      <ManualAddForm isOpen={formOpen} onClose={() => setFormOpen(false)} />
      <CsvImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
      {isOpen && (
        <CommandPaletteDialog
          query={query}
          setQuery={setQuery}
          filteredApps={filteredApps}
          quickActions={quickActions}
          navItems={COMMAND_PALETTE_NAV}
          recentApps={recentApps}
          settingsItems={settingsItems}
          idx={idx}
          activate={activate}
          close={close}
          highlightRef={highlightRef}
        />
      )}
    </>
  );
}

export default CommandPalette;
