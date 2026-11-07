@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 22 is required. Install Node.js, then run this file again.
  pause
  exit /b 1
)
node -e "process.exit(parseInt(process.versions.node,10) < 22 ? 1 : 0)"
if errorlevel 1 (
  echo Node.js 22 or newer is required.
  pause
  exit /b 1
)
if not exist "..\node_modules\typescript\lib\typescript.js" (
  echo Project dependencies are missing. Run npm ci in KMNZ2.0 first.
  pause
  exit /b 1
)
where gh >nul 2>&1
if errorlevel 1 echo GitHub CLI is missing. Local preview is available; PR creation is disabled.
node server.mjs --open
if errorlevel 1 (
  pause
  exit /b 1
)
