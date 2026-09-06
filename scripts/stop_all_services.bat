@echo off
title DoSJE Drishti - Stop All Services
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop_all_services.ps1"
