#!/usr/bin/env bash
# Renders site/og.html, the share image for link previews, into site/og.png
# with headless Chrome. site.yml runs it after the fetch, so the image shows the
# fresh standings; run it by hand to refresh the committed fallback.
#   scripts/og-image.sh [out.png]
# CHROME_FLAGS adds flags (CI passes --no-sandbox: the runner's AppArmor blocks
# Chrome's sandbox, and the page is this repo's own).
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
out="${1:-$root/site/og.png}"
port="${OG_PORT:-8765}"
chrome="${CHROME:-google-chrome}"

python3 -m http.server "$port" --bind 127.0.0.1 --directory "$root/site" >/dev/null 2>&1 &
server=$!
tmp="$(mktemp -d)"
trap 'kill "$server" 2>/dev/null || true; rm -rf "$tmp"' EXIT

for _ in $(seq 50); do
  curl -sf "http://127.0.0.1:$port/og.html" >/dev/null && break
  sleep 0.1
done

# shellcheck disable=SC2086 # CHROME_FLAGS is a list of flags
"$chrome" --headless=new --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --virtual-time-budget=10000 --user-data-dir="$tmp/profile" \
  ${CHROME_FLAGS:-} --screenshot="$tmp/og.png" "http://127.0.0.1:$port/og.html" >/dev/null 2>&1

# A PNG of exactly 1200 x 630, or nothing is replaced.
python3 - "$tmp/og.png" <<'PY'
import struct, sys
with open(sys.argv[1], "rb") as f:
    head = f.read(24)
if head[:8] != b"\x89PNG\r\n\x1a\n" or struct.unpack(">II", head[16:24]) != (1200, 630):
    sys.exit(f"og-image: not a 1200x630 PNG: {head[:8]!r} {struct.unpack('>II', head[16:24])}")
PY
mv "$tmp/og.png" "$out"
echo "og-image: wrote $out"
