@echo off
chcp 65001 >nul
title Isan Na Yoo - Check email
cd /d "%~dp0"
call node scripts\check-mail.mjs
echo.
pause
