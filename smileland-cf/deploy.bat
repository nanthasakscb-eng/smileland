@echo off
chcp 65001 >nul
title Isan Na Yoo - Deploy to Cloudflare
cd /d "%~dp0"
echo.
echo ===== Isan Na Yoo (SMILELAND) : Deploy to Cloudflare =====
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
:checklogin
call npx wrangler whoami > "%TEMP%\sl_whoami.txt" 2>&1
findstr /i /c:"not authenticated" "%TEMP%\sl_whoami.txt" >nul
if not errorlevel 1 goto dologin
echo.
echo ------------------------------------------------------------
findstr /i /c:"email" "%TEMP%\sl_whoami.txt"
echo ------------------------------------------------------------
choice /c YN /m "Deploy to THIS Cloudflare account? (Y = yes, N = log out and switch account)"
if errorlevel 2 goto switch
goto deploy

:switch
call npx wrangler logout
echo.
echo IMPORTANT: In the browser, first log out of Cloudflare (https://dash.cloudflare.com),
echo then log in with the correct email BEFORE clicking "Allow".
pause

:dologin
echo A browser window will open. Log in to Cloudflare with the correct email and click "Allow".
call npx wrangler login
goto checklogin

:deploy
echo.
echo [3/3] Updating database and deploying...
set SL_NONINTERACTIVE=1
call node scripts\deploy-update.mjs
echo.
if exist ADMIN-PASSWORD.txt (
  echo ===== Admin login - also saved in ADMIN-PASSWORD.txt =====
  type ADMIN-PASSWORD.txt
)
echo.
pause
