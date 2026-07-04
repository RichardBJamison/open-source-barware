@echo off
title Stop Open Source Barware
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5052 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
echo Server on port 5052 stopped (if it was running).
pause