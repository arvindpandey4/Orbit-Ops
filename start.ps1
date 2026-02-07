# ============================================
# Task Management System - Startup Script
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Task Management System - Starting" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "[1/6] Checking Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "[OK] Docker is running" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if .env files exist
Write-Host ""
Write-Host "[2/6] Checking environment files..." -ForegroundColor Yellow
if (-not (Test-Path "backend\.env")) {
    Write-Host "[INFO] backend\.env not found. Copying from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" "backend\.env"
        Write-Host "[OK] Created backend\.env" -ForegroundColor Green
    }
    else {
        Write-Host "[ERROR] .env.example not found." -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path "frontend\.env")) {
    Write-Host "[INFO] frontend\.env not found. Creating default..." -ForegroundColor Yellow
    "VITE_API_URL=http://localhost:5000" | Out-File -FilePath "frontend\.env" -Encoding utf8
    "VITE_SOCKET_URL=http://localhost:5000" | Out-File -FilePath "frontend\.env" -Append -Encoding utf8
    Write-Host "[OK] Created frontend\.env" -ForegroundColor Green
}

Write-Host "[OK] Environment files ready" -ForegroundColor Green

# Start Docker containers
Write-Host ""
Write-Host "[3/6] Starting Docker containers (Redis, RabbitMQ)..." -ForegroundColor Yellow
docker-compose up -d redis rabbitmq

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Docker containers started" -ForegroundColor Green
}
else {
    Write-Host "[ERROR] Failed to start Docker containers" -ForegroundColor Red
    exit 1
}

# Wait for services
Write-Host ""
Write-Host "[4/6] Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$maxRetries = 30
$retryCount = 0
$allHealthy = $false

while (-not $allHealthy -and $retryCount -lt $maxRetries) {
    # Only check Redis and RabbitMQ
    $redisHealth = docker inspect --format='{{.State.Health.Status}}' task_management_redis 2>$null
    $rabbitHealth = docker inspect --format='{{.State.Health.Status}}' task_management_rabbitmq 2>$null
    
    if ($redisHealth -eq "healthy" -and $rabbitHealth -eq "healthy") {
        $allHealthy = $true
        Write-Host "[OK] All services are healthy" -ForegroundColor Green
    }
    else {
        $retryCount++
        Write-Host "  Waiting... ($retryCount/$maxRetries) [Redis: $redisHealth | RabbitMQ: $rabbitHealth]" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $allHealthy) {
    Write-Host "[ERROR] Services failed to become healthy." -ForegroundColor Red
    exit 1
}

# Install backend dependencies
Write-Host ""
Write-Host "[5/6] Installing backend dependencies..." -ForegroundColor Yellow
Push-Location backend
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Backend dependencies installed" -ForegroundColor Green
    }
    else {
        Write-Host "[ERROR] Failed to install backend dependencies" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}
else {
    Write-Host "[OK] Backend dependencies already installed" -ForegroundColor Green
}
Pop-Location

# Install frontend dependencies
Write-Host ""
Write-Host "[6/6] Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location frontend
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Frontend dependencies installed" -ForegroundColor Green
    }
    else {
        Write-Host "[ERROR] Failed to install frontend dependencies" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}
else {
    Write-Host "[OK] Frontend dependencies already installed" -ForegroundColor Green
}
Pop-Location

# Start backend and frontend
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Application Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend API:      http://localhost:5000" -ForegroundColor Green
Write-Host "Frontend App:     http://localhost:5173" -ForegroundColor Green
Write-Host "MongoDB:          Connected to Atlas Cluster" -ForegroundColor Green
Write-Host "RabbitMQ Admin:   http://localhost:15673 (guest/guest)" -ForegroundColor Green
Write-Host ""

# Start backend in new terminal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host 'Starting Backend Server (Using MongoDB Atlas)...' -ForegroundColor Cyan; npm run dev"

# Wait a bit before starting frontend
Start-Sleep -Seconds 3

# Start frontend in new terminal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host 'Starting Frontend Server...' -ForegroundColor Cyan; npm run dev"

Write-Host "[OK] Application started successfully!" -ForegroundColor Green
Write-Host ""
