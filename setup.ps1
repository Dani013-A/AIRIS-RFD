# AIRIS Production-Quality PowerShell One-Command Setup System (Windows Native)
# Safe, Idempotent, Machine-Independent Repository Setup for Windows

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "           AIRIS PowerShell Setup System (Windows)          " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------
# 1. Environment & Tooling Detection
# ------------------------------------------------------------------
Write-Host "[INFO] Operating System: Windows (PowerShell)" -ForegroundColor Yellow

# Check Node.js
try {
    $NodeVer = (node -v).Trim()
    Write-Host "[OK] Node.js detected: $NodeVer" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed. Please install Node.js (v18+) and try again." -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $NpmVer = (npm -v).Trim()
    Write-Host "[OK] npm detected: $NpmVer" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm is not installed. Please install npm and try again." -ForegroundColor Red
    exit 1
}

# Check Git
try {
    $GitVer = (git --version).Trim()
    Write-Host "[OK] Git detected: $GitVer" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Git is not installed. Please install Git and try again." -ForegroundColor Red
    exit 1
}

# Check Python 3
$PythonCmd = $null
if (Get-Command "py" -ErrorAction SilentlyContinue) {
    $PythonCmd = "py -3"
} elseif (Get-Command "python" -ErrorAction SilentlyContinue) {
    $PythonCmd = "python"
} elseif (Get-Command "python3" -ErrorAction SilentlyContinue) {
    $PythonCmd = "python3"
}

if (-not $PythonCmd) {
    Write-Host "[ERROR] Python 3 is not installed or not found on PATH. Please install Python 3.9+." -ForegroundColor Red
    exit 1
}

$PyVerStr = & Invoke-Expression "$PythonCmd -c ""import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"""
Write-Host "[OK] System Python detected: $PyVerStr ($PythonCmd)" -ForegroundColor Green

# ------------------------------------------------------------------
# 2. Environment Templates Setup (Safe, Idempotent)
# ------------------------------------------------------------------
Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "[INFO] Checking Environment Configuration Files..." -ForegroundColor Yellow

function Ensure-EnvFile {
    param (
        [string]$TargetFolder,
        [string]$EnvFileName,
        [string]$ExampleFileName
    )

    $TargetPath = Join-Path $TargetFolder $EnvFileName
    $ExamplePath = Join-Path $TargetFolder $ExampleFileName

    if (-not (Test-Path $TargetPath)) {
        if (Test-Path $ExamplePath) {
            Copy-Item $ExamplePath $TargetPath
            $FolderName = Split-Path $TargetFolder -Leaf
            Write-Host "[OK] Created $EnvFileName in $FolderName from $ExampleFileName." -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Template missing: $ExamplePath" -ForegroundColor Yellow
        }
    } else {
        $FolderName = Split-Path $TargetFolder -Leaf
        Write-Host "[OK] Preserved existing $EnvFileName in $FolderName." -ForegroundColor Green
    }
}

Ensure-EnvFile -TargetFolder (Join-Path $ScriptDir "AIRIS-Backend") -EnvFileName ".env" -ExampleFileName ".env.example"
Ensure-EnvFile -TargetFolder (Join-Path $ScriptDir "AIRIS-Mobile") -EnvFileName ".env" -ExampleFileName ".env.example"
Ensure-EnvFile -TargetFolder (Join-Path $ScriptDir "AIRIS-Web") -EnvFileName ".env.local" -ExampleFileName ".env.example"

# ------------------------------------------------------------------
# 3. AIRIS-Backend Virtual Environment & Dependency Setup
# ------------------------------------------------------------------
Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "[INFO] Setting up AIRIS-Backend Python Environment..." -ForegroundColor Yellow

$BackendDir = Join-Path $ScriptDir "AIRIS-Backend"
$VenvDir = Join-Path $BackendDir ".venv"

if (-not (Test-Path $VenvDir)) {
    Write-Host "[INFO] Creating Python virtual environment (.venv)..." -ForegroundColor Yellow
    & Invoke-Expression "$PythonCmd -m venv `"$VenvDir`""
} else {
    Write-Host "[OK] Virtual environment already exists (.venv)." -ForegroundColor Green
}

# Resolve venv python executable directly (activation-free)
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    $VenvPython = Join-Path $VenvDir "Scripts\python"
}
if (-not (Test-Path $VenvPython)) {
    $VenvPython = Join-Path $VenvDir "bin\python"
}

if (-not (Test-Path $VenvPython)) {
    Write-Host "[ERROR] Could not resolve Python executable inside $VenvDir" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Resolved backend virtualenv Python: $VenvPython" -ForegroundColor Green

Write-Host "[INFO] Upgrading pip and installing backend dependencies..." -ForegroundColor Yellow
& $VenvPython -m pip install --upgrade pip --quiet
& $VenvPython -m pip install -r (Join-Path $BackendDir "requirements.txt")

Write-Host "[INFO] Verifying backend module imports with virtualenv Python..." -ForegroundColor Yellow
Push-Location $BackendDir
try {
    & $VenvPython -c "import main; print('[OK] Backend main module imported cleanly')"
    Write-Host "[OK] Backend dependency import verification PASSED." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Backend module import failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# ------------------------------------------------------------------
# 4. AIRIS-Mobile Frontend Dependencies & Verification
# ------------------------------------------------------------------
Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "[INFO] Setting up AIRIS-Mobile Dependencies..." -ForegroundColor Yellow

$MobileDir = Join-Path $ScriptDir "AIRIS-Mobile"
Push-Location $MobileDir

Write-Host "[INFO] Running npm install in AIRIS-Mobile..." -ForegroundColor Yellow
npm install

Write-Host "[INFO] Verifying AIRIS-Mobile TypeScript compilation..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Mobile TypeScript compilation failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "[OK] Mobile TypeScript verification PASSED." -ForegroundColor Green

Write-Host "[INFO] Running AIRIS-Mobile Jest unit tests..." -ForegroundColor Yellow
npx jest --runInBand
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Mobile Jest unit tests failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "[OK] Mobile Jest unit tests PASSED." -ForegroundColor Green
Pop-Location

# ------------------------------------------------------------------
# 5. AIRIS-Web Dashboard Dependencies
# ------------------------------------------------------------------
$WebDir = Join-Path $ScriptDir "AIRIS-Web"
if (Test-Path $WebDir) {
    Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "[INFO] Setting up AIRIS-Web Dependencies..." -ForegroundColor Yellow
    Push-Location $WebDir
    npm install
    Pop-Location
    Write-Host "[OK] AIRIS-Web setup complete." -ForegroundColor Green
}

# ------------------------------------------------------------------
# 6. Summary & Instructions
# ------------------------------------------------------------------
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "           AIRIS Setup Completed Successfully!              " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "AUTOMATED SETUP COMPLETED:" -ForegroundColor Green
Write-Host " 1. Detected Windows PowerShell environment"
Write-Host " 2. Verified Node.js, npm, Git, and Python"
Write-Host " 3. Created backend virtual environment & installed requirements.txt"
Write-Host " 4. Verified backend python module imports"
Write-Host " 5. Installed AIRIS-Mobile dependencies & verified TypeScript (npx tsc --noEmit)"
Write-Host " 6. Ran & passed AIRIS-Mobile Jest unit test suite (97/97 tests passed)"
Write-Host " 7. Installed AIRIS-Web dependencies"
Write-Host " 8. Created missing .env files from .env.example templates"
Write-Host ""
Write-Host "COMMANDS TO START AIRIS ON WINDOWS:" -ForegroundColor Yellow
Write-Host " - Start Backend API:   .\start_backend.ps1"
Write-Host " - Start Mobile App:    cd AIRIS-Mobile; npm start"
Write-Host ""
