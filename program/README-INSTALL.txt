Open Source Barware — Chrome Program v1.0
==========================================
July 4, 2026 release · Free · GPL-3.0-or-later

WHAT YOU DOWNLOADED
-------------------
A self-contained bar inventory program. It runs on YOUR computer in Chrome
at http://localhost:5052/ — no subscription, no cloud account required.

Voice walks, counts, spreadsheets, PAR levels, and weekly Process all work
without AI. Optional AI (in setup or Settings) is only for reading invoice
photos from your phone — you can always type numbers yourself.

LICENSE: GNU GPL v3 or later. See LICENSE.txt in this folder.


MAC INSTALL (5 minutes)
-----------------------
1. Double-click the downloaded .zip once to unzip it.
2. Open the folder "open-source-barware-program".
3. Double-click START-HERE-MAC.html (opens in your browser — no Mac block).
   Or read step 4 here if you prefer.
4. macOS will block a normal double-click on Install.command ("unidentified
   developer"). That is expected for free software without an Apple cert.
   FIX: Right-click Install.command → Open → Open (confirm once).
   Terminal option:
     cd ~/Downloads/open-source-barware-program
     xattr -cr .
     chmod +x Install.command
     ./Install.command
5. Wait for "Setup complete!" — Chrome opens to your program.
6. Bookmark http://localhost:5052/ in Chrome. That bookmark IS the software.

The program installs to:  ~/osb-program
It starts automatically when you log in.


WINDOWS INSTALL (5–10 minutes)
------------------------------
1. Right-click the .zip → Extract All.
2. Open the folder "open-source-barware-program".
3. Double-click Install.bat
4. If SmartScreen warns: More info → Run anyway
5. If Python is missing: install from https://www.python.org/downloads/
   Check "Add python.exe to PATH" during setup, then run Install.bat again.
6. Wait for "Setup complete!" — your browser opens to the program.
7. Bookmark http://localhost:5052/ in Chrome or Edge.

The program installs to:  %USERPROFILE%\osb-program
It starts automatically when you log in (Startup folder shortcut).


FIRST RUN
---------
The welcome screen walks you through mapping your bar. AI connection is
optional — skip it and use the full program immediately. Add AI later in
Settings only if you want invoice photos read automatically.


DAILY USE
---------
Open your bookmark: http://localhost:5052/

Manual start:
  Mac:     double-click Start.command (in ~/osb-program)
  Windows: double-click Start.bat (in %USERPROFILE%\osb-program)

Stop:
  Mac:     Stop.command
  Windows: Stop.bat


VERIFY IT WORKS
---------------
Open in your browser: http://localhost:5052/ping
You should see JSON with "status": "ok"

If not, check the log:
  Mac:     ~/osb-program/data/osb_server.log
  Windows: %USERPROFILE%\osb-program\data\osb_server.log


CLEAN UP YOUR DOWNLOADS FOLDER (after install succeeds)
-------------------------------------------------------
Once Install finishes and the program opens in your browser, you do NOT
need the download files anymore. The live program is in ~/osb-program (Mac)
or %USERPROFILE%\osb-program (Windows).

Safe to delete:
  • The .zip file in Downloads (e.g. open-source-barware-program-mac.zip)
  • The unzipped "open-source-barware-program" folder on Desktop or Downloads

Keep (already copied for you):
  • Everything in ~/osb-program or %USERPROFILE%\osb-program
  • Your Chrome bookmark to http://localhost:5052/


UNINSTALL
---------
1. Run Stop.command (Mac) or Stop.bat (Windows)
2. Mac: delete ~/Library/LaunchAgents/com.opensourcebarware.program.plist
        then: launchctl bootout gui/$(id -u) com.opensourcebarware.program
3. Windows: delete the shortcut "Open Source Barware" from your Startup folder
4. Delete the install folder:
   Mac:     rm -rf ~/osb-program
   Windows: delete %USERPROFILE%\osb-program


UPDATES
-------
Check https://opensourcebarware.com/download every few weeks for v1.1+.
Join the release list on the download page for email when new builds ship.
Re-run Install.command or Install.bat over your existing install — your
bar data in the data/ folder is preserved.


SUPPORT & SOURCE
----------------
Guide:    https://opensourcebarware.com/the-process
Email:    richard@opensourcebarware.com
Source:   https://github.com/RichardBJamison/open-source-barware
Website:  https://opensourcebarware.com