/** Morning brief page: prioritized daily action cards from GET /api/brief/today. */

import Sun from "lucide-react/dist/esm/icons/sun";

import EmptyState from "../components/EmptyState";
import MorningBriefSectionCard from "../components/MorningBriefSectionCard";
import NavBar from "../components/NavBar";
import { useMorningBrief } from "../hooks/useMorningBrief";
import { BRIEF_EMPTY_MESSAGE, BRIEF_SECTION_ORDER, BRIEF_UNAVAILABLE_MESSAGE } from "../lib/briefConstants";

function MorningBriefLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" aria-hidden="true">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

function MorningBriefContent({ brief }) {
  const sections = brief?.sections ?? {};
  const hasItems = BRIEF_SECTION_ORDER.some(({ key }) => sections[key]?.length > 0);

  if (!hasItems) {
    return (
      <EmptyState
        icon={Sun}
        title="All caught up"
        description={brief?.summary_line ?? BRIEF_EMPTY_MESSAGE}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {brief.summary_line && (
        <p className="text-sm text-muted-foreground">{brief.summary_line}</p>
      )}
      {BRIEF_SECTION_ORDER.map(({ key, label }) => (
        <MorningBriefSectionCard
          key={key}
          label={label}
          items={sections[key]}
        />
      ))}
    </div>
  );
}

function MorningBriefPage() {
  const { data: brief, isLoading, isError } = useMorningBrief();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavBar />
      <main className="flex-1 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <header>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Morning Brief
            </h1>
            {brief?.date && (
              <p className="mt-1 text-sm text-muted-foreground">{brief.date}</p>
            )}
          </header>

          {isLoading && <MorningBriefLoading />}

          {!isLoading && isError && (
            <EmptyState icon={Sun} title="Brief not ready" description={BRIEF_UNAVAILABLE_MESSAGE} />
          )}

          {!isLoading && !isError && brief && <MorningBriefContent brief={brief} />}
        </div>
      </main>
    </div>
  );
}

export default MorningBriefPage;
