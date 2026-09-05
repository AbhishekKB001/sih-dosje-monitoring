@echo off
title DoSJE AI Vision Subsystem (Port 8000)
cd /d "%~dp0"
echo ================================================================
echo  Starting DoSJE Member 4 AI Vision Subsystem on Port 8000...
echo ================================================================
.\venv\Scripts\python run_phase6_integration_demo.py
pause
