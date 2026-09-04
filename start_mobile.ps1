# AIRIS PowerShell Mobile Launcher (Windows Native)
$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$MobileDir = Join-Path $ScriptDir "AIRIS-Mobile"

if (-not (Test-Path $MobileDir)) {
    Write-Host "[ERROR] Mobile directory not found: $MobileDir" -ForegroundColor Red
    exit 1
}

$NodeModules = Join-Path $MobileDir "node_modules"
if (-not (Test-Path $NodeModules)) {
    Write-Host "[ERROR] Mobile node_modules not found. Please run .\setup.ps1" -ForegroundColor Red
    exit 1
}

Push-Location $MobileDir
Write-Host "Expo dev server starting. Scan QR code with Expo Go." -ForegroundColor Green
Write-Host "Backend is running at http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop Expo." -ForegroundColor Yellow

npm start
Pop-Location
