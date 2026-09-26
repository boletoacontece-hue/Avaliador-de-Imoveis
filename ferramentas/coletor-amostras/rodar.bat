@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Preparando o coletor (so demora na primeira vez)...
py -m pip install -q -r requirements.txt
py -m playwright install chromium
echo.
py coletor.py
echo.
pause
