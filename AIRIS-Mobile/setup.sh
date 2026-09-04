#!/usr/bin/env bash

set -e

echo "========================================"
echo " Setting up AIRIS-Mobile"
echo "========================================"

# Navigate to the correct directory if run from root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check for Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js is not installed. Please install Node.js (v18+) and try again."
    exit 1
fi

# Check for npm
if ! command -v npm >/dev/null 2>&1; then
    echo "[ERROR] npm is not installed. Please install npm and try again."
    exit 1
fi

echo "[INFO] Installing npm dependencies..."
npm install

echo "[INFO] Verifying TypeScript compilation..."
if npx tsc --noEmit; then
    echo "[OK] TypeScript compilation PASSED."
else
    echo "[ERROR] TypeScript compilation failed!"
    exit 1
fi

echo "[INFO] Running Jest unit tests..."
if npx jest --runInBand; then
    echo "[OK] Jest unit tests PASSED."
else
    echo "[ERROR] Jest unit tests failed!"
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
echo " AIRIS-Mobile setup complete!"
echo "========================================"
