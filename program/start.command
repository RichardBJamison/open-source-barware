#!/bin/bash
# Open Source Bar Program — one-click launcher (macOS)
cd "$(dirname "$0")"
echo ""
echo "  Open Source Bar Program"
echo "  ----------------------------------------"
if [ ! -d ".venv" ]; then
  echo "  First run: setting up (installs Flask, ~20s)..."
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt 2>/dev/null
echo "  Ready. Open this in Chrome:  http://localhost:5052/"
echo "  (Leave this window open. Press Ctrl+C to stop.)"
echo ""
python3 server.py
