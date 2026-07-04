Open Source Barware — Chrome Program Install
============================================

This is NOT a Chrome Web Store extension. The program runs locally on your
computer and opens in Chrome at http://localhost:5052/

MAC
---
1. Unzip the download folder anywhere (Desktop is fine for the zip).
2. Double-click Install.command
3. If Mac says "unidentified developer": right-click Install.command → Open → Open
4. Bookmark http://localhost:5052/ in Chrome
5. Daily use: it starts when you log in. Manual start: Start.command

WINDOWS
-------
1. Unzip the download folder.
2. Double-click Install.bat
3. If SmartScreen warns: More info → Run anyway
4. First run needs Python 3 from python.org (check "Add to PATH")
5. Bookmark http://localhost:5052/ in Chrome
6. Daily use: starts from Startup folder. Manual: Start.bat

TROUBLESHOOTING
---------------
- Ping test: http://localhost:5052/ping should return JSON with status ok
- Logs: ~/osb-program/data/osb_server.log (Mac)
        %USERPROFILE%\osb-program\data\osb_server.log (Windows)
- Stop: Stop.command (Mac) or Stop.bat (Windows)
- Re-install: run Install again (keeps data/ if present)

Support: https://opensourcebarware.com/the-process