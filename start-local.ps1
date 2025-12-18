# Start Local Development Environment
# Runs services without Docker (except database)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  IMS Local Development Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Python
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python 3\.(1[1-9]|[2-9][0-9])") {
        Write-Host "  [OK] Python: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Python 3.11+ required. Found: $pythonVersion" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  [FAIL] Python not found. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Host "  [OK] Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version 2>&1
    Write-Host "  [OK] npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] npm not found" -ForegroundColor Red
    exit 1
}

# Start database services (Docker)
Write-Host "`nStarting database services (Docker)..." -ForegroundColor Yellow
docker-compose up -d postgres minio 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Database services started" -ForegroundColor Green
    Write-Host "  Waiting for services to be ready..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
} else {
    Write-Host "  [WARN] Could not start database services. Make sure Docker is running." -ForegroundColor Yellow
    Write-Host "  You can start them manually: docker-compose up -d postgres minio" -ForegroundColor Gray
}

# Service definitions
$services = @(
    @{Name="auth-service"; Port=5001; Path="services/auth-service"},
    @{Name="user-service"; Port=5002; Path="services/user-service"},
    @{Name="patient-service"; Port=5003; Path="services/patient-service"},
    @{Name="medical-staff-service"; Port=5004; Path="services/medical-staff-service"},
    @{Name="medical-image-service"; Port=5005; Path="services/medical-image-service"},
    @{Name="diagnostic-report-service"; Port=5006; Path="services/diagnostic-report-service"},
    @{Name="billing-service"; Port=5007; Path="services/billing-service"},
    @{Name="workflow-service"; Port=5008; Path="services/workflow-service"}
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Service Startup Instructions" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Start each service in a separate terminal window:" -ForegroundColor Yellow
Write-Host ""

foreach ($service in $services) {
    Write-Host "  $($service.Name) (Port $($service.Port)):" -ForegroundColor Cyan
    Write-Host "    cd $($service.Path)" -ForegroundColor Gray
    Write-Host "    python -m venv venv" -ForegroundColor Gray
    Write-Host "    .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
    Write-Host "    pip install -r requirements.txt" -ForegroundColor Gray
    Write-Host "    uvicorn main:app --host 0.0.0.0 --port $($service.Port) --reload" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "  Frontend:" -ForegroundColor Cyan
Write-Host "    cd frontend" -ForegroundColor Gray
Write-Host "    npm install" -ForegroundColor Gray
Write-Host "    npm start" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Service URLs" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Frontend:        http://localhost:3000" -ForegroundColor White
Write-Host "MinIO Console:   http://localhost:9001" -ForegroundColor White
Write-Host ""

foreach ($service in $services) {
    Write-Host "$($service.Name.PadRight(25)) http://localhost:$($service.Port)" -ForegroundColor White
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

