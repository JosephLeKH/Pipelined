#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$ROOT"
ACTIVE=()
for f in "$SCRIPT_DIR"/prd_*.json; do
  total=$(jq '.userStories | length' "$f")
  done=$(jq '[.userStories[] | select(.passes == true)] | length' "$f")
  if [ "$done" -lt "$total" ]; then ACTIVE+=("$(basename "$f"):$done/$total"); fi
done
RECENT=$(git log --oneline -3 | tr '\n' ' ')
echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"active\":\"${ACTIVE[*]}\",\"recent\":\"$RECENT\"}"
