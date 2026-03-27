#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [--tool amp|claude] [max_iterations]
# Claude model: defaults to sonnet; override with RALPH_MODEL=opus ./ralph.sh --tool claude

set -e

# Claude Code model alias (see: claude --help --model)
RALPH_MODEL="${RALPH_MODEL:-sonnet}"

# Parse arguments
TOOL="amp"  # Default to amp for backwards compatibility
MAX_ITERATIONS=10

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
    *)
      # Assume it's max_iterations if it's a number
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
      fi
      shift
      ;;
  esac
done

# Validate tool choice
if [[ "$TOOL" != "amp" && "$TOOL" != "claude" ]]; then
  echo "Error: Invalid tool '$TOOL'. Must be 'amp' or 'claude'."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"
PROJECT_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR")"

if [ ! -f "$PRD_FILE" ]; then
  echo "Error: Missing $PRD_FILE"
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
  echo "Using CLAUDE.md: $CLAUDE_MD"
  if ! command -v claude >/dev/null 2>&1; then
    echo "Error: claude is not on PATH. Install: npm install -g @anthropic-ai/claude-code"
    exit 1
  fi
fi

# Archive previous run if branch changed
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

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

if [[ "$TOOL" == "claude" ]]; then
  echo "Claude model: $RALPH_MODEL (set RALPH_MODEL to override)"
fi
echo "Starting Ralph - Tool: $TOOL - Max iterations: $MAX_ITERATIONS"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "==============================================================="
  echo "  Ralph Iteration $i of $MAX_ITERATIONS ($TOOL)"
  echo "==============================================================="

  # Run the selected tool with the ralph prompt
  if [[ "$TOOL" == "amp" ]]; then
    OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | amp --dangerously-allow-all 2>&1 | tee /dev/stderr) || true
  else
    # Check if there are any remaining stories
    REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE" 2>/dev/null || echo "0")
    if [ "$REMAINING" -eq 0 ]; then
      echo ""
      echo "All stories complete!"
      exit 0
    fi

    # Get the next incomplete story
    STORY=$(jq -r '[.userStories[] | select(.passes == false)] | first | "Story ID: \(.id)\nTitle: \(.title)\nDescription: \(.description // .title)"' "$PRD_FILE")

    # Build the full prompt: CLAUDE.md context + current story
    CLAUDE_CONTEXT=$(cat "$CLAUDE_MD")
    FULL_PROMPT="$CLAUDE_CONTEXT

---

## Current Task

$STORY

---

When this story is complete:
1. Run quality checks (typecheck, tests) as specified above
2. MANDATORY — Commit at repo root ($PROJECT_ROOT): after checks pass, run \`git add -A\` and \`git commit -m "feat: [Story ID] - [Story Title]"\`. Do not finish this iteration with a dirty working tree (no uncommitted changes).
3. Update scripts/ralph/prd.json (path: $PRD_FILE) to set passes: true for the story you just finished
4. Append a brief summary of what you did and any learnings to scripts/ralph/progress.txt

## Stop signal (critical)

- After step 3, re-read scripts/ralph/prd.json and count userStories where passes is false.
- If ANY story still has passes: false, do NOT output the completion tag. End normally; the next Ralph iteration will pick up the next story.
- Output <promise>COMPLETE</promise> ONLY when every userStory has passes: true (entire PRD done)."

    OUTPUT=$(claude --dangerously-skip-permissions --model "$RALPH_MODEL" -p "$FULL_PROMPT" 2>&1 | tee /dev/stderr) || true

    # If the agent left changes uncommitted, snapshot-commit so each iteration has a commit
    if [ -n "$(git -C "$PROJECT_ROOT" status --porcelain 2>/dev/null)" ]; then
      echo ""
      echo "Ralph: uncommitted changes detected — creating snapshot commit for iteration $i."
      git -C "$PROJECT_ROOT" add -A
      git -C "$PROJECT_ROOT" commit -m "chore(ralph): iteration $i snapshot (auto-commit)" || true
    fi
  fi
  
  # COMPLETE must match prd.json — models often emit it after one story if the prompt is ambiguous
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
  sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
exit 1