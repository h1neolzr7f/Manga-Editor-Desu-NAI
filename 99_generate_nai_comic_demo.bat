@echo off
cd /d "%~dp0"
echo [WARN] 此脚本为整页单图样例，不是编辑器多格合成漫画。
echo 正式流程请用浏览器：分镜模板 -^> 导演 -^> 按格生图 -^> 人工审阅。
echo.
echo Generating 5-page NovelAI single-image demo...
node scripts\novelai-batch-tools.mjs comic
pause