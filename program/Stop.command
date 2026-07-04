#!/bin/bash
lsof -ti :5052 | xargs kill -9 2>/dev/null || true
launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.opensourcebarware.program.plist" 2>/dev/null || true
echo "  Server stopped."
read -p "  Press Enter..."