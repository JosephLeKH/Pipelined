/** Sidebar displaying user's saved searches with new match counts and delete actions. */

import { toast } from "sonner";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import {
  useSavedSearches,
  useDeleteSavedSearch,
} from "../hooks/useSavedSearches";
import { Button } from "./ui/button";

export default function SavedSearchesSidebar({ onApply }) {
  const { data: searches = [] } = useSavedSearches();
  const deleteMutation = useDeleteSavedSearch();

  if (searches.length === 0) return null;

  function handleDelete(e, id) {
    e.stopPropagation();
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Saved search deleted"),
      onError: () => toast.error("Couldn't delete saved search. Try again."),
    });
  }

  return (
    <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Saved Searches</h2>
      <ul className="flex flex-col gap-1" aria-label="Saved searches list">
        {searches.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onApply(s)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onApply(s); } }}
            >
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{s.name}</span>
                {s.query && (
                  <span className="text-xs text-muted-foreground">"{s.query}"</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {s.new_matches_count > 0 && (
                  <span
                    className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                    aria-label={`${s.new_matches_count} new matches`}
                  >
                    {s.new_matches_count}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete saved search: ${s.name}`}
                  onClick={(e) => handleDelete(e, s.id)}
                  className="h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
