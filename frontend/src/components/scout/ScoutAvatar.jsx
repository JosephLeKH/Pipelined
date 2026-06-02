/** Scout persona avatar — compass glyph, three size + state variants. */

import Compass from "lucide-react/dist/esm/icons/compass";

const SIZE_CLASSES = {
  sm: { box: "h-4 w-4", icon: "h-2.5 w-2.5" },
  md: { box: "h-6 w-6", icon: "h-3.5 w-3.5" },
  lg: { box: "h-8 w-8", icon: "h-5 w-5" },
};

const STATE_LABELS = {
  idle: "Scout",
  pulse: "Scout — has new",
  working: "Scout — working",
};

function ringClass(state) {
  if (state === "pulse") return "ring-2 ring-brand-500/40 motion-safe:animate-pulse";
  if (state === "working") return "ring-2 ring-brand-500/60";
  return "ring-1 ring-border-1";
}

function ScoutAvatar({ size = "md", state = "idle" }) {
  const sz = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
  return (
    <span
      role="img"
      aria-label={STATE_LABELS[state] ?? STATE_LABELS.idle}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-600 text-white ${sz.box} ${ringClass(state)}`}
    >
      <Compass className={sz.icon} aria-hidden="true" />
    </span>
  );
}

export default ScoutAvatar;
