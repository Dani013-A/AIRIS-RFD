#!/usr/bin/env bash
set -e

# Repository root (this script's directory)
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$ROOT/AIRIS-Backend"

# Activate virtual environment if present
if [ -d ".venv" ]; then
  source .venv/bin/activate
fi

# Start FastAPI server in background
echo "Starting FastAPI server"
uvicorn main:app --host 127.0.0.1 --port 8000 > server.log 2>&1 &
SERVER_PID=$!
# Give the server a moment to start
sleep 3

# Minimal payload for /analyze
read -r -d '' PAYLOAD <<'EOF'
{
  "rawText": "John Doe\nExperienced software engineer with Python and JavaScript skills.",
  "parsedSections": {
    "Skills": "Python, JavaScript, SQL",
    "WorkExperience": "Software Engineer at ABC Corp (2 years)"
  },
  "targetPosition": "software engineer"
}
EOF

# Send request to /analyze
echo "Sending request to /analyze"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  http://127.0.0.1:8000/analyze)

BODY=$(echo "$RESPONSE" | sed '$d')
CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$CODE" != "200" ]; then
  echo "Error: /analyze returned HTTP $CODE"
  kill $SERVER_PID || true
  exit 1
fi

if echo "$BODY" | grep -q "atsScore"; then
  echo "Smoke test passed – atsScore present"
else
  echo "Error: atsScore missing in response"
  kill $SERVER_PID || true
  exit 1
fi

# Clean up server
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null || true

echo "All smoke test checks passed"
