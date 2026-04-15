/** Thin wrapper rendering the notes editor for a given application. */

import NotesEditor from "./NotesEditor";

export function DetailPanelNotes({ applicationId, initialValue }) {
  return <NotesEditor applicationId={applicationId} initialValue={initialValue} />;
}
