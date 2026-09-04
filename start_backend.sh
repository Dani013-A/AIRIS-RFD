#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$ROOT/AIRIS-Backend" ]; then
  echo "[ERROR] Backend directory not found: $ROOT/AIRIS-Backend"
  exit 1
fi

BACKEND_DIR="$ROOT/AIRIS-Backend"
VENV_DIR="$BACKEND_DIR/.venv"

# Direct resolution of venv python executable (cross-platform, activation-free)
VENV_PYTHON=""
if [ -x "$VENV_DIR/bin/python" ]; then
  VENV_PYTHON="$VENV_DIR/bin/python"
elif [ -x "$VENV_DIR/Scripts/python.exe" ]; then
  VENV_PYTHON="$VENV_DIR/Scripts/python.exe"
elif [ -x "$VENV_DIR/Scripts/python" ]; then
  VENV_PYTHON="$VENV_DIR/Scripts/python"
elif [ -f "$VENV_DIR/bin/python" ]; then
  VENV_PYTHON="$VENV_DIR/bin/python"
elif [ -f "$VENV_DIR/Scripts/python.exe" ]; then
  VENV_PYTHON="$VENV_DIR/Scripts/python.exe"
fi

if [ -z "$VENV_PYTHON" ]; then
  echo "[ERROR] Backend virtual environment not found or missing Python interpreter."
  echo "Run ./setup.sh to create and configure the environment."
  exit 1
fi

cd "$BACKEND_DIR"

cleanup() {
  echo "Shutting down FastAPI..."
  kill $SERVER_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "Starting FastAPI backend using $VENV_PYTHON..."
"$VENV_PYTHON" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
SERVER_PID=$!

echo "Backend running at http://127.0.0.1:8000"
echo "Press Ctrl+C to stop the backend"

wait $SERVER_PID
