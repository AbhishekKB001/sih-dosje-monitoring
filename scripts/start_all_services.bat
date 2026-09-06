@echo off
title DoSJE Drishti - Platform Launcher
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_all_services.ps1"
