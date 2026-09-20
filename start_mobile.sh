#!/usr/bin/env bash
set -e

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Verify mobile directory
if [ ! -d "$ROOT/AIRIS-Mobile" ]; then
  echo "Mobile directory not found: $ROOT/AIRIS-Mobile"
  exit 1
fi

# Verify node_modules
if [ ! -d "$ROOT/AIRIS-Mobile/node_modules" ]; then
  echo "Mobile node_modules not found. Run: cd AIRIS-Mobile && npm install"
  exit 1
fi

cd "$ROOT/AIRIS-Mobile"

# Clean‑up handler (runs when you press Ctrl+C)
cleanup() {
  echo "Shutting down Expo..."
  # When Expo runs in the foreground, sending SIGINT (Ctrl+C) is enough.
  # No extra kill needed because the script will exit after the handler.
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start Expo in the foreground – QR code and key shortcuts work.
echo "Expo dev server starting in Development Client mode."
echo "Backend is running at http://127.0.0.1:8000"
echo "Press Ctrl+C to stop Expo."

# This command blocks; when you press Ctrl+C the cleanup handler runs.
npx expo start --dev-client
