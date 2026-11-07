@echo off
chcp 65001 >nul
title Isan Na Yoo - Reset admin password
cd /d "%~dp0"
call node scripts\reset-admin.mjs
echo.
pause
