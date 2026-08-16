#!/usr/bin/env bash

set -e

echo "========================================"
echo " Setting up AIRIS-Backend"
echo "========================================"

# Check for Python
if ! command -v python3 >/dev/null 2>&1; then
    if ! command -v python >/dev/null 2>&1; then
        echo "[ERROR] Python 3 is not installed. Please install Python and try again."
        exit 1
    else
        PYTHON_CMD="python"
    fi
else
    PYTHON_CMD="python3"
fi

# Navigate to the correct directory if run from root
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR"

echo "[INFO] Checking for virtual environment..."
if [ ! -d ".venv" ]; then
    echo "[INFO] Creating virtual environment (.venv)..."
    $PYTHON_CMD -m venv .venv
else
    echo "[INFO] Virtual environment (.venv) already exists."
fi

echo "[INFO] Activating virtual environment..."
source .venv/bin/activate

echo "[INFO] Installing Python dependencies..."
pip install -r requirements.txt

echo "[INFO] Checking environment variables..."
if [ -f ".env" ]; then
    echo "[INFO] .env file already exists. Skipping environment setup."
else
    echo "[WARNING] No .env file found."
    echo "[INFO] Please create a .env file based on .env.example:"
    echo "       cp .env.example .env"
    echo "       Then edit .env to include your real API keys (Gemini, Groq, etc.)."
fi

echo "========================================"
echo " AIRIS-Backend setup complete!"
echo "========================================"
