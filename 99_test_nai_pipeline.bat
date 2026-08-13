@echo off
cd /d "%~dp0"
echo NAI pipeline smoke test (NovelAI + Director proxy)
echo Uses tokens from browser localSettings or NOVELAI_API_KEY / TOKENDANCE_API_KEY env.
echo Ensure 99_server.py is running on port 8000 (use start_manga_editor_nai.ps1).
node scripts/nai-pipeline-smoke-test.mjs
set ERR=%ERRORLEVEL%
echo.
if %ERR% NEQ 0 (
  echo Tests failed. See messages above.
  pause
  exit /b %ERR%
)
echo All tests passed.
pause
exit /b 0