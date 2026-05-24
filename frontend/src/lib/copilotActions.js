/** Parse and execute co-pilot tool actions — navigation only. */

const OPEN_APP_ACTION = "open_app";
const BLOCKED_ACTIONS = new Set(["send_email", "apply", "auto_send", "auto_apply", "submit"]);
const ACTION_JSON_PATTERN = /\{"action"\s*:\s*"[^"]+"[^}]*\}/g;

export function parseCopilotActions(text) {
  if (!text) return [];
  const actions = [];
  for (const match of text.matchAll(ACTION_JSON_PATTERN)) {
    try {
      const payload = JSON.parse(match[0]);
      const action = payload?.action;
      if (!action || BLOCKED_ACTIONS.has(action) || action !== OPEN_APP_ACTION) continue;
      if (typeof payload.path !== "string" || !payload.path.startsWith("/")) continue;
      actions.push({
        action: OPEN_APP_ACTION,
        path: payload.path,
        label: typeof payload.label === "string" ? payload.label : "Open",
      });
    } catch {
      // ignore malformed action JSON
    }
  }
  return actions;
}

export function stripCopilotActionBlocks(text) {
  if (!text) return "";
  return text.replace(ACTION_JSON_PATTERN, "").trim();
}

export function executeCopilotAction(action, navigate) {
  if (!action || action.action !== OPEN_APP_ACTION) return false;
  if (typeof navigate !== "function") return false;
  navigate(action.path);
  return true;
}
