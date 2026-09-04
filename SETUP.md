# AIRIS Development Environment Setup & Onboarding Guide

Welcome to the AIRIS development repository. Follow this guide to set up your development environment.

---

## 1. System Prerequisites

Before running the setup system, ensure your development machine has the following tools installed:

- **Node.js**: v18.0.0 or higher ([download](https://nodejs.org/))
- **npm**: v9.0.0 or higher (packaged with Node.js)
- **Python**: v3.9 or higher ([download](https://www.python.org/))
- **Git**: ([download](https://git-scm.com/))

---

## 2. First-Time Quickstart

AIRIS provides native one-command setup scripts for macOS, Linux, and Windows PowerShell:

### macOS / Linux
Open a terminal in the repository root and execute:
```bash
git clone https://github.com/Dani013-A/AIRIS-RFD.git AIRIS
cd AIRIS
cp AIRIS-Backend/.env.example AIRIS-Backend/.env
cp AIRIS-Mobile/.env.example AIRIS-Mobile/.env
cp AIRIS-Web/.env.example AIRIS-Web/.env.local
./setup.sh
```

### Windows (PowerShell / VS Code Terminal)
Open **PowerShell** (or the VS Code / Antigravity built-in terminal) in the repository root and execute:
```powershell
git clone https://github.com/Dani013-A/AIRIS-RFD.git AIRIS
cd AIRIS
Copy-Item AIRIS-Backend\.env.example AIRIS-Backend\.env
Copy-Item AIRIS-Mobile\.env.example AIRIS-Mobile\.env
Copy-Item AIRIS-Web\.env.example AIRIS-Web\.env.local
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup.ps1
```

> [!NOTE]
> Git Bash, WSL, and Cygwin are NOT required on Windows. Windows developers can run native PowerShell scripts (`.ps1`) directly inside standard PowerShell or VS Code.


---

## 3. What Setup Automates vs. Required Manual Actions

### What Setup Does Automatically:
1. Detects OS (macOS, Linux, Windows PowerShell).
2. Verifies system prerequisites (Node.js, npm, Python 3.9+, Git).
3. Creates the Python virtual environment (`AIRIS-Backend/.venv`).
4. Upgrades `pip` and installs all backend dependencies from `AIRIS-Backend/requirements.txt`.
5. Verifies Python backend module imports (`import main`).
6. Copies missing `.env.example` templates to `.env` (or `.env.local`).
7. Preserves any existing `.env` files without overwriting your credentials.
8. Installs npm dependencies for `AIRIS-Mobile`.
9. Verifies TypeScript compilation (`npx tsc --noEmit`).
10. Runs and verifies the Jest unit test suite (`npx jest --runInBand`).
11. Installs npm dependencies for `AIRIS-Web`.
12. Reports configuration status without leaking secret values.

### What Still Requires Manual Action:
1. **API Keys**: Add your AI provider API keys (`GEMINI_API_KEY`, `GROQ_API_KEY`, etc.) in `AIRIS-Backend/.env`.
2. **Firebase Configuration**: Add your client Firebase configuration keys in `AIRIS-Mobile/.env` and `AIRIS-Web/.env.local`.
3. **Optional Native Tools**: If performing native Android/iOS builds, manually install Android Studio / Xcode. (Not required for web testing or Expo Go).

---

## 4. Environment Variables Guide

Each component directory contains a template file (`.env.example`) with safe placeholders.

### AIRIS-Backend (`AIRIS-Backend/.env`)
| Variable | Required? | Description |
|---|---|---|
| `GEMINI_API_KEY` | Recommended | Google Gemini API key for LLM resume & interview analysis |
| `GROQ_API_KEY` | Recommended | Groq API key for ultra-fast fallback LLM inference |
| `OPENROUTER_API_KEY` | Optional | OpenRouter API key for alternative LLM routing |
| `MISTRAL_API_KEY` | Optional | Mistral AI API key for fallback LLM inference |
| `FRONTEND_URL` | Optional | CORS origin URL (Defaults to `*` or `http://localhost:8081`) |
| `ADMIN_UIDS` | Optional | Comma-separated list of Firebase UIDs authorized for admin endpoints |

### AIRIS-Mobile (`AIRIS-Mobile/.env`)
| Variable | Required? | Description |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Required | Firebase Client API Key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Required | Firebase Auth Domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Required | Firebase Project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Required | Firebase Storage Bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Required | Firebase Sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Required | Firebase Web App ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Required | Google Web Client ID for OAuth SSO |
| `EXPO_PUBLIC_API_URL` | Required | Backend URL (`http://localhost:8000` or LAN IP) |
| `EXPO_PUBLIC_YOUTUBE_API_KEY` | Optional | YouTube API key for video recommendations |

---

## 5. Running the Application

### Running the Backend API
- **macOS / Linux**:
  ```bash
  ./start_backend.sh
  ```
- **Windows (PowerShell)**:
  ```powershell
  .\start_backend.ps1
  ```
The API server runs at `http://127.0.0.1:8000` with hot-reload enabled.

### Running the Mobile Application
Start the Expo development server:
```bash
./start_mobile.sh
```
- Press **w** in the terminal to launch in a web browser.
- Scan the QR code with **Expo Go** on your physical phone (ensure your phone and computer are on the same Wi-Fi network and set `EXPO_PUBLIC_API_URL` in `AIRIS-Mobile/.env` to your computer's local LAN IP).

### Running the Admin Dashboard (AIRIS-Web)
```bash
cd AIRIS-Web
npm run dev
```
The dashboard will run at `http://localhost:3000`.

---

## 6. Running Tests & Verification

You can verify the codebase at any time using the provided scripts:

```bash
# Run backend health & API smoke tests
./test_api.sh        # Windows: bash test_api.sh

# Run complete system integration tests
./test_all.sh        # Windows: bash test_all.sh

# Run mobile TypeScript check
cd AIRIS-Mobile && npx tsc --noEmit

# Run mobile Jest test suite
cd AIRIS-Mobile && npx jest --runInBand
```

---

## 7. Troubleshooting Common Issues

### 1. `NameError: name 'Dict' is not defined`
- **Cause**: Python `typing` imports missing in backend source code under Python versions prior to 3.14.
- **Fix**: Run `./setup.sh` (or `.\setup.ps1` on Windows) to update backend dependencies and verify python imports.

### 2. PowerShell Script Execution Policy (`ps1 cannot be loaded`)
- **Cause**: Windows PowerShell execution policy restricts running unsigned scripts by default.
- **Fix**: Run PowerShell as Administrator or execute `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` before running `.\setup.ps1`.

### 3. Network Error Connecting Mobile to Backend
- **Cause**: Mobile app configured with `http://localhost:8000` while testing on a physical phone via Expo Go.
- **Fix**: Update `EXPO_PUBLIC_API_URL` in `AIRIS-Mobile/.env` to your machine's LAN IP (e.g. `http://192.168.1.15:8000`).

---

## 8. Security Guidelines
- **Never commit `.env` or `.env.local` files.**
- Keep Firebase security rules updated (`firestore.rules` is tracked in version control).
- Do not commit service account private keys or keystores.
