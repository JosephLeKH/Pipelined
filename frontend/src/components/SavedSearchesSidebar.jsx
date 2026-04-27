/** Sidebar displaying user's saved searches with new match counts and delete actions. */

import { toast } from "sonner";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import {
  useSavedSearches,
  useDeleteSavedSearch,
} from "../hooks/useSavedSearches";
import { CARD_BASE } from "../lib/designTokens";

export default function SavedSearchesSidebar({ onApply }) {
  const { data: searches = [] } = useSavedSearches();
  const deleteMutation = useDeleteSavedSearch();

  if (searches.length === 0) return null;

  function handleDelete(e, id) {
    e.stopPropagation();
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Saved search deleted"),
    });
  }

  return (
    <div className={`${CARD_BASE} p-4 shadow-card`}>
      <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Saved Searches</h2>
      <ul className="flex flex-col gap-1" aria-label="Saved searches list">
        {searches.map((s) => (
          <li
            key={s.id}
            className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-50 transition-colors dark:hover:bg-gray-700"
            onClick={() => onApply(s)}
          >
            <div className="flex flex-col">
              <span className="font-medium text-gray-800 dark:text-gray-200">{s.name}</span>
              {s.query && (
                <span className="text-xs text-gray-500 dark:text-gray-400">"{s.query}"</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {s.new_matches_count > 0 && (
                <span
                  className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                  aria-label={`${s.new_matches_count} new matches`}
                >
                  {s.new_matches_count}
                </span>
              )}
              <button
                type="button"
                aria-label="Delete saved search"
                onClick={(e) => handleDelete(e, s.id)}
                className="rounded p-0.5 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
