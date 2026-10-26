#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# AIRIS Mobile: Standalone Release APK QA Build Script
# Packages JS bundle + Hermes bytecode + native modules (ML Kit, Unity)
# Fully standalone: NO Metro, NO Expo Go, NO ADB port forwarding required.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ANDROID_DIR="${MOBILE_DIR}/android"
KEYSTORE_PATH="${ANDROID_DIR}/app/debug.keystore"
EXPECTED_SHA1="5e8f16062ea3cd2c4a0d547876baa6f38cabf625"
EXPECTED_PKG="com.airis.mobile"

echo "=== AIRIS Standalone Release APK QA Build ==="
echo "Working directory: ${MOBILE_DIR}"

# 1. Environment preflight
if [ ! -f "${MOBILE_DIR}/.env" ]; then
  echo "[-] ERROR: ${MOBILE_DIR}/.env not found!"
  exit 1
fi

if ! grep -q "EXPO_PUBLIC_API_URL=" "${MOBILE_DIR}/.env"; then
  echo "[-] ERROR: EXPO_PUBLIC_API_URL missing in .env"
  exit 1
fi

if ! grep -q "EXPO_PUBLIC_ADMIN_URL=" "${MOBILE_DIR}/.env"; then
  echo "[-] ERROR: EXPO_PUBLIC_ADMIN_URL missing in .env"
  exit 1
fi

API_URL=$(grep "EXPO_PUBLIC_API_URL=" "${MOBILE_DIR}/.env" | cut -d'=' -f2- | tr -d ' "')
ADMIN_URL=$(grep "EXPO_PUBLIC_ADMIN_URL=" "${MOBILE_DIR}/.env" | cut -d'=' -f2- | tr -d ' "')
echo "[+] Configured Backend API: ${API_URL}"
echo "[+] Configured Admin Web API: ${ADMIN_URL}"

# 2. Keystore verification
if [ ! -f "${KEYSTORE_PATH}" ]; then
  echo "[-] ERROR: Signing keystore ${KEYSTORE_PATH} missing!"
  exit 1
fi

ACTUAL_SHA1=$(keytool -list -v -keystore "${KEYSTORE_PATH}" -storepass android -alias androiddebugkey 2>/dev/null | grep -i "SHA1:" | head -n1 | awk '{print $2}' | tr -d ':' | tr '[:upper:]' '[:lower:]')
if [ "${ACTUAL_SHA1}" != "${EXPECTED_SHA1}" ]; then
  echo "[-] ERROR: Keystore SHA1 (${ACTUAL_SHA1}) does not match expected (${EXPECTED_SHA1})!"
  exit 1
fi
echo "[+] Verified persistent signing keystore SHA-1: ${ACTUAL_SHA1}"

# The JS speech/capture guards require the matching native identity contract.
if ! node "${SCRIPT_DIR}/verify-native-speech.cjs"; then
  export ANDROID_NDK_HOME="${ANDROID_NDK_HOME:-${ANDROID_SDK_ROOT:-${ANDROID_HOME:-${HOME}/Library/Android/sdk}}/ndk/27.2.12479018}"
  python3 "${ANDROID_DIR}/build_native.py"
  node "${SCRIPT_DIR}/verify-native-speech.cjs"
fi

# 3. Compile standalone release APK via Gradle
echo "[+] Starting Gradle assembleRelease (bundling JS assets and compiling native modules)..."
cd "${ANDROID_DIR}"
./gradlew :app:assembleRelease --no-daemon

OUTPUT_APK="${ANDROID_DIR}/app/build/outputs/apk/release/app-release.apk"
STANDALONE_APK="${ANDROID_DIR}/app/build/outputs/apk/release/AIRIS-Standalone-Release.apk"

if [ ! -f "${OUTPUT_APK}" ]; then
  echo "[-] ERROR: Build output ${OUTPUT_APK} not found!"
  exit 1
fi

cp -f "${OUTPUT_APK}" "${STANDALONE_APK}"

# 4. Verify standalone properties
echo "=== Build Verification ==="
APK_SIZE=$(du -h "${STANDALONE_APK}" | awk '{print $1}')
APK_SHA256=$(shasum -a 256 "${STANDALONE_APK}" | awk '{print $1}')

echo "[+] Artifact Location: ${STANDALONE_APK}"
echo "[+] File Size: ${APK_SIZE}"
echo "[+] SHA-256: ${APK_SHA256}"

# Check that JS bundle is inside the APK
if unzip -l "${STANDALONE_APK}" "assets/index.android.bundle" >/dev/null 2>&1; then
  BUNDLE_SIZE=$(unzip -l "${STANDALONE_APK}" "assets/index.android.bundle" | awk '/assets\/index\.android\.bundle/ {print $1}')
  echo "[+] JavaScript bundle packaged inside APK: YES (${BUNDLE_SIZE} bytes)"
else
  echo "[-] ERROR: assets/index.android.bundle not found inside APK!"
  exit 1
fi

# Locate Android build tools (aapt, apksigner)
AAPT_BIN=""
APKSIGNER_BIN=""
if command -v aapt >/dev/null 2>&1; then
  AAPT_BIN="$(command -v aapt)"
elif [ -d "${HOME}/Library/Android/sdk/build-tools" ]; then
  AAPT_BIN="$(find "${HOME}/Library/Android/sdk/build-tools" -name aapt | tail -n 1)"
fi

if command -v apksigner >/dev/null 2>&1; then
  APKSIGNER_BIN="$(command -v apksigner)"
elif [ -d "${HOME}/Library/Android/sdk/build-tools" ]; then
  APKSIGNER_BIN="$(find "${HOME}/Library/Android/sdk/build-tools" -name apksigner | tail -n 1)"
fi

if [ -n "${AAPT_BIN}" ] && [ -x "${AAPT_BIN}" ]; then
  BADGING="$("${AAPT_BIN}" dump badging "${STANDALONE_APK}")"
  PKG_NAME="$(echo "${BADGING}" | grep "^package:" | sed -E "s/^package: name='([^']+)'.*/\1/")"
  VERSION_NAME="$(echo "${BADGING}" | grep "^package:" | sed -E "s/.* versionName='([^']+)'.*/\1/")"
  VERSION_CODE="$(echo "${BADGING}" | grep "^package:" | sed -E "s/.* versionCode='([^']+)'.*/\1/")"
  echo "[+] Package: ${PKG_NAME} (versionCode=${VERSION_CODE}, versionName=${VERSION_NAME})"

  if [ "${PKG_NAME}" != "${EXPECTED_PKG}" ]; then
    echo "[-] ERROR: Package name ${PKG_NAME} does not match ${EXPECTED_PKG}!"
    exit 1
  fi

  if echo "${BADGING}" | grep -i "application-debuggable"; then
    echo "[-] WARNING: APK is marked debuggable!"
  else
    echo "[+] Standalone Status: NON-DEBUGGABLE (production release build)"
  fi
fi

if [ -n "${APKSIGNER_BIN}" ] && [ -x "${APKSIGNER_BIN}" ]; then
  CERT_SHA1="$("${APKSIGNER_BIN}" verify --print-certs "${STANDALONE_APK}" 2>/dev/null | grep -i "certificate SHA-1 digest:" | head -n1 | awk '{print $NF}' | tr '[:upper:]' '[:lower:]')"
  echo "[+] APK Signer Certificate SHA-1: ${CERT_SHA1}"
  if [ "${CERT_SHA1}" != "${EXPECTED_SHA1}" ]; then
    echo "[-] ERROR: APK signing certificate ${CERT_SHA1} does not match expected ${EXPECTED_SHA1}!"
    exit 1
  fi
fi

echo "=== Standalone APK Build Succeeded ==="
