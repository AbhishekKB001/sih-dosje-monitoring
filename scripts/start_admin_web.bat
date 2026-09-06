@echo off
title DoSJE React Admin Web Dashboard (Port 5173)
cd /d "%~dp0..\admin-web"
echo ================================================================
echo  Starting DoSJE React Admin Web Dashboard on Port 5173...
echo ================================================================
npm run dev
pause
