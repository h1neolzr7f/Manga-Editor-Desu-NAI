@echo off
chcp 65001 >nul
title Manga Editor Desu · nai学长魔改版
cd /d "%~dp0"
echo.
echo  ========================================
echo   Manga Editor Desu  ·  nai学长魔改版
echo   致敬原作 new-sankaku / manga-editor-desu
echo  ========================================
echo.
echo  正在启动本机服务，请稍等...
echo  浏览器应打开 http://127.0.0.1:8000
echo  不要双击 index.html
echo.
call "%~dp0start_manga_editor_nai.bat"
if errorlevel 1 (
  echo.
  echo  启动失败。请查看 user_data\start.log，或重新运行安装程序。
  echo  也可打开「先看我.txt」
  pause
)
