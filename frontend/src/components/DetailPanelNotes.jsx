/** Notes section wrapper with Linear-style section title. */

import NotesEditor from "./NotesEditor";
import { DetailSectionTitle } from "./DetailPanelSections";

export function DetailPanelNotes({ applicationId, initialValue, onDirtyChange }) {
  return (
    <section aria-label="Notes">
      <DetailSectionTitle>Notes</DetailSectionTitle>
      <NotesEditor applicationId={applicationId} initialValue={initialValue} onDirtyChange={onDirtyChange} />
    </section>
  );
}
