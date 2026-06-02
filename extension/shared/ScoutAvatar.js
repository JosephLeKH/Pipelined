/** Scout persona avatar — compass glyph for popup + content banner.
 * Pure DOM string output. Three states: idle, pulse, working.
 * SYNC: frontend/src/components/scout/ScoutAvatar.jsx
 */

const COMPASS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`;

const STATE_LABEL = {
  idle: "Scout",
  pulse: "Scout — has new",
  working: "Scout — working",
};

/**
 * Returns an outerHTML string for a Scout avatar span.
 * @param {{ size?: 'sm'|'md'|'lg', state?: 'idle'|'pulse'|'working' }} [opts]
 * @returns {string}
 */
export function scoutAvatarHtml({ size = "md", state = "idle" } = {}) {
  const sizeClass = `scout-avatar--${size}`;
  const stateClass = `scout-avatar--${state}`;
  const label = STATE_LABEL[state] || STATE_LABEL.idle;
  return `<span class="scout-avatar ${sizeClass} ${stateClass}" role="img" aria-label="${label}">${COMPASS_SVG}</span>`;
}
