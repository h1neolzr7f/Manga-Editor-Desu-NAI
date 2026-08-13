@echo off
cd /d "%~dp0"
echo Generating missing NovelAI material previews...
echo This uses the NovelAI token saved in the app settings, or NOVELAI_API_KEY / NAI_API_KEY.
node scripts\novelai-batch-tools.mjs previews --steps=28 --scale=7
pause
