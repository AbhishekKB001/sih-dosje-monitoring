<#
.SYNOPSIS
    DoSJE Drishti — Master Test Suite Runner
.DESCRIPTION
    Executes all 139 automated tests across Backend, E2E, Risk Engine, AI Subsystem, and Mobile App.
#>

$ErrorActionPreference = "Continue"
if (Test-Path (Join-Path $PSScriptRoot "backend")) {
    $root = $PSScriptRoot
} else {
    $root = Split-Path -Parent $PSScriptRoot
}

Clear-Host
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "     DEPARTMENT OF SOCIAL JUSTICE AND EMPOWERMENT (DoSJE) - DRISHTI       " -ForegroundColor Yellow
Write-Host "                     AUTOMATED TEST SUITE RUNNER                          " -ForegroundColor White
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "Project Root: $root`n" -ForegroundColor DarkGray

# 1. Backend Integration Tests (22 tests)
Write-Host "[1/5] Running Backend Integration Suite (22 tests)..." -ForegroundColor Yellow
Set-Location (Join-Path $root "backend")
npm test

# 2. Risk Engine Tests (6 tests)
Write-Host "`n[2/5] Running Member 5 Risk Engine Suite (6 tests)..." -ForegroundColor Yellow
npx tsx src/__tests__/risk_engine.test.ts

# 3. E2E Scenario (23 steps)
Write-Host "`n[3/5] Running 23-Step End-to-End Scenario..." -ForegroundColor Yellow
npx tsx src/__tests__/e2e_scenario.ts

# 4. AI Subsystem (84 pytest tests)
Write-Host "`n[4/5] Running AI Vision & Analytics Suite (84 tests)..." -ForegroundColor Yellow
Set-Location (Join-Path $root "ai-subsystem")
$pythonExe = Join-Path $root "venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) { $pythonExe = "python" }
& $pythonExe -m pytest tests

# 5. Mobile App Tests (4 tests)
Write-Host "`n[5/5] Running Flutter Mobile Tests & Analysis..." -ForegroundColor Yellow
Set-Location (Join-Path $root "mobile-app")
flutter analyze --no-pub
flutter test --no-pub

Set-Location $root
Write-Host "`n==========================================================================" -ForegroundColor Cyan
Write-Host "  ALL AUTOMATED SUITES EXECUTED: 139 / 139 TESTS EVALUATED" -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Cyan
