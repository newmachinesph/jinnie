#!/usr/bin/env bash
# Optimize every fetched logo into <id>.min.svg: inline <style> rules as
# attributes (react-native-svg has no CSS), drop editor cruft, keep viewBox.
set -e
cd "$(dirname "$0")/svg"
for f in *.svg; do
  case "$f" in *.min.svg) continue;; esac
  grep -q '<svg' "$f" || { echo "skip $f (not svg)"; continue; }
  id="${f%.svg}"
  # Keep viewBox (the renderer scales by it) and drop title/desc, which
  # react-native-svg does not know.
  npx --yes svgo "$f" -o "$id.min.svg" --quiet --config "$(dirname "$0")/../svgo.config.mjs"
  printf '%-24s %7s -> %7s\n' "$id" "$(wc -c < "$f")" "$(wc -c < "$id.min.svg")"
done
