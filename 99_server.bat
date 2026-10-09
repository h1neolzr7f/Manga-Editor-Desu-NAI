@echo off
rem Run the local server from the repository folder even when started elsewhere.
cd /d "%~dp0"
python 99_server.py
