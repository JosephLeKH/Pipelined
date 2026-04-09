#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [--tool amp|claude] [--prd prd.json] [max_iterations]
# Default PRD: scripts/ralph/prd_4.json (override with --prd)
# Env: RALPH_MODEL (default sonnet), RALPH_SLEEP_SEC (default 2),
#      RALPH_PROGRESS_TAIL_LINES (optional, append last N lines of progress file),
#      RALPH_MAX_BUDGET_USD (optional, passed to claude --max-budget-usd)

set -e

RALPH_MODEL="${RALPH_MODEL:-sonnet}"
RALPH_SLEEP_SEC="${RALPH_SLEEP_SEC:-2}"
RALPH_PROGRESS_TAIL_LINES="${RALPH_PROGRESS_TAIL_LINES:-0}"

# Parse arguments
TOOL="amp"
MAX_ITERATIONS=10
PRD_NAME=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --tool)
      TOOL="$2"
      shift 2
      ;;
    --tool=*)
      TOOL="${1#*=}"
      shift
      ;;
    --prd)
      PRD_NAME="$2"
      shift 2
      ;;
    --prd=*)
      PRD_NAME="${1#*=}"
      shift
      ;;
    *)
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
      fi
      shift
      ;;
  esac
done

if [[ "$TOOL" != "amp" && "$TOOL" != "claude" ]]; then
  echo "Error: Invalid tool '$TOOL'. Must be 'amp' or 'claude'."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR")"

# Resolve PRD file: --prd flag > default prd_4.json
if [ -n "$PRD_NAME" ]; then
  # Allow bare name like "prd_2" or "prd_2.json" or full path
  if [[ "$PRD_NAME" == /* ]]; then
    PRD_FILE="$PRD_NAME"
  elif [[ "$PRD_NAME" == *.json ]]; then
    PRD_FILE="$SCRIPT_DIR/$PRD_NAME"
  else
    PRD_FILE="$SCRIPT_DIR/${PRD_NAME}.json"
  fi
else
  PRD_FILE="$SCRIPT_DIR/prd_4.json"
fi

# Derive progress file name from the PRD file name (prd_2.json -> progress_2.txt, prd.json -> progress.txt)
PRD_BASENAME=$(basename "$PRD_FILE" .json)
if [[ "$PRD_BASENAME" == "prd" ]]; then
  PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
else
  PRD_SUFFIX="${PRD_BASENAME#prd}"   # "prd_2" -> "_2"
  PRD_SUFFIX="${PRD_SUFFIX#_}"       # "_2"    -> "2"
  PROGRESS_FILE="$SCRIPT_DIR/progress_${PRD_SUFFIX}.txt"
fi

ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

if [ ! -f "$PRD_FILE" ]; then
  echo "Error: Missing $PRD_FILE"
  echo "Tip: use --prd prd_2.json to specify which PRD to run against."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required (e.g. brew install jq)."
  exit 1
fi

CLAUDE_MD=""
if [[ "$TOOL" == "amp" ]]; then
  if [ ! -f "$SCRIPT_DIR/prompt.md" ]; then
    echo "Error: Missing $SCRIPT_DIR/prompt.md — copy from https://github.com/snarktank/ralph or use: $0 --tool claude [N]"
    exit 1
  fi
  if ! command -v amp >/dev/null 2>&1; then
    echo "Error: amp is not on PATH. Install Amp CLI or run: $0 --tool claude [N]"
    exit 1
  fi
else
  if [ -f "$PROJECT_ROOT/CLAUDE.md" ]; then
    CLAUDE_MD="$PROJECT_ROOT/CLAUDE.md"
  elif [ -f "$SCRIPT_DIR/CLAUDE.md" ]; then
    CLAUDE_MD="$SCRIPT_DIR/CLAUDE.md"
  else
    echo "Error: Could not find CLAUDE.md in project root ($PROJECT_ROOT) or script dir ($SCRIPT_DIR)."
    exit 1
  fi
  echo "Using CLAUDE.md: $CLAUDE_MD (via --append-system-prompt-file)"
  if ! command -v claude >/dev/null 2>&1; then
    echo "Error: claude is not on PATH. Install: npm install -g @anthropic-ai/claude-code"
    exit 1
  fi
fi

# Archive previous run if PRD branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")

  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    DATE=$(date +%Y-%m-%d)
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"

    echo "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"

    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

echo "PRD file: $PRD_FILE"
echo "Progress file: $PROGRESS_FILE"
if [[ "$TOOL" == "claude" ]]; then
  echo "Claude model: $RALPH_MODEL (set RALPH_MODEL to override)"
fi
if [ "$RALPH_PROGRESS_TAIL_LINES" -gt 0 ] 2>/dev/null; then
  echo "Progress tail: last $RALPH_PROGRESS_TAIL_LINES lines appended to each Claude task (RALPH_PROGRESS_TAIL_LINES)"
fi
echo "Sleep between iterations: ${RALPH_SLEEP_SEC}s (RALPH_SLEEP_SEC)"
echo "Starting Ralph - Tool: $TOOL - Max iterations: $MAX_ITERATIONS"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "==============================================================="
  echo "  Ralph Iteration $i of $MAX_ITERATIONS ($TOOL)"
  echo "==============================================================="

  if [[ "$TOOL" == "amp" ]]; then
    OUTPUT=$(
      cd "$PROJECT_ROOT" || exit 1
      cat "$SCRIPT_DIR/prompt.md" | amp --dangerously-allow-all 2>&1 | tee /dev/stderr
    ) || true
  else
    REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE" 2>/dev/null || echo "0")
    if [ "$REMAINING" -eq 0 ]; then
      echo ""
      echo "All stories complete!"
      exit 0
    fi

    TARGET_STORY_ID=$(jq -r '[.userStories[] | select(.passes == false)] | sort_by(.priority) | .[0].id' "$PRD_FILE")
    STORY_BLOCK=$(jq -r --arg id "$TARGET_STORY_ID" '
      .userStories[] | select(.id == $id) |
      "Story ID: \(.id)\nTitle: \(.title)\nPriority: \(.priority // 0)\n\nDescription:\n\(.description // .title)\n\n" +
      (if ((.notes // "") | gsub("^\\s+|\\s+$"; "") | length) > 0 then "Notes:\n\(.notes)\n\n" else "" end) +
      "Acceptance criteria:\n" +
      (if (.acceptanceCriteria | type) == "array" and (.acceptanceCriteria | length) > 0 then
        [.acceptanceCriteria[] | "- " + .] | join("\n")
      else "- (none listed)" end)
    ' "$PRD_FILE")

    PRD_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE")
    PROGRESS_APPEND=""
    if [ "$RALPH_PROGRESS_TAIL_LINES" -gt 0 ] 2>/dev/null && [ -f "$PROGRESS_FILE" ]; then
      PROGRESS_APPEND=$(printf '%s\n\n%s\n' "## Recent progress (last ${RALPH_PROGRESS_TAIL_LINES} lines)" "$(tail -n "$RALPH_PROGRESS_TAIL_LINES" "$PROGRESS_FILE")")
    fi

    TASK_PROMPT=$(cat <<EOF
You are one iteration of the Ralph autonomous loop. Working directory for tools: $PROJECT_ROOT

Project rules are loaded from CLAUDE.md via system instructions — follow them for stack, layout, tests, and style.

## Ralph files (exact paths)
- PRD JSON: $PRD_FILE
- Progress log (append only): $PROGRESS_FILE
- Git branch name from PRD \`branchName\`: ${PRD_BRANCH:-"(not set)"}

## Current task — implement ONLY this user story
$STORY_BLOCK

$PROGRESS_APPEND

## When this story is done
1. Run quality checks (typecheck, tests) as required by the project.
2. MANDATORY — From repo root ($PROJECT_ROOT): after checks pass, run \`git add -A\` and \`git commit -m "feat: $TARGET_STORY_ID - <use exact Title from the task header above>"\`. Do not end with a dirty working tree.
3. Set \`passes: true\` for story id **$TARGET_STORY_ID** in \`$PRD_FILE\` only.
4. Append a brief summary and learnings to \`$PROGRESS_FILE\`.

## Stop signal (critical)
- After step 3, re-read \`$PRD_FILE\`. If any userStory has \`passes: false\`, do NOT output the completion tag.
- Output <promise>COMPLETE</promise> ONLY when every userStory has \`passes: true\`.
EOF
)

    BUDGET_ARGS=()
    if [ -n "${RALPH_MAX_BUDGET_USD:-}" ]; then
      BUDGET_ARGS=(--max-budget-usd "$RALPH_MAX_BUDGET_USD")
    fi

    OUTPUT=$(
      cd "$PROJECT_ROOT" || exit 1
      claude --dangerously-skip-permissions \
        --model "$RALPH_MODEL" \
        --append-system-prompt-file "$CLAUDE_MD" \
        "${BUDGET_ARGS[@]}" \
        -p "$TASK_PROMPT" 2>&1 | tee /dev/stderr
    ) || true

    STILL_PASSES=$(jq -r --arg id "$TARGET_STORY_ID" '.userStories[] | select(.id == $id) | .passes | tostring' "$PRD_FILE" 2>/dev/null || echo "unknown")
    if [ "$STILL_PASSES" != "true" ]; then
      echo ""
      echo "Ralph: warning — story $TARGET_STORY_ID still has passes != true in $PRD_FILE (next iteration will pick the open story with smallest \`priority\` number)."
    fi

    if [ -n "$(git -C "$PROJECT_ROOT" status --porcelain 2>/dev/null)" ]; then
      echo ""
      echo "Ralph: uncommitted changes detected — creating snapshot commit for iteration $i."
      git -C "$PROJECT_ROOT" add -A
      git -C "$PROJECT_ROOT" commit -m "chore(ralph): iteration $i snapshot (auto-commit)" || true
    fi
  fi

  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    REMAINING_AFTER=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE" 2>/dev/null || echo "1")
    if [ "$REMAINING_AFTER" -eq 0 ]; then
      echo ""
      echo "Ralph completed all tasks!"
      echo "Completed at iteration $i of $MAX_ITERATIONS"
      exit 0
    fi
    echo ""
    echo "Ignoring premature <promise>COMPLETE</promise>: $REMAINING_AFTER user stories still have passes: false in $PRD_FILE — continuing."
  fi

  echo "Iteration $i complete. Continuing..."
  sleep "$RALPH_SLEEP_SEC"
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
exit 1
