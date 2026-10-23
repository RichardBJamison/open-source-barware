#!/bin/bash
INSTALL_DIR="$HOME/osb-program"
PORT=5052
VENV_PY="$INSTALL_DIR/.venv/bin/python3"

clear
echo "  Open Source Barware — Start"
if [ ! -f "$INSTALL_DIR/server.py" ]; then
  echo "  Run Install.command first."
  read -p "  Press Enter..."; exit 1
fi
lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
"$VENV_PY" "$INSTALL_DIR/server.py" >> "$INSTALL_DIR/data/osb_server.log" 2>&1 &
for i in $(seq 1 15); do
  curl -s "http://localhost:${PORT}/ping" >/dev/null 2>&1 && break
  sleep 1
done
open "http://localhost:${PORT}/"
read -p "  Press Enter to close..."