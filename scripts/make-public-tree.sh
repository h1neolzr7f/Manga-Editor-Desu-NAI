#!/usr/bin/env bash
# Export the current branch as a clean tree for a fresh public repository
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
# internal process reports (audit / open-source prep) stay private
rm -f "$OUT"/docs/NOVICE_AUDIT_*.md "$OUT/docs/OPEN_SOURCE_PREP.md"
# public repo: CI runs on pushes to main; the installer build is manual only
python3 - "$OUT/.github/workflows" <<'PY'
import glob, os, re, sys
for f in glob.glob(os.path.join(sys.argv[1], "*.yml")):
    s = open(f, encoding="utf-8").read(); o = s
    s = re.sub(r'(\n  push:\n    branches:\n)((?:      - "[^"]*"\n)+)', lambda m: m.group(1) + '      - "main"\n', s)
    s = re.sub(r'(\n  push:\n    branches: )\[[^\]]*\]', r'\1["main"]', s)
    if f.endswith("build-windows-installer.yml"):
        s = re.sub(r'\n  push:\n    branches:\n      - "main"\n(?:    paths:\n(?:      - "[^"]*"\n)+)?', "\n", s)
    if s != o:
        open(f, "w", encoding="utf-8").write(s)
PY
# safety net: refuse if anything private slipped in (example.workers.dev in a test fixture is fine)
PAT='sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|pst-[A-Za-z0-9]{30,}|[a-z0-9-]+\.workers\.dev|trycloudflare\.com'
hits=$(grep -rIoE "$PAT" "$OUT" | grep -v 'example\.workers\.dev' | grep -vE '/scripts/(privacy-guard-test\.cjs|make-public-tree\.sh):' || true)
if [ -n "$hits" ]; then echo "$hits" | sed -E 's/(:.{6}).*/\1…/'; echo "private strings found above; not ready"; exit 1; fi
du -sh "$OUT"
echo "Next (manual, after you decide): cd $OUT && git init && git add -A && git commit -m 'Initial public release' && push to a NEW repository."
