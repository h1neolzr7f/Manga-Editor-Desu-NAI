#!/usr/bin/env bash
# Plan A of docs/OPEN_SOURCE_PREP.md: export the current branch as a clean tree for a fresh public repository
# (one squashed commit). Nothing is pushed or created on GitHub; this only writes a folder and prints its size.
# Usage: bash scripts/make-public-tree.sh [output-dir]   (default: ../manga-editor-public)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-../manga-editor-public}"
[ -e "$OUT" ] && { echo "$OUT already exists"; exit 1; }
mkdir -p "$OUT"
git archive --format=tar HEAD | tar -x -C "$OUT"
# internal development evidence and agent reports (stay in the private repo)
rm -rf "$OUT/docs/acceptance" "$OUT/docs/screenshots" \
       "$OUT"/GROK_*.md "$OUT"/docs/GROK_*.md "$OUT/docs/MANGA_GPT_DEVELOPMENT_HANDOFF.md" "$OUT/docs/VALIDATION.md"
# prompt-helper example images (~167 MB) are downloaded on first use (json_js/prompt-helper-images.json)
rm -rf "$OUT/03_images/imgPromptHelper"
# safety net: refuse if anything private slipped in (example.workers.dev in a test fixture is fine)
PAT='sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|pst-[A-Za-z0-9]{30,}|[a-z0-9-]+\.workers\.dev|trycloudflare\.com'
hits=$(grep -rIoE "$PAT" "$OUT" | grep -v 'example\.workers\.dev' | grep -vE '/scripts/(privacy-guard-test\.cjs|make-public-tree\.sh):' || true)
if [ -n "$hits" ]; then echo "$hits" | sed -E 's/(:.{6}).*/\1…/'; echo "private strings found above; not ready"; exit 1; fi
du -sh "$OUT"
echo "Next (manual, after you decide): cd $OUT && git init && git add -A && git commit -m 'Initial public release' && push to a NEW repository."
