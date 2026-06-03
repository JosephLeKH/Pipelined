/** Notes tab: full-height notes editor (no longer cramped by sibling sections). */

import NotesEditor from "../../NotesEditor";

function NotesTab({ application, onDirtyChange }) {
  return (
    <section aria-label="Notes" className="flex min-h-[50vh] flex-col">
      <NotesEditor
        applicationId={application.id}
        initialValue={application.notes}
        onDirtyChange={onDirtyChange}
      />
    </section>
  );
}

export default NotesTab;
