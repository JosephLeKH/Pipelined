/** Stage abbreviations and dot colors for extension popup. SYNC: PRD-00 §3.4, PRD-11 §7 */

export const STAGE_ABBREV = {
  "to apply": "Apl",
  applied: "Apd",
  "phone screen": "Phn",
  technical: "Tec",
  onsite: "Ons",
  offer: "Ofr",
  rejected: "Rej",
  withdrawn: "Wdr",
};

export const STAGE_DOT_COLORS = {
  "to apply": "var(--status-neutral)",
  applied: "var(--status-info)",
  "phone screen": "var(--status-violet)",
  technical: "var(--status-warn)",
  onsite: "var(--status-orange)",
  offer: "var(--status-success)",
  rejected: "var(--status-muted)",
  withdrawn: "var(--status-muted)",
};

const DEFAULT_ABBREV = "Apl";
const DEFAULT_DOT = "var(--status-neutral)";

/**
 * @param {string|null|undefined} stage
 * @returns {string}
 */
export function stageAbbrev(stage) {
  const key = (stage || "").toLowerCase();
  return STAGE_ABBREV[key] || DEFAULT_ABBREV;
}

/**
 * @param {string|null|undefined} stage
 * @returns {string}
 */
export function stageDotColor(stage) {
  const key = (stage || "").toLowerCase();
  return STAGE_DOT_COLORS[key] || DEFAULT_DOT;
}
