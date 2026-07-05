#!/bin/bash
# Open Source Barware — Chrome Program Installer (OVLP POP pattern)
# Usage: curl -fsSL https://raw.githubusercontent.com/RichardBJamison/open-source-barware/main/program/install.sh | bash

set -e

INSTALL_DIR="$HOME/osb-program"
PLIST_LABEL="com.opensourcebarware.program"
PLIST="$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"
PORT=5052
GITHUB_RAW="https://raw.githubusercontent.com/RichardBJamison/open-source-barware/main/program"

clear
echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║   Open Source Barware — Chrome Program Install   ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

# Python 3
echo "  [1/6] Checking Python 3..."
PYTHON=""
for candidate in /usr/bin/python3 /usr/local/bin/python3 /opt/homebrew/bin/python3; do
  if "$candidate" --version >/dev/null 2>&1; then
    version=$("$candidate" --version 2>&1)
    if echo "$version" | grep -q "Python 3"; then
      PYTHON="$candidate"
      echo "  ✓ $version"
      break
    fi
  fi
done
if [ -z "$PYTHON" ]; then
  echo "  ✗ Python 3 not found. Install from https://www.python.org/downloads"
  exit 1
fi

echo "  [2/6] Installing dependencies..."
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
REQ_FILE="$SOURCE_DIR/requirements.txt"
if [ ! -f "$REQ_FILE" ]; then
  REQ_FILE="/tmp/osb-requirements.txt"
  curl -fsSL "$GITHUB_RAW/requirements.txt" -o "$REQ_FILE"
fi
"$PYTHON" -m pip install -r "$REQ_FILE" --user --quiet 2>&1 | grep -iE "error" | head -3 || true
if ! "$PYTHON" -c "import flask" 2>/dev/null; then
  echo "  ✗ Flask failed to install."
  exit 1
fi
echo "  ✓ Dependencies ready"

echo "  [3/6] Installing program files..."
mkdir -p "$INSTALL_DIR/static/css" "$INSTALL_DIR/static/js" "$INSTALL_DIR/data"

fetch_or_copy() {
  local rel="$1"
  local dest="$INSTALL_DIR/$rel"
  mkdir -p "$(dirname "$dest")"
  if [ -f "$SOURCE_DIR/$rel" ]; then
    cp "$SOURCE_DIR/$rel" "$dest"
  else
    curl -fsSL "$GITHUB_RAW/$rel" -o "$dest"
  fi
}

fetch_or_copy "server.py"
fetch_or_copy "invoice_parse.py"
fetch_or_copy "requirements.txt"
fetch_or_copy "osb_config.example.json"
fetch_or_copy "static/setup.html"
fetch_or_copy "static/home.html"
fetch_or_copy "static/api-guide.html"
fetch_or_copy "static/standard-setups.html"
fetch_or_copy "static/css/app.css"
fetch_or_copy "static/js/osb-app.js"
mkdir -p "$INSTALL_DIR/static/downloads"
fetch_or_copy "static/downloads/Bar-Inventory-Master.xlsx"

if [ ! -f "$INSTALL_DIR/osb_config.json" ]; then
  cp "$INSTALL_DIR/osb_config.example.json" "$INSTALL_DIR/osb_config.json"
fi
echo "  ✓ Files installed to $INSTALL_DIR"

echo "  [4/6] Setting up auto-start..."
mkdir -p "$HOME/Library/LaunchAgents"
launchctl bootout gui/$(id -u) "$PLIST" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null || true

cat > "$PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${PLIST_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${PYTHON}</string>
    <string>${INSTALL_DIR}/server.py</string>
  </array>
  <key>WorkingDirectory</key><string>${INSTALL_DIR}</string>
  <key>KeepAlive</key><true/>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>/tmp/osb_program.log</string>
  <key>StandardErrorPath</key><string>/tmp/osb_program.log</string>
</dict>
</plist>
EOF

launchctl bootstrap gui/$(id -u) "$PLIST" 2>/dev/null || launchctl load "$PLIST" 2>/dev/null || true
echo "  ✓ Auto-start enabled"

echo "  [5/6] Restarting server..."
launchctl kickstart -k "gui/$(id -u)/${PLIST_LABEL}" 2>/dev/null || true
sleep 2

echo "  [6/6] Verifying..."
for i in $(seq 1 15); do
  if curl -s "http://localhost:${PORT}/ping" >/dev/null 2>&1; then
    echo "  ✓ Server running"
    break
  fi
  sleep 1
done

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║  ✓ Setup complete!                               ║"
echo "  ║                                                  ║"
echo "  ║  Program:  http://localhost:${PORT}/             ║"
echo "  ║  Bookmark that URL in Chrome.                    ║"
echo "  ║  Starts automatically when you log in.           ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

open "http://localhost:${PORT}/" 2>/dev/null || true