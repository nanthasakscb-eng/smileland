@echo off
chcp 65001 >nul
title SMILELAND - Deploy to Cloudflare
cd /d "%~dp0"
echo.
echo ===== SMILELAND : Deploy to Cloudflare =====
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js not found. Install the LTS version from https://nodejs.org then run this file again.
  pause
  exit /b 1
)
echo [1/3] Installing packages...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo [X] npm install failed.
  pause
  exit /b 1
)
echo.
echo [2/3] Checking Cloudflare login...
call npx wrangler whoami > "%TEMP%\sl_whoami.txt" 2>&1
findstr /i /c:"not authenticated" "%TEMP%\sl_whoami.txt" >nul
if not errorlevel 1 (
  echo A browser window will open. Log in to Cloudflare and click "Allow".
  call npx wrangler login
)
echo.
echo [3/3] Creating resources, database and deploying...
set SL_NONINTERACTIVE=1
set SL_DEMO=1
call node scripts\deploy-first-time.mjs
echo.
if exist ADMIN-PASSWORD.txt (
  echo ===== Admin login - also saved in ADMIN-PASSWORD.txt =====
  type ADMIN-PASSWORD.txt
)
echo.
pause
