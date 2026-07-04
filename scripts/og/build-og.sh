#!/bin/bash
# Renders scripts/og/og-source.html -> public/images/og-image.jpg (1200x630)
# Faithful to the live homepage hero. Re-run whenever the hero art/copy changes.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 \
  --virtual-time-budget=5000 \
  --window-size=1200,630 \
  --screenshot="$DIR/og-raw.png" \
  "file://$DIR/og-source.html"

# Downscale the 2x capture to a crisp 1200x630 JPEG
sips -z 630 1200 "$DIR/og-raw.png" --setProperty format jpeg \
  --out "$ROOT/public/images/og-image.jpg" >/dev/null
rm -f "$DIR/og-raw.png"
echo "Wrote public/images/og-image.jpg"
