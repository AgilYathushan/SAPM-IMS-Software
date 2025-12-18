# Start All Services Locally in Background Windows
# Opens separate PowerShell windows for each service

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Starting All Services Locally" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$projectRoot = Get-Location

# Service definitions
$services = @(
    @{Name="auth-service"; Port=5001; Path="services\auth-service"},
    @{Name="user-service"; Port=5002; Path="services\user-service"},
    @{Name="patient-service"; Port=5003; Path="services\patient-service"},
    @{Name="medical-staff-service"; Port=5004; Path="services\medical-staff-service"},
    @{Name="medical-image-service"; Port=5005; Path="services\medical-image-service"},
    @{Name="diagnostic-report-service"; Port=5006; Path="services\diagnostic-report-service"},
    @{Name="billing-service"; Port=5007; Path="services\billing-service"},
    @{Name="workflow-service"; Port=5008; Path="services\workflow-service"}
)

Write-Host "Starting backend services..." -ForegroundColor Yellow

foreach ($service in $services) {
    Write-Host "  Starting $($service.Name)..." -ForegroundColor Gray
    
    $servicePath = Join-Path $projectRoot $service.Path
    $command = @"
cd '$servicePath'
if (-not (Test-Path venv)) {
    Write-Host 'Creating virtual environment...' -ForegroundColor Yellow
    python -m venv venv
}
.\venv\Scripts\Activate.ps1
if (-not (Test-Path .env)) {
    Write-Host 'Creating .env file...' -ForegroundColor Yellow
    Copy-Item .env.example .env -ErrorAction SilentlyContinue
}
pip install -q -r requirements.txt
Write-Host 'Starting $($service.Name) on port $($service.Port)...' -ForegroundColor Green
uvicorn main:app --host 0.0.0.0 --port $($service.Port) --reload
"@
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $command
    Start-Sleep -Seconds 2
}

Write-Host "`nStarting frontend..." -ForegroundColor Yellow

$frontendPath = Join-Path $projectRoot "frontend"
$frontendCommand = @"
cd '$frontendPath'
if (-not (Test-Path node_modules)) {
    Write-Host 'Installing npm dependencies...' -ForegroundColor Yellow
    npm install
}
Write-Host 'Starting frontend on http://localhost:3000...' -ForegroundColor Green
npm start
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  All Services Started!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Services are starting in separate windows." -ForegroundColor Cyan
Write-Host "Wait for all services to be ready before accessing." -ForegroundColor Yellow
Write-Host "`nAccess points:" -ForegroundColor Cyan
Write-Host "  Frontend:     http://localhost:3000" -ForegroundColor White
Write-Host "`nTo stop services, close the PowerShell windows.`n" -ForegroundColor Gray

