# AIRIS PowerShell Backend Launcher (Windows Native)
$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$BackendDir = Join-Path $ScriptDir "AIRIS-Backend"
$VenvDir = Join-Path $BackendDir ".venv"

if (-not (Test-Path $BackendDir)) {
    Write-Host "[ERROR] Backend directory not found: $BackendDir" -ForegroundColor Red
    exit 1
}

# Resolve virtualenv Python interpreter directly
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    $VenvPython = Join-Path $VenvDir "Scripts\python"
}
if (-not (Test-Path $VenvPython)) {
    $VenvPython = Join-Path $VenvDir "bin\python"
}

if (-not (Test-Path $VenvPython)) {
    Write-Host "[ERROR] Backend virtual environment not found. Please run .\setup.ps1" -ForegroundColor Red
    exit 1
}

Push-Location $BackendDir
Write-Host "Starting FastAPI backend using $VenvPython..." -ForegroundColor Green
Write-Host "Backend running at http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the backend" -ForegroundColor Yellow

& $VenvPython -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
Pop-Location
