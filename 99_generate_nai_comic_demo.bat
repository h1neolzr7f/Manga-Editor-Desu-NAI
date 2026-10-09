@echo off
cd /d "%~dp0"
echo [WARN] Single full-page sample only, not the multi-panel comic editor.
echo Real workflow in the browser: panel template -^> director -^> per-panel images -^> review.
echo.
echo Generating 5-page NovelAI single-image demo...
node scripts\novelai-batch-tools.mjs comic
pause