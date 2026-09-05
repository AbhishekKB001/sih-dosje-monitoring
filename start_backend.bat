@echo off
title DoSJE Central Backend API (Port 4000)
cd /d "%~dp0backend"
echo ================================================================
echo  Starting DoSJE Central Monitoring Backend on Port 4000...
echo ================================================================
npm run dev
pause
