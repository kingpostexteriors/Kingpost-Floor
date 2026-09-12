@echo off
title Kingpost Command
cd /d "%~dp0"

if exist ".git\" (
  echo Checking for updates...
  git pull --ff-only
)

set "KINGPOST_JIM_DIR=C:\Users\1951\KingpostJim"
if not exist "%KINGPOST_JIM_DIR%\gmail_pending_review.jsonl" (
  if exist "%~dp0..\KingpostJim\gmail_pending_review.jsonl" (
    set "KINGPOST_JIM_DIR=%~dp0..\KingpostJim"
  )
)

where node >nul 2>&1
if errorlevel 1 (
  start "" "https://nodejs.org/en/download"
  echo.
  echo Command needs Node.js on this PC, once.
  echo A download page just opened. Install the LTS version, then double-click Start Kingpost Command again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo First run — getting Command ready. This can take a few minutes. Leave this window open.
  call npm install
  if errorlevel 1 (
    echo Install failed. Check the internet and try again.
    pause
    exit /b 1
  )
)

echo Opening Kingpost Command. Leave this window open while you use it.
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8765"
call npm run floor:shop
pause
