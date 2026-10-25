@echo off
chcp 65001 >nul
title Isan Na Yoo - Set keys
cd /d "%~dp0"
call node scripts\set-keys.mjs
echo.
pause
