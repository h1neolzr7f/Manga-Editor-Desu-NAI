@echo off
rem ASCII-only on purpose (see the start launcher): Chinese text lives in scripts\install-ai.ps1.
chcp 65001 >nul
cd /d "%~dp0"
set "powershell_exe=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%powershell_exe%" set "powershell_exe=powershell.exe"
"%powershell_exe%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-ai.ps1"
set "rc=%ERRORLEVEL%"
echo.
pause
exit /b %rc%
