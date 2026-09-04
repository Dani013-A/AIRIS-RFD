#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/AIRIS-Backend"
cd "$BACKEND_DIR"

VENV_PYTHON="python"
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

# Run unit tests (if any)
if "$VENV_PYTHON" -m pytest --version >/dev/null 2>&1; then
  echo "=== Running pytest ==="
  "$VENV_PYTHON" -m pytest -q || { echo "Pytest failures"; exit 1; }
else
  echo "pytest not installed – skipping pytest unit tests"
fi

# Simple health check for the FastAPI server (must be running separately)
echo "=== Checking backend health endpoint ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/)
if [ "$HTTP_CODE" != "200" ]; then
  echo "Backend health check failed (HTTP $HTTP_CODE)"
  exit 1
fi

# Verify backend import does not raise errors
echo "=== Importing backend modules ==="
"$VENV_PYTHON" - <<'PY'
try:
    import main
    print("Backend import OK")
except Exception as e:
    print("Backend import failed:", e)
    raise SystemExit(1)
PY

# Verify upload for each resume format
for ext in pdf docx txt rtf; do
  echo "=== Testing upload for $ext ==="
  RESPONSE=$(curl -s -X POST "http://127.0.0.1:8000/upload?targetPosition=Software%20Engineer" -F "file=@sample_resume.$ext" -H "accept: application/json")
  if echo "$RESPONSE" | grep -q '"parsedSections":{'; then
    echo "Upload $ext parsedSections ok"
  else
    echo "Upload $ext parsedSections missing or empty"
    exit 1
  fi
  SCORE=$(echo "$RESPONSE" | grep -o '"overallScore": *[0-9]*' | head -n1 | grep -o [0-9]*)
  if [ -z "$SCORE" ] || [ "$SCORE" -le 0 ]; then
    echo "Upload $ext overallScore not positive"
    exit 1
  else
    echo "Upload $ext overallScore $SCORE"
  fi
done

echo "All checks passed"
