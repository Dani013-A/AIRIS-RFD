#!/usr/bin/env bash

set -e

echo "========================================"
echo " Setting up AIRIS-Backend"
echo "========================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check for Python
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
else
    echo "[ERROR] Python 3 is not installed. Please install Python (v3.9+) and try again."
    exit 1
fi

echo "[INFO] Checking for virtual environment..."
if [ ! -d ".venv" ]; then
    echo "[INFO] Creating virtual environment (.venv)..."
    $PYTHON_CMD -m venv .venv
else
    echo "[INFO] Virtual environment (.venv) already exists."
fi

# Direct resolution of venv python executable (cross-platform, activation-free)
VENV_PYTHON=""
if [ -x ".venv/bin/python" ]; then
    VENV_PYTHON=".venv/bin/python"
elif [ -x ".venv/Scripts/python.exe" ]; then
    VENV_PYTHON=".venv/Scripts/python.exe"
elif [ -x ".venv/Scripts/python" ]; then
    VENV_PYTHON=".venv/Scripts/python"
elif [ -f ".venv/bin/python" ]; then
    VENV_PYTHON=".venv/bin/python"
elif [ -f ".venv/Scripts/python.exe" ]; then
    VENV_PYTHON=".venv/Scripts/python.exe"
fi

if [ -z "$VENV_PYTHON" ]; then
    echo "[ERROR] Could not resolve Python interpreter in .venv"
    exit 1
fi

echo "[INFO] Installing Python dependencies..."
"$VENV_PYTHON" -m pip install --upgrade pip
"$VENV_PYTHON" -m pip install -r requirements.txt

echo "[INFO] Verifying backend module imports..."
if "$VENV_PYTHON" -c "import main; print('[OK] Backend import verified.')"; then
    echo "[OK] Backend module import check PASSED."
else
    echo "[ERROR] Backend module import failed!"
    exit 1
fi

echo "[INFO] Checking environment variables..."
if [ -f ".env" ]; then
    echo "[INFO] .env file already exists. Preserving existing configuration."
else
    echo "[WARNING] No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "[INFO] Created .env from .env.example. Please update it with your real API keys."
fi

echo "========================================"
echo " AIRIS-Backend setup complete!"
echo "========================================"
