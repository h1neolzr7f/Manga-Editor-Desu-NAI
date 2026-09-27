@echo off
rem ASCII-only on purpose: changing the console codepage in the middle of a batch
rem file makes cmd.exe resume reading at shifted byte offsets and mangle non-ASCII
rem lines. All Chinese UI text lives in start_manga_editor_nai.ps1 instead.
chcp 65001 >nul
title Manga Editor Desu NAI
cd /d "%~dp0"

rem Forward optional launcher switches, e.g. -NoBrowser / -NoPrompt. A plain
rem double-click passes none of them, which is the normal mode.
call "%~dp0start_manga_editor_nai.bat" %*
set "NAI_EXIT=%ERRORLEVEL%"

echo.
if not "%NAI_EXIT%"=="0" (
  echo  ========================================
  echo   Startup failed. See user_data\start.log
  echo  ========================================
  echo.
  pause
  exit /b %NAI_EXIT%
)

echo  ========================================
echo   Local service stopped. You can close this window.
echo  ========================================
echo.
pause
exit /b 0
