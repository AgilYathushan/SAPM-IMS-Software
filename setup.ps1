# ============================================================================
# Image Management System - Setup Script for Windows (SOA Architecture)
# ============================================================================
# Purpose: 
#   This script automates the setup process for the Service-Oriented Architecture (SOA)
#   implementation of the Image Management System. It performs the following tasks:
#
#   1. Validates prerequisites (Docker, configuration files)
#   2. Validates service structure (directories, required files)
#   3. Creates .env files for all backend services from .env.example templates
#   4. Sets up frontend .env file
#   5. Provides comprehensive setup instructions and service URLs
#
#   Each service runs independently on its own port:
#   - auth-service: 5001
#   - user-service: 5002
#   - patient-service: 5003
#   - medical-staff-service: 5004
#   - medical-image-service: 5005
#   - diagnostic-report-service: 5006
#   - billing-service: 5007
#   - workflow-service: 5008
#
#   All services communicate through FastAPI API Gateway (port 8000)
#
# Usage: .\setup.ps1
#
# Requirements:
#   - Docker Desktop installed and running
#   - PowerShell 5.1 or later
#   - All service directories must exist in services/ folder
# ============================================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  IMS SOA Setup Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ============================================================================
# Configuration
# ============================================================================
$ErrorActionPreference = "Continue"
$servicesCreated = 0
$servicesSkipped = 0
$servicesError = 0
$errors = @()

# Check if Docker is running
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Docker is available" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Docker may not be running or installed" -ForegroundColor Yellow
        $errors += "Docker may not be available"
    }
} catch {
    Write-Host "  [WARNING] Docker check failed: $($_.Exception.Message)" -ForegroundColor Yellow
    $errors += "Docker check failed: $($_.Exception.Message)"
}

# Check API Gateway configuration
if (Test-Path "services\api-gateway\main.py") {
    Write-Host "  [OK] API Gateway configuration found" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] API Gateway configuration not found (services\api-gateway\main.py)" -ForegroundColor Yellow
    $errors += "API Gateway configuration missing"
}

# Check docker-compose.yml
if (Test-Path "docker-compose.yml") {
    Write-Host "  [OK] Docker Compose configuration found" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Docker Compose configuration not found" -ForegroundColor Red
    $errors += "docker-compose.yml missing"
    $servicesError++
}

Write-Host ""

# List of all backend services in SOA architecture
$services = @(
    @{Name="auth-service"; Port=5001; Description="Authentication and Authorization"},
    @{Name="user-service"; Port=5002; Description="User Management"},
    @{Name="patient-service"; Port=5003; Description="Patient Records"},
    @{Name="medical-staff-service"; Port=5004; Description="Medical Staff Management"},
    @{Name="medical-image-service"; Port=5005; Description="Medical Image Storage"},
    @{Name="diagnostic-report-service"; Port=5006; Description="Diagnostic Reports"},
    @{Name="billing-service"; Port=5007; Description="Billing and Payments"},
    @{Name="workflow-service"; Port=5008; Description="Workflow Tracking"}
)

# ============================================================================
# Validate Service Structure
# ============================================================================
Write-Host "Validating service structure..." -ForegroundColor Yellow

foreach ($service in $services) {
    $servicePath = "services\$($service.Name)"
    
    if (-not (Test-Path $servicePath)) {
        Write-Host "  [ERROR] $($service.Name) - Directory not found" -ForegroundColor Red
        $servicesError++
        $errors += "Service directory missing: $servicePath"
        continue
    }
    
    # Check for required files
    $requiredFiles = @("main.py", "Dockerfile", "requirements.txt")
    $requiredDirs = @("app\api\v1", "app\core", "app\models", "app\schemas", "app\services")
    $missingFiles = @()
    $missingDirs = @()
    
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path "$servicePath\$file")) {
            $missingFiles += $file
        }
    }
    
    foreach ($dir in $requiredDirs) {
        if (-not (Test-Path "$servicePath\$dir")) {
            $missingDirs += $dir
        }
    }
    
    $issues = @()
    if ($missingFiles.Count -gt 0) {
        $issues += "Missing files: $($missingFiles -join ', ')"
    }
    if ($missingDirs.Count -gt 0) {
        $issues += "Missing directories: $($missingDirs -join ', ')"
    }
    
    if ($issues.Count -gt 0) {
        Write-Host "  [WARNING] $($service.Name) - $($issues -join '; ')" -ForegroundColor Yellow
    } else {
        Write-Host "  [OK] $($service.Name) - Structure valid" -ForegroundColor Green
    }
}

Write-Host ""

# ============================================================================
# Create .env Files from Templates
# ============================================================================
Write-Host "Creating .env files from templates..." -ForegroundColor Yellow

foreach ($service in $services) {
    $servicePath = "services\$($service.Name)"
    $envPath = "$servicePath\.env"
    $envExamplePath = "$servicePath\.env.example"
    
    # Skip if service directory doesn't exist
    if (-not (Test-Path $servicePath)) {
        Write-Host "  [WARNING] Skipping $($service.Name) - Directory not found" -ForegroundColor Yellow
        $servicesSkipped++
        continue
    }
    
    # Check if .env already exists
    if (Test-Path $envPath) {
        Write-Host "  [SKIP] $($service.Name) - .env already exists (skipped)" -ForegroundColor Gray
        $servicesSkipped++
        continue
    }
    
    # Try to copy from .env.example
    if (Test-Path $envExamplePath) {
        try {
            Copy-Item $envExamplePath $envPath -ErrorAction Stop
            Write-Host "  [OK] $($service.Name) - Created .env from template" -ForegroundColor Green
            $servicesCreated++
        } catch {
            Write-Host "  [ERROR] $($service.Name) - Failed to create .env: $($_.Exception.Message)" -ForegroundColor Red
            $servicesError++
            $errors += "Failed to create .env for $($service.Name): $($_.Exception.Message)"
        }
    } else {
        # Create a basic .env file if template doesn't exist
        Write-Host "  [WARNING] $($service.Name) - .env.example not found, creating basic .env" -ForegroundColor Yellow
        try {
            $envLines = @(
                "# Database Configuration",
                "DATABASE_URL=postgresql://ims_user:ims_password@postgres:5432/ims_db",
                "",
                "# JWT Authentication Configuration",
                "SECRET_KEY=your-secret-key-change-in-production-use-env-var",
                "ALGORITHM=HS256",
                "ACCESS_TOKEN_EXPIRE_MINUTES=30",
                "",
                "# API Configuration",
                "API_V1_PREFIX=/api/v1",
                "",
                "# Logging Configuration",
                "LOG_LEVEL=INFO"
            )
            
            # Add service-specific configurations
            if ($service.Name -eq "medical-image-service") {
                $envLines += @(
                    "",
                    "# MinIO Object Storage Configuration",
                    "MINIO_ENDPOINT=minio:9000",
                    "MINIO_ACCESS_KEY=minioadmin",
                    "MINIO_SECRET_KEY=minioadmin",
                    "MINIO_BUCKET_NAME=images",
                    "MINIO_SECURE=false"
                )
            }
            
            # Note: All services should use the same SECRET_KEY for JWT validation
            # This is critical for inter-service authentication
            
            $envContent = $envLines -join "`n"
            Set-Content -Path $envPath -Value $envContent -ErrorAction Stop
            Write-Host "  [OK] $($service.Name) - Created basic .env file" -ForegroundColor Green
            $servicesCreated++
        } catch {
            Write-Host "  [ERROR] $($service.Name) - Failed to create .env: $($_.Exception.Message)" -ForegroundColor Red
            $servicesError++
            $errors += "Failed to create .env for $($service.Name): $($_.Exception.Message)"
        }
    }
}

# ============================================================================
# Frontend .env Setup
# ============================================================================
Write-Host "`nSetting up frontend..." -ForegroundColor Yellow

if (-not (Test-Path "frontend\.env")) {
    if (Test-Path "frontend\.env.example") {
        try {
            Copy-Item "frontend\.env.example" "frontend\.env" -ErrorAction Stop
            Write-Host "  [OK] Frontend - Created .env from template" -ForegroundColor Green
        } catch {
            Write-Host "  [ERROR] Frontend - Failed to create .env: $($_.Exception.Message)" -ForegroundColor Red
            $errors += "Failed to create frontend/.env: $($_.Exception.Message)"
        }
    } else {
        Write-Host "  [WARNING] Frontend - .env.example not found, skipping" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [SKIP] Frontend - .env already exists (skipped)" -ForegroundColor Gray
}

# ============================================================================
# Summary
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Setup Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Created:    $servicesCreated service(s)" -ForegroundColor Green
Write-Host "  Skipped:    $servicesSkipped service(s)" -ForegroundColor Gray
Write-Host "  Errors:     $servicesError service(s)" -ForegroundColor $(if ($servicesError -gt 0) { "Red" } else { "Gray" })

if ($errors.Count -gt 0) {
    Write-Host "`nErrors encountered:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  - $error" -ForegroundColor Red
    }
}

# ============================================================================
# Next Steps
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Review and update .env files:" -ForegroundColor White
Write-Host "   - Update SECRET_KEY in all service .env files (use a strong random string)" -ForegroundColor Gray
Write-Host "     IMPORTANT: Use the SAME SECRET_KEY across all services for JWT validation" -ForegroundColor Yellow
Write-Host "   - Verify DATABASE_URL matches your PostgreSQL configuration" -ForegroundColor Gray
Write-Host "   - Check MinIO settings in medical-image-service/.env" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Build Docker images (first time only):" -ForegroundColor White
Write-Host "   docker-compose build" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Start all services:" -ForegroundColor White
Write-Host "   docker-compose up -d" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Verify services are running:" -ForegroundColor White
Write-Host "   docker-compose ps" -ForegroundColor Yellow
Write-Host "   docker-compose logs -f [service-name]  # View logs for specific service" -ForegroundColor Gray
Write-Host "   .\test-services.ps1  # Run service health checks" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Access services:" -ForegroundColor White
Write-Host "   - Frontend:        http://localhost:3000" -ForegroundColor Gray
Write-Host "   - FastAPI Gateway: http://localhost:8000" -ForegroundColor Gray
Write-Host "   - MinIO Console:   http://localhost:9001" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Backend Services (via FastAPI Gateway):" -ForegroundColor White
$serviceRoutes = @{
    "auth-service" = "/api/v1/auth"
    "user-service" = "/api/v1/users"
    "patient-service" = "/api/v1/patients"
    "medical-staff-service" = "/api/v1/medical-staff"
    "medical-image-service" = "/api/v1/medical-images"
    "diagnostic-report-service" = "/api/v1/diagnostic-reports"
    "billing-service" = "/api/v1/billing"
    "workflow-service" = "/api/v1/workflow"
}
foreach ($service in $services) {
    $route = $serviceRoutes[$service.Name]
    Write-Host "   - $($service.Name.PadRight(30)) http://localhost:8000$route" -ForegroundColor Gray
}
Write-Host ""
Write-Host "7. Direct Service Access (for debugging):" -ForegroundColor White
foreach ($service in $services) {
    Write-Host "   - $($service.Name.PadRight(25)) http://localhost:$($service.Port)/health" -ForegroundColor Gray
}
Write-Host ""
Write-Host ""
Write-Host "Important Notes:" -ForegroundColor Yellow
Write-Host "  - All services MUST use the same SECRET_KEY for JWT token validation" -ForegroundColor Yellow
Write-Host "  - Services communicate exclusively through FastAPI Gateway (port 8000)" -ForegroundColor Yellow
Write-Host "  - Each service runs independently on its own port (5001-5008)" -ForegroundColor Yellow
Write-Host "  - Database schemas are automatically created on first connection" -ForegroundColor Yellow
Write-Host ""
Write-Host "For more information, see README.md" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ============================================================================
# Exit with appropriate code
# ============================================================================
if ($servicesError -gt 0) {
    Write-Host "Setup completed with errors. Please review the errors above." -ForegroundColor Red
    exit 1
} else {
    Write-Host "Setup completed successfully!" -ForegroundColor Green
    exit 0
}
