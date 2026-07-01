#!/bin/bash
# Open Source Barware — Chrome Program Installer (OVLP POP pattern)
# Usage: curl -fsSL <raw-url>/install.sh | bash

set -e

INSTALL_DIR="$HOME/osb-program"
PLIST_LABEL="com.opensourcebarware.program"
PLIST="$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"
PORT=5052

clear
echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║   Open Source Barware — Chrome Program Install   ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

# Python 3
echo "  [1/5] Checking Python 3..."
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

echo "  [2/5] Installing Flask..."
"$PYTHON" -m pip install flask --user --quiet 2>&1 | grep -iE "error|already" | head -3 || true
if ! "$PYTHON" -c "import flask" 2>/dev/null; then
  echo "  ✗ Flask failed to install."
  exit 1
fi
echo "  ✓ Flask ready"

echo "  [3/5] Installing program files..."
mkdir -p "$INSTALL_DIR/static/css" "$INSTALL_DIR/static/js" "$INSTALL_DIR/data"
# NOTE: In production this pulls from GitHub raw. Dev copy uses local SOURCE_DIR when run from repo.
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SOURCE_DIR/server.py" "$INSTALL_DIR/"
cp "$SOURCE_DIR/static/setup.html" "$INSTALL_DIR/static/"
cp "$SOURCE_DIR/static/home.html" "$INSTALL_DIR/static/"
cp "$SOURCE_DIR/static/api-guide.html" "$INSTALL_DIR/static/"
cp "$SOURCE_DIR/static/css/app.css" "$INSTALL_DIR/static/css/"
cp "$SOURCE_DIR/static/js/osb-app.js" "$INSTALL_DIR/static/js/"
cp "$SOURCE_DIR/osb_config.example.json" "$INSTALL_DIR/"
if [ ! -f "$INSTALL_DIR/osb_config.json" ]; then
  cp "$INSTALL_DIR/osb_config.example.json" "$INSTALL_DIR/osb_config.json"
fi
echo "  ✓ Files installed to $INSTALL_DIR"

echo "  [4/5] Setting up auto-start..."
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

echo "  [5/5] Starting server..."
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