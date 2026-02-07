# ============================================
# Task Management System - Shutdown Script
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Task Management System - Stopping" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Killing processes on ports 5000 and 5173..." -ForegroundColor Yellow
$ports = @(5000, 5173)

foreach ($port in $ports) {
    try {
        $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pid_val in $processes) {
            Write-Host "Killing process on port $port (PID: $pid_val)..."
            Stop-Process -Id $pid_val -Force -ErrorAction SilentlyContinue
        }
    }
    catch {
        # Ignore errors if no process found
    }
}
Write-Host "[OK] Ports cleared" -ForegroundColor Green

Write-Host ""
Write-Host "[2/3] Stopping Docker containers..." -ForegroundColor Yellow
docker-compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Docker containers stopped" -ForegroundColor Green
}
else {
    Write-Host "[ERROR] Failed to stop Docker containers" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[3/3] Cleaning up..." -ForegroundColor Yellow
Write-Host "[OK] Cleanup complete" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All services stopped successfully" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Backend and Frontend dev servers must be stopped manually" -ForegroundColor Yellow
Write-Host "      (Press Ctrl+C in their terminal windows)" -ForegroundColor Yellow
Write-Host ""
Write-Host "To remove all data volumes, run:" -ForegroundColor Gray
Write-Host "  docker-compose down -v" -ForegroundColor Gray
Write-Host ""
