@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0start_manga_editor_nai.ps1"
if errorlevel 1 (
  echo.
  echo 启动失败，请查看 user_data\start.log
  pause
)
