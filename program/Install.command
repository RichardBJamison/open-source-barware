#!/bin/bash
# Open Source Barware — Mac first-time setup (double-click)
set -e

INSTALL_DIR="$HOME/osb-program"
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_LABEL="com.opensourcebarware.program"
PLIST="$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"
PORT=5052

clear
echo ""
echo "  Open Source Barware — Mac Install"
echo "  ---------------------------------"
echo ""

echo "  [1/7] Checking Python 3..."
PYTHON=""
for candidate in /opt/homebrew/bin/python3 /usr/local/bin/python3 /usr/bin/python3; do
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
  echo "  ✗ Python 3 not found. Install from https://www.python.org/downloads/"
  read -p "  Press Enter to exit..."
  exit 1
fi

echo "  [2/7] Installing to $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR/data" "$INSTALL_DIR/static/css" "$INSTALL_DIR/static/js"
for rel in server.py invoice_parse.py requirements.txt osb_config.example.json install.sh Install.command Start.command Stop.command README-INSTALL.txt LICENSE.txt VERSION.txt install.ps1 Install.bat Start.bat Stop.bat start-server.ps1; do
  if [ -f "$SOURCE_DIR/$rel" ]; then
    cp "$SOURCE_DIR/$rel" "$INSTALL_DIR/$rel"
    chmod +x "$INSTALL_DIR/$rel" 2>/dev/null || true
  fi
done
for rel in static/setup.html static/home.html static/api-guide.html static/standard-setups.html static/css/app.css static/js/osb-app.js static/downloads/Bar-Inventory-Master.xlsx; do
  mkdir -p "$INSTALL_DIR/$(dirname "$rel")"
  cp "$SOURCE_DIR/$rel" "$INSTALL_DIR/$rel"
done
if [ ! -f "$INSTALL_DIR/osb_config.json" ]; then
  cp "$INSTALL_DIR/osb_config.example.json" "$INSTALL_DIR/osb_config.json"
fi
echo "  ✓ Files installed"

echo "  [3/7] Creating virtual environment..."
"$PYTHON" -m venv "$INSTALL_DIR/.venv"
VENV_PY="$INSTALL_DIR/.venv/bin/python3"
echo "  ✓ venv ready"

echo "  [4/7] Installing dependencies..."
"$VENV_PY" -m pip install --upgrade pip --quiet
"$VENV_PY" -m pip install -r "$INSTALL_DIR/requirements.txt" --quiet
if ! "$VENV_PY" -c "import flask, openpyxl" 2>/dev/null; then
  echo "  ✗ Dependency install failed."
  read -p "  Press Enter to exit..."
  exit 1
fi
echo "  ✓ Dependencies ready"

echo "  [5/7] Setting up auto-start..."
mkdir -p "$HOME/Library/LaunchAgents"
launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null || true
cat > "$PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${PLIST_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${VENV_PY}</string>
    <string>${INSTALL_DIR}/server.py</string>
  </array>
  <key>WorkingDirectory</key><string>${INSTALL_DIR}</string>
  <key>KeepAlive</key><true/>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>${INSTALL_DIR}/data/osb_server.log</string>
  <key>StandardErrorPath</key><string>${INSTALL_DIR}/data/osb_server.log</string>
</dict>
</plist>
EOF
launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null || launchctl load "$PLIST" 2>/dev/null || true
echo "  ✓ Auto-start enabled"

echo "  [6/7] Starting server..."
lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
launchctl kickstart -k "gui/$(id -u)/${PLIST_LABEL}" 2>/dev/null || true
for i in $(seq 1 20); do
  if curl -s "http://localhost:${PORT}/ping" >/dev/null 2>&1; then
    echo "  ✓ Server running"
    break
  fi
  sleep 1
  if [ "$i" -eq 20 ]; then
    echo "  ✗ Server slow to start. Check ${INSTALL_DIR}/data/osb_server.log"
    read -p "  Press Enter to exit..."
    exit 1
  fi
done

echo "  [7/7] Opening Chrome..."
open "http://localhost:${PORT}/" 2>/dev/null || true

echo ""
echo "  Setup complete!"
echo "  Program:  http://localhost:${PORT}/"
echo "  Bookmark that URL in Chrome."
echo "  Log:      ${INSTALL_DIR}/data/osb_server.log"
echo ""
read -p "  Press Enter to close..."