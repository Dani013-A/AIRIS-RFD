#!/usr/bin/env bash

set -e

echo "========================================"
echo " Setting up AIRIS-Web"
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

echo "[INFO] Checking environment variables..."
if [ -f ".env.local" ]; then
    echo "[INFO] .env.local file already exists. Preserving existing configuration."
else
    echo "[WARNING] No .env.local file found. Creating from .env.example..."
    cp .env.example .env.local
    echo "[INFO] Created .env.local from .env.example. Please update it with your real Firebase API keys."
fi

echo "========================================"
echo " AIRIS-Web setup complete!"
echo "========================================"
