/** Settings GitHub integration — connect account for job board sync. */

import { Badge } from "./ui/badge";

function SettingsGitHubSection() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <h2 className="text-display-md text-text-1">GitHub</h2>
        <Badge variant="secondary">Coming soon</Badge>
      </div>
      <p className="mt-6 text-sm text-text-2">
        Connect GitHub to sync starred job repositories. Full integration UI ships in a later iteration.
      </p>
    </div>
  );
}

export default SettingsGitHubSection;
