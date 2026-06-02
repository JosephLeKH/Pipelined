/** Top-bar Scout entry point — avatar with pulse + click → open dock. */

import ScoutAvatar from "../scout/ScoutAvatar";

function TopBarScoutMenu({ hasNew = false, onAskScout }) {
  return (
    <button
      type="button"
      onClick={onAskScout}
      aria-label={hasNew ? "Scout — has new" : "Scout"}
      className="inline-flex items-center justify-center rounded-full p-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2"
    >
      <ScoutAvatar size="md" state={hasNew ? "pulse" : "idle"} />
    </button>
  );
}

export default TopBarScoutMenu;
