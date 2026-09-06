@echo off
title DoSJE Drishti - Run All Tests
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_all_tests.ps1"
pause
