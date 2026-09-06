@echo off
title DoSJE AI Vision Subsystem (Port 8000)
cd /d "%~dp0..\ai-subsystem"
echo ================================================================
echo  Starting DoSJE AI Vision Subsystem on Port 8000...
echo ================================================================
set PYTHON=..\venv\Scripts\python.exe
if not exist "%PYTHON%" set PYTHON=python
"%PYTHON%" run_ai_cctv_server.py
pause
