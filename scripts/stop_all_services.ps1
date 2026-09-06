<#
.SYNOPSIS
    DoSJE Drishti - Clean Platform Shutdown Script
.DESCRIPTION
    Gracefully stops the Central Backend (port 4000), AI & CCTV Streamer (port 8000),
    and Admin Web (port 5173). Leaves the Android Emulator and Flutter untouched.
#>

$ports = @(4000, 8000, 5173)
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "           STOPPING ALL DoSJE DRISHTI DEMO SERVICES                       " -ForegroundColor Yellow
Write-Host "==========================================================================" -ForegroundColor Cyan

foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($conn in $conns) {
                $pidToKill = $conn.OwningProcess
                if ($pidToKill -gt 4) {
                    $proc = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
                    $procName = if ($proc) { $proc.ProcessName } else { "PID $pidToKill" }
                    Write-Host "  Stopping service on Port $port ($procName, PID: $pidToKill)..." -ForegroundColor Cyan
                    
                    # Kill process tree with taskkill, falling back to Stop-Process
                    & taskkill /F /T /PID $pidToKill 2>$null
                    if ($proc) {
                        Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                    }
                    Write-Host "  [OK] Cleared Port $port" -ForegroundColor Green
                }
            }
        } else {
            Write-Host "  [OK] Port $port is not running." -ForegroundColor DarkGray
        }
    } catch {
        Write-Host "  [!] Error checking Port $port: $_" -ForegroundColor DarkYellow
    }
}

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "  Platform services stopped. (Android Emulator & Mobile App preserved)   " -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Cyan
Start-Sleep -Seconds 2
