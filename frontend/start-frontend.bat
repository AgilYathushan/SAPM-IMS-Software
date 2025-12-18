@echo off
REM Frontend Startup Script for Windows
REM This script installs dependencies and starts the React development server

echo ========================================
echo Starting Frontend Development Server
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed
)

echo.
echo Starting React development server...
echo Frontend will be available at http://localhost:3000
echo API calls will go to http://localhost:8000/api
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start
