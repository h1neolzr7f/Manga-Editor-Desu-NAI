@echo off
setlocal EnableExtensions

cd /d "%~dp0" || (
  echo Failed to enter the application directory.
  exit /b 1
)

set "launcher=%~dp0start_manga_editor_nai.ps1"
if not exist "%launcher%" (
  echo Launcher script not found: "%launcher%"
  exit /b 1
)

set "powershell_exe=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%powershell_exe%" set "powershell_exe=powershell.exe"

"%powershell_exe%" -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -File "%launcher%"
set "exit_code=%errorlevel%"

endlocal & exit /b %exit_code%
