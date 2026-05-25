/** Settings sharing — public pipeline and timeline links. */

import SharePipeline from "./SharePipeline";
import ShareTimeline from "./ShareTimeline";

function SettingsSharingSection() {
  return (
    <div>
      <h2 className="text-display-md text-text-1">Sharing</h2>
      <p className="mt-6 text-sm text-text-2">
        Generate read-only public links to share your pipeline or timeline with recruiters and friends.
      </p>
      <div className="mt-8 flex flex-col gap-4">
        <SharePipeline />
        <ShareTimeline />
      </div>
    </div>
  );
}

export default SettingsSharingSection;
