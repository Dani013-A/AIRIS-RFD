#!/usr/bin/env bash
set -e

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Verify backend directory
if [ ! -d "$ROOT/AIRIS-Backend" ]; then
  echo "Backend directory not found: $ROOT/AIRIS-Backend"
  exit 1
fi

# Verify virtual environment
if [ ! -d "$ROOT/AIRIS-Backend/.venv" ]; then
  echo "Backend virtual environment not found. Run: cd AIRIS-Backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

cd "$ROOT/AIRIS-Backend"
source .venv/bin/activate

# Clean‑up handler
cleanup() {
  echo "Shutting down FastAPI..."
  kill $SERVER_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start FastAPI (foreground, reload mode)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
SERVER_PID=$!

echo "Backend running at http://127.0.0.1:8000"

echo "Press Ctrl+C to stop the backend"

wait $SERVER_PID
