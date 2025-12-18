# Frontend Startup Script for PowerShell
# This script installs dependencies and starts the React development server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Frontend Development Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Checking dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Dependencies already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting React development server..." -ForegroundColor Yellow
Write-Host "Frontend will be available at http://localhost:3000" -ForegroundColor Cyan
Write-Host "API calls will go to http://localhost:8000/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

npm start
