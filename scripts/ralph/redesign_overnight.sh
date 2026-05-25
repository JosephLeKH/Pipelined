#!/usr/bin/env bash
# Ralph sequential runner for the Linear-redesign PRDs using Cursor's headless agent.
# Sequential through docs/redesign/PRD-00..11; loops cursor-agent per PRD until
# <promise>COMPLETE</promise> + completion marker, or REDESIGN_MAX_ITERS exhausted.
#
# Designed for unattended overnight runs:
#   - never halts on a single PRD or iteration failure (default REDESIGN_HALT_ON_FAIL=false)
#   - warns on dirty trees but does NOT stash (an earlier version did, and hid the PRDs)
#   - writes heartbeat + STATUS.json each iteration so morning review is trivial
#   - --force on cursor-agent to auto-approve all tool use
#
# Usage:
#   ./redesign_overnight.sh                   # full sequence
#   ./redesign_overnight.sh --start-from 04   # resume from PRD-04
#   ./redesign_overnight.sh --dry-run         # print plan, don't invoke
#
# Recommended launch (detached, survives terminal close):
#   nohup ./scripts/ralph/redesign_overnight.sh \
#     > scripts/ralph/redesign_logs/overnight.out 2>&1 &
#   echo $! > scripts/ralph/redesign_logs/overnight.pid
#
# Env:
#   REDESIGN_MODEL           Cursor model id (default: composer-2.5-fast)
#   REDESIGN_MAX_ITERS       Iterations per PRD before moving on (default: 25)
#   REDESIGN_SLEEP_SEC       Sleep between iterations (default: 3)
#   REDESIGN_HALT_ON_FAIL    "true" to stop sequence on a PRD failure (default: false)
#   REDESIGN_INTER_PRD_SLEEP Cooling sleep between PRDs (default: 15)

# NOTE: -e is intentionally omitted so a single command failure cannot kill the run.
set -uo pipefail

REDESIGN_MODEL="${REDESIGN_MODEL:-composer-2.5-fast}"
REDESIGN_MAX_ITERS="${REDESIGN_MAX_ITERS:-25}"
REDESIGN_SLEEP_SEC="${REDESIGN_SLEEP_SEC:-3}"
REDESIGN_HALT_ON_FAIL="${REDESIGN_HALT_ON_FAIL:-false}"
REDESIGN_INTER_PRD_SLEEP="${REDESIGN_INTER_PRD_SLEEP:-15}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
PRD_DIR="$PROJECT_ROOT/docs/redesign"
PROMPT_TPL="$SCRIPT_DIR/redesign_prompt.md"
LOG_DIR="$SCRIPT_DIR/redesign_logs/$(date +%Y%m%d-%H%M%S)"
COMPLETE_DIR="$PRD_DIR/.complete"
STATUS_FILE="$LOG_DIR/STATUS.json"
HEARTBEAT="$LOG_DIR/heartbeat"
HALT_MARKER="$LOG_DIR/HALTED"

# PRDs in sequential dependency order (PRD-12 wave plan flattened).
PRDS=(
  "PRD-00-design-system.md"
  "PRD-01-app-shell.md"
  "PRD-02-marketing-public.md"
  "PRD-03-auth.md"
  "PRD-11-extension.md"
  "PRD-04-pipeline.md"
  "PRD-05-today-brief.md"
  "PRD-06-jobs-calendar.md"
  "PRD-07-analytics-offers-tags-activity.md"
  "PRD-10-system-ui.md"
  "PRD-08-settings.md"
  "PRD-09-ai-workflows.md"
)

START_FROM=""
DRY_RUN=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --start-from) START_FROM="$2"; shift 2 ;;
    --start-from=*) START_FROM="${1#*=}"; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

# ---------- Sanity (only things we cannot recover from) ----------
if ! command -v cursor-agent >/dev/null 2>&1; then
  echo "FATAL: cursor-agent not on PATH ($(which cursor-agent 2>/dev/null || echo none)). Install: curl https://cursor.com/install -fsS | bash" >&2
  exit 1
fi
if [ ! -f "$PROMPT_TPL" ]; then
  echo "FATAL: missing prompt template $PROMPT_TPL" >&2
  exit 1
fi
mkdir -p "$LOG_DIR" "$COMPLETE_DIR"

# Heartbeat + status helpers
heartbeat() { date -Iseconds > "$HEARTBEAT" 2>/dev/null || true; }
status_write() {
  local prd="$1" state="$2" iter="${3:-}" note="${4:-}"
  python3 - "$STATUS_FILE" "$prd" "$state" "$iter" "$note" <<'PY' 2>/dev/null || true
import json, os, sys, datetime
path, prd, state, it, note = sys.argv[1:6]
data = {}
if os.path.exists(path):
  try: data = json.load(open(path))
  except Exception: data = {}
data.setdefault("prds", {})
data["prds"][prd] = {"state": state, "iter": it, "note": note,
                    "ts": datetime.datetime.utcnow().isoformat()+"Z"}
data["updated"] = datetime.datetime.utcnow().isoformat()+"Z"
open(path, "w").write(json.dumps(data, indent=2))
PY
}

# Catch unexpected death so morning review knows it happened
trap 'echo "TRAP: unexpected exit at $(date -Iseconds)" >> "$HALT_MARKER"' EXIT

# Print plan
echo "==================== REDESIGN OVERNIGHT RUN ===================="
echo "Model:           $REDESIGN_MODEL"
echo "Max iters/PRD:   $REDESIGN_MAX_ITERS"
echo "Sleep / iter:    ${REDESIGN_SLEEP_SEC}s"
echo "Inter-PRD sleep: ${REDESIGN_INTER_PRD_SLEEP}s"
echo "Halt on fail:    $REDESIGN_HALT_ON_FAIL"
echo "Log dir:         $LOG_DIR"
echo "Status file:     $STATUS_FILE"
echo "Heartbeat:       $HEARTBEAT"
echo "Project root:    $PROJECT_ROOT"
echo "PRD count:       ${#PRDS[@]}"
echo "Start from:      ${START_FROM:-(beginning)}"
echo "Launched at:     $(date -Iseconds)"
echo "=================================================================="
echo
$DRY_RUN && { trap - EXIT; echo "[dry-run] exiting."; exit 0; }

# DO NOT auto-stash. The earlier version of this script stashed untracked files
# pre-run, which hid the very PRDs and scripts the run depends on. Warn instead.
if [ -n "$(git -C "$PROJECT_ROOT" status --porcelain 2>/dev/null)" ]; then
  echo "WARN: working tree at $PROJECT_ROOT has uncommitted changes." >&2
  echo "      Continuing as requested (unattended mode); per-PRD branches will carry these forward." >&2
  echo "      Recommended: commit redesign docs + this script before launching." >&2
fi
BASE_BRANCH="$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
echo "Base branch: $BASE_BRANCH"

run_one_prd() {
  local prd_file="$1"
  local prd_path="$PRD_DIR/$prd_file"
  local prd_name="${prd_file%.md}"
  local prd_number="${prd_name%%-*}"
  local branch="redesign/$(echo "$prd_name" | tr '[:upper:]' '[:lower:]')"
  local progress_file="$LOG_DIR/${prd_name}.progress.txt"
  local iter_log="$LOG_DIR/${prd_name}.iter.log"
  local complete_marker="$COMPLETE_DIR/${prd_name}.done"

  if [ ! -f "$prd_path" ]; then
    echo "MISSING $prd_path — skipping"
    status_write "$prd_name" "missing" "0" "PRD file not found"
    return 1
  fi

  echo
  echo "================================================================"
  echo "  ▶ $prd_name"
  echo "  Branch:   $branch"
  echo "  Iterlog:  $iter_log"
  echo "================================================================"
  status_write "$prd_name" "starting" "0" ""

  # Branch off base. DO NOT stash or clean — that destroyed the docs once already.
  # If the checkout legitimately fails (e.g. conflicting tracked changes), skip
  # this PRD and move on rather than nuking files.
  git -C "$PROJECT_ROOT" fetch origin "$BASE_BRANCH" >/dev/null 2>&1 || true
  if ! git -C "$PROJECT_ROOT" checkout -B "$branch" "$BASE_BRANCH" >/dev/null 2>&1; then
    echo "  ✗ checkout failed — skipping PRD (no destructive recovery)"
    status_write "$prd_name" "skipped-checkout-failed" "0" ""
    return 3
  fi

  echo "# Ralph progress — $prd_name" > "$progress_file"
  echo "Started: $(date)" >> "$progress_file"
  echo "---" >> "$progress_file"

  local iter=0
  while [ "$iter" -lt "$REDESIGN_MAX_ITERS" ]; do
    iter=$((iter + 1))
    local ts; ts="$(date -Iseconds)"
    heartbeat
    status_write "$prd_name" "running" "$iter" ""
    echo
    echo "  iter $iter / $REDESIGN_MAX_ITERS @ $ts"

    local prompt
    prompt="$(
      sed -e "s|{{PROJECT_ROOT}}|$PROJECT_ROOT|g" \
          -e "s|{{PRD_NAME}}|$prd_name|g" \
          -e "s|{{PRD_NUMBER}}|$prd_number|g" \
          -e "s|{{PRD_PATH}}|$prd_path|g" \
          -e "s|{{BRANCH_NAME}}|$branch|g" \
          -e "s|{{PROGRESS_FILE}}|$progress_file|g" \
          -e "s|{{COMPLETE_MARKER}}|$complete_marker|g" \
          -e "s|{{TIMESTAMP}}|$ts|g" \
          -e "s|{{ITERATION}}|$iter|g" \
          "$PROMPT_TPL"
    )" || prompt="(prompt render failed)"

    local output=""
    {
      cd "$PROJECT_ROOT" 2>/dev/null || true
      output="$(
        cursor-agent \
          --model "$REDESIGN_MODEL" \
          --force \
          --output-format text \
          -p "$prompt" 2>&1 | tee -a "$iter_log"
      )" || true
    } || true

    heartbeat

    # Done?
    if [ -f "$complete_marker" ] && echo "$output" | grep -q "<promise>COMPLETE</promise>"; then
      echo "  ✓ $prd_name COMPLETE after $iter iterations."
      git -C "$PROJECT_ROOT" log -1 --oneline 2>/dev/null || true
      status_write "$prd_name" "complete" "$iter" ""
      return 0
    fi

    # Snapshot anything left uncommitted so we never lose work.
    if [ -n "$(git -C "$PROJECT_ROOT" status --porcelain 2>/dev/null)" ]; then
      echo "  ! uncommitted changes — snapshotting"
      git -C "$PROJECT_ROOT" add -A 2>/dev/null || true
      git -C "$PROJECT_ROOT" commit --no-verify -m "chore(ralph): $prd_name iter $iter snapshot" 2>/dev/null || true
    fi

    sleep "$REDESIGN_SLEEP_SEC" 2>/dev/null || true
  done

  echo "  ✗ $prd_name did not complete within $REDESIGN_MAX_ITERS iterations."
  status_write "$prd_name" "iter-exhausted" "$iter" ""
  return 2
}

# Optional --start-from skip
SKIP=true
[ -z "$START_FROM" ] && SKIP=false

for prd_file in "${PRDS[@]}"; do
  heartbeat
  if $SKIP; then
    case "$prd_file" in
      *"$START_FROM"*) SKIP=false ;;
      *) echo "skip $prd_file (before --start-from $START_FROM)"; continue ;;
    esac
  fi

  rc=0
  run_one_prd "$prd_file" || rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "  ⚠ $prd_file returned $rc"
    if [ "$REDESIGN_HALT_ON_FAIL" = "true" ]; then
      echo "REDESIGN_HALT_ON_FAIL=true — stopping at $prd_file."
      echo "Resume later with: $0 --start-from ${prd_file%.md}"
      trap - EXIT
      exit "$rc"
    fi
    echo "  → continuing to next PRD (unattended mode)"
  fi
  sleep "$REDESIGN_INTER_PRD_SLEEP" 2>/dev/null || true
done

# Final pass: return to base branch if possible. Don't stash — let user see state.
git -C "$PROJECT_ROOT" checkout "$BASE_BRANCH" >/dev/null 2>&1 || true

trap - EXIT
echo
echo "==================== SEQUENCE FINISHED ===================="
echo "Finished at: $(date -Iseconds)"
echo "Logs:        $LOG_DIR"
echo "Status:      $STATUS_FILE"
echo "Markers:     $COMPLETE_DIR"
echo "Branches:    git branch --list 'redesign/*'"
