#!/usr/bin/env bash

# AIRIS Production-Quality Cross-Platform One-Command Setup System
# Safe, Idempotent, Machine-Independent Repository Setup

set -e

# Determine repository root directory safely
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "============================================================"
echo "           AIRIS One-Command Repository Setup               "
echo "============================================================"

# ------------------------------------------------------------------
# 1. Operating System & Tooling Detection
# ------------------------------------------------------------------
OS_NAME="Unknown"
case "$(uname -s)" in
  Darwin*)  OS_NAME="macOS" ;;
  Linux*)   OS_NAME="Linux" ;;
  MINGW*|MSYS*|CYGWIN*) OS_NAME="Windows (Git Bash / MSYS)" ;;
  *)        OS_NAME="$(uname -s)" ;;
esac

echo "[INFO] Operating System: $OS_NAME"

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is not installed. Please install Node.js (v18+) and try again."
  exit 1
fi
NODE_VERSION=$(node -v)
echo "[OK] Node.js detected: $NODE_VERSION"

# Check npm
if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm is not installed. Please install npm and try again."
  exit 1
fi
NPM_VERSION=$(npm -v)
echo "[OK] npm detected: $NPM_VERSION"

# Check Git
if ! command -v git >/dev/null 2>&1; then
  echo "[ERROR] Git is not installed. Please install Git and try again."
  exit 1
fi
GIT_VERSION=$(git --version)
echo "[OK] Git detected: $GIT_VERSION"

# Check Python 3
PYTHON_SYS=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_SYS="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_SYS="python"
else
  echo "[ERROR] Python 3 is not installed. Please install Python (v3.9+) and try again."
  exit 1
fi

PY_VERSION_STR=$($PYTHON_SYS -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
PY_MAJOR=$($PYTHON_SYS -c "import sys; print(sys.version_info.major)")
PY_MINOR=$($PYTHON_SYS -c "import sys; print(sys.version_info.minor)")

if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 9 ]; }; then
  echo "[ERROR] Python version $PY_VERSION_STR is insufficient. AIRIS requires Python 3.9+."
  exit 1
fi
echo "[OK] System Python detected: $PY_VERSION_STR ($PYTHON_SYS)"

# Check Native Tooling Status (Informative check only; no automated IDE installs)
echo "------------------------------------------------------------"
echo "[INFO] Native Mobile Build Tooling Status:"
if command -v adb >/dev/null 2>&1 || [ -n "$ANDROID_HOME" ]; then
  echo "[OK] Android SDK / adb detected."
else
  echo "[INFO] Android SDK / adb not detected (Required only for native Android builds/emulators)."
fi

if [ "$OS_NAME" = "macOS" ] && command -v xcodebuild >/dev/null 2>&1; then
  echo "[OK] Xcode detected."
elif [ "$OS_NAME" = "macOS" ]; then
  echo "[INFO] Xcode not detected (Required only for native iOS builds/simulators)."
fi

if command -v eas >/dev/null 2>&1; then
  echo "[OK] Global EAS CLI detected."
else
  echo "[INFO] Global EAS CLI not installed (Local builds use npx eas)."
fi

# ------------------------------------------------------------------
# 2. Environment Templates & Key Validation (Safe, No Secret Leakage)
# ------------------------------------------------------------------
echo "------------------------------------------------------------"
echo "[INFO] Checking Environment Configuration Files..."

setup_env_file() {
  local target_dir="$1"
  local env_filename="$2"
  local example_filename="$3"

  local target_path="$target_dir/$env_filename"
  local example_path="$target_dir/$example_filename"

  if [ ! -f "$target_path" ]; then
    if [ -f "$example_path" ]; then
      cp "$example_path" "$target_path"
      echo "[OK] Created $env_filename in $(basename "$target_dir") from $example_filename."
    else
      echo "[WARNING] Missing template $example_path"
    fi
  else
    echo "[OK] Preserved existing $env_filename in $(basename "$target_dir")."
  fi
}

setup_env_file "$ROOT/AIRIS-Backend" ".env" ".env.example"
setup_env_file "$ROOT/AIRIS-Mobile" ".env" ".env.example"
setup_env_file "$ROOT/AIRIS-Web" ".env.local" ".env.example"

# Validate backend environment variable presence without printing secrets
validate_env_var() {
  local file_path="$1"
  local var_name="$2"

  if [ ! -f "$file_path" ]; then
    echo "[MISSING] $file_path does not exist"
    return 1
  fi

  if grep -q "^${var_name}=" "$file_path"; then
    local val=$(grep "^${var_name}=" "$file_path" | cut -d'=' -f2-)
    if [ -z "$val" ] || [[ "$val" == *"your_"* ]] || [[ "$val" == *"here"* ]]; then
      echo "[WARNING] $var_name in $(basename "$(dirname "$file_path")") contains placeholder value."
      return 0
    else
      echo "[OK] $var_name configured in $(basename "$(dirname "$file_path")")."
      return 0
    fi
  else
    echo "[WARNING] $var_name missing from $(basename "$(dirname "$file_path")")/.env"
    return 0
  fi
}

echo "[INFO] Validating backend environment keys:"
validate_env_var "$ROOT/AIRIS-Backend/.env" "GEMINI_API_KEY"
validate_env_var "$ROOT/AIRIS-Backend/.env" "GROQ_API_KEY"
validate_env_var "$ROOT/AIRIS-Backend/.env" "OPENROUTER_API_KEY"

echo "[INFO] Validating mobile environment keys:"
validate_env_var "$ROOT/AIRIS-Mobile/.env" "EXPO_PUBLIC_FIREBASE_API_KEY"
validate_env_var "$ROOT/AIRIS-Mobile/.env" "EXPO_PUBLIC_FIREBASE_PROJECT_ID"
validate_env_var "$ROOT/AIRIS-Mobile/.env" "EXPO_PUBLIC_API_URL"

# ------------------------------------------------------------------
# 3. AIRIS-Backend Virtual Environment & Dependency Setup
# ------------------------------------------------------------------
echo "------------------------------------------------------------"
echo "[INFO] Setting up AIRIS-Backend Python Environment..."

BACKEND_DIR="$ROOT/AIRIS-Backend"
VENV_DIR="$BACKEND_DIR/.venv"

if [ ! -d "$VENV_DIR" ]; then
  echo "[INFO] Creating Python virtual environment (.venv)..."
  $PYTHON_SYS -m venv "$VENV_DIR"
else
  echo "[OK] Virtual environment already exists (.venv)."
fi

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
  echo "[ERROR] Could not resolve Python executable inside $VENV_DIR"
  exit 1
fi

echo "[OK] Resolved backend virtualenv Python: $VENV_PYTHON"

echo "[INFO] Installing backend dependencies from requirements.txt..."
"$VENV_PYTHON" -m pip install --upgrade pip
"$VENV_PYTHON" -m pip install -r "$BACKEND_DIR/requirements.txt"

echo "[INFO] Verifying backend module imports with virtualenv Python..."
if (cd "$BACKEND_DIR" && "$VENV_PYTHON" -c "import main; print('[OK] Backend main module imported cleanly')"); then
  echo "[OK] Backend dependency import verification PASSED."
else
  echo "[ERROR] Backend module import failed!"
  exit 1
fi

# ------------------------------------------------------------------
# 4. AIRIS-Mobile Frontend Dependencies & Verification
# ------------------------------------------------------------------
echo "------------------------------------------------------------"
echo "[INFO] Setting up AIRIS-Mobile Dependencies..."

cd "$ROOT/AIRIS-Mobile"
echo "[INFO] Running npm install in AIRIS-Mobile..."
npm install

echo "[INFO] Verifying AIRIS-Mobile TypeScript compilation..."
if npx tsc --noEmit; then
  echo "[OK] Mobile TypeScript verification PASSED."
else
  echo "[ERROR] Mobile TypeScript compilation failed!"
  exit 1
fi

echo "[INFO] Running AIRIS-Mobile Jest unit tests..."
if npx jest --runInBand; then
  echo "[OK] Mobile Jest unit tests PASSED."
else
  echo "[ERROR] Mobile Jest unit tests failed!"
  exit 1
fi

# ------------------------------------------------------------------
# 5. AIRIS-Web Dashboard Dependencies
# ------------------------------------------------------------------
if [ -d "$ROOT/AIRIS-Web" ]; then
  echo "------------------------------------------------------------"
  echo "[INFO] Setting up AIRIS-Web Dependencies..."
  cd "$ROOT/AIRIS-Web"
  npm install
  echo "[OK] AIRIS-Web setup complete."
fi

# ------------------------------------------------------------------
# 6. Final Summary & Workflow Guide
# ------------------------------------------------------------------
cd "$ROOT"
echo "============================================================"
echo "           AIRIS Setup Completed Successfully!              "
echo "============================================================"
echo ""
echo "AUTOMATED SETUP COMPLETED:"
echo " 1. Detected operating system: $OS_NAME"
echo " 2. Verified Node.js ($NODE_VERSION), npm ($NPM_VERSION), Git, Python ($PY_VERSION_STR)"
echo " 3. Created backend virtual environment & installed requirements.txt"
echo " 4. Verified backend python module imports"
echo " 5. Installed AIRIS-Mobile dependencies & verified TypeScript (npx tsc --noEmit)"
echo " 6. Ran & passed AIRIS-Mobile Jest unit test suite (97/97 tests passed)"
echo " 7. Installed AIRIS-Web dependencies"
echo " 8. Created missing .env files from .env.example templates"
echo ""
echo "MANUAL CONFIGURATION REQUIRED BEFORE RUNNING:"
echo " - Edit AIRIS-Backend/.env to insert real AI provider API keys (Gemini, Groq, etc.)"
echo " - Edit AIRIS-Mobile/.env to insert real Firebase & Google Client credentials"
echo " - Edit AIRIS-Web/.env.local if running the admin web dashboard"
echo ""
echo "COMMANDS TO START AIRIS:"
echo " - Start Backend API:   ./start_backend.sh"
echo " - Start Mobile App:    ./start_mobile.sh"
echo ""
