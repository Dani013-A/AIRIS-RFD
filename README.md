# AIRIS
### AI-Resume & Career Readiness Suite

AIRIS is an AI-powered platform designed to assist university students in career preparation through automated resume analysis, ATS compatibility scoring, mock interview feedback, and institutional employability analytics.

---

## Project Structure

AIRIS is organized as a multi-component workspace:

- **`AIRIS-Mobile/`**: Student-facing application built with React Native and Expo. Supports iOS, Android (via Expo Go), and static web export (`npx expo export -p web`).
- **`AIRIS-Backend/`**: FastAPI Python server handling local SBERT sentence embeddings, ATS mathematical scoring, resume file parsing (PDF, DOCX, TXT, RTF), and LLM feedback generation (Gemini, Groq, OpenRouter, Mistral).
- **`AIRIS-Web/`**: Next.js admin dashboard providing institutional analytics, student progress tracking, and career readiness reports.

---

## System Prerequisites

Ensure your development machine has the following tools installed:

### macOS / Linux
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm**: v9.0.0 or higher (packaged with Node.js)
- **Python**: v3.9 or higher ([Download Python](https://www.python.org/))
- **Git**: ([Download Git](https://git-scm.com/))

### Windows
- **Operating System**: Windows 10 or 11
- **Terminal**: PowerShell (or the VS Code / Antigravity built-in terminal)
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm**: v9.0.0 or higher (packaged with Node.js)
- **Python**: v3.9 or higher ([Download Python](https://www.python.org/))
- **Git**: ([Download Git for Windows](https://git-scm.com/))

> [!NOTE]
> Git Bash, WSL, and Cygwin are NOT required. Windows developers can run native PowerShell scripts (`.ps1`) directly inside standard PowerShell or VS Code.

---

## Quickstart Developer Onboarding Guide

> [!IMPORTANT]
> **Setup & Credential Configuration**:
> The setup scripts (`./setup.sh` or `.\setup.ps1`) install all required Python & Node.js dependencies, build virtual environments, verify module imports, and run test suites.
> **However, setup scripts do NOT generate API keys or credentials.**
> You MUST copy the template `.env.example` files to local environment files (`.env` or `.env.local`) and populate them with your actual developer credentials/API keys before running setup or starting the application.

---

### macOS / Linux Setup Flow

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Dani013-A/AIRIS-RFD.git AIRIS
   ```

2. **Change into the repository directory**:
   ```bash
   cd AIRIS
   ```

3. **Create and populate environment configuration files**:
   Copy the example template files to local environment files:
   ```bash
   cp AIRIS-Backend/.env.example AIRIS-Backend/.env
   cp AIRIS-Mobile/.env.example AIRIS-Mobile/.env
   cp AIRIS-Web/.env.example AIRIS-Web/.env.local
   ```
   - Open `AIRIS-Backend/.env` in your text editor and insert your real AI API key (`GEMINI_API_KEY` or `GROQ_API_KEY`).
   - Open `AIRIS-Mobile/.env` and insert your Firebase client keys (`EXPO_PUBLIC_FIREBASE_*`) and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.

4. **Run the setup system**:
   ```bash
   ./setup.sh
   ```

5. **Start the FastAPI backend**:
   ```bash
   ./start_backend.sh
   ```

6. **Start mobile or web as applicable**:
   - Start the Expo mobile server (in a second terminal window):
     ```bash
     ./start_mobile.sh
     ```
   - Or start the Next.js web dashboard:
     ```bash
     cd AIRIS-Web && npm run dev
     ```

---

### Windows Setup Flow (PowerShell / VS Code Terminal)

1. **Clone the repository**:
   ```powershell
   git clone https://github.com/Dani013-A/AIRIS-RFD.git AIRIS
   ```

2. **Change into the repository directory**:
   ```powershell
   cd AIRIS
   ```

3. **Create and populate environment configuration files**:
   Copy the example template files to local environment files:
   ```powershell
   Copy-Item AIRIS-Backend\.env.example AIRIS-Backend\.env
   Copy-Item AIRIS-Mobile\.env.example AIRIS-Mobile\.env
   Copy-Item AIRIS-Web\.env.example AIRIS-Web\.env.local
   ```
   - Open `AIRIS-Backend\.env` in your code editor and insert your real AI API key (`GEMINI_API_KEY` or `GROQ_API_KEY`).
   - Open `AIRIS-Mobile\.env` and insert your Firebase client keys (`EXPO_PUBLIC_FIREBASE_*`).

4. **Run the PowerShell setup system**:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   .\setup.ps1
   ```

5. **Start the FastAPI backend**:
   ```powershell
   .\start_backend.ps1
   ```

6. **Start mobile or web as applicable**:
   - Start the Expo mobile server (in a second terminal window):
     ```powershell
     .\start_mobile.ps1
     ```
   - Or start the Next.js web dashboard:
     ```powershell
     cd AIRIS-Web; npm run dev
     ```

---

## Environment Variable Reference

### `AIRIS-Backend/.env`
| Variable | Required? | Description |
|---|---|---|
| `GEMINI_API_KEY` | Recommended | Google Gemini API key for LLM feedback |
| `GROQ_API_KEY` | Recommended | Groq API key for fast fallback LLM inference |
| `OPENROUTER_API_KEY` | Optional | OpenRouter API key for alternative LLM routing |
| `MISTRAL_API_KEY` | Optional | Mistral AI API key for fallback LLM inference |
| `FRONTEND_URL` | Optional | Allowed CORS origin (Defaults to `*` or `http://localhost:8081`) |
| `ADMIN_UIDS` | Optional | Comma-separated Firebase UIDs authorized for admin actions |

### `AIRIS-Mobile/.env`
| Variable | Required? | Description |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Required | Firebase Web API Key |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Required | Firebase Project ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Required | Google OAuth Web Client ID for SSO |
| `EXPO_PUBLIC_API_URL` | Required | FastAPI backend URL (`http://localhost:8000` or local LAN IP) |

---

## Running Components Individually

### Running the FastAPI Backend (`AIRIS-Backend`)
- **macOS / Linux**:
  ```bash
  cd AIRIS-Backend
  .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
  ```
- **Windows (PowerShell)**:
  ```powershell
  cd AIRIS-Backend
  .\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
  ```
Access the interactive OpenAPI swagger documentation at `http://127.0.0.1:8000/docs`.

### Running the Mobile App (`AIRIS-Mobile`)
```bash
cd AIRIS-Mobile
npm start
```
- Press **w** to launch the web version in your browser.
- Scan the printed QR code with **Expo Go** on your iOS/Android physical device.

### Running the Admin Dashboard (`AIRIS-Web`)
```bash
cd AIRIS-Web
npm run dev
```
Access the dashboard at `http://localhost:3000`.

---

## System Verification & Testing

Verify the codebase at any time using the provided validation scripts:

### macOS / Linux
```bash
# Run backend health & API smoke test
./test_api.sh

# Run complete system integration tests
./test_all.sh

# Run mobile TypeScript type checks
cd AIRIS-Mobile && npx tsc --noEmit

# Run mobile Jest unit test suite
cd AIRIS-Mobile && npx jest --runInBand
```

### Windows (PowerShell)
```powershell
# Run mobile TypeScript type checks
cd AIRIS-Mobile; npx tsc --noEmit

# Run mobile Jest unit test suite
cd AIRIS-Mobile; npx jest --runInBand
```

---

## Troubleshooting Common Setup Issues

### 1. `NameError: name 'Dict' is not defined`
- **Cause**: Standard library `typing` import omitted in source code under Python < 3.14.
- **Fix**: Run `./setup.sh` (or `.\setup.ps1` on Windows) to update source files and verify Python imports.

### 2. PowerShell Script Execution Policy (`ps1 cannot be loaded`)
- **Cause**: Windows restricts unsigned script execution by default.
- **Fix**: Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in PowerShell before executing `.\setup.ps1`.

### 3. Mobile App Cannot Connect to Backend on Physical Phone
- **Cause**: `EXPO_PUBLIC_API_URL` is set to `http://localhost:8000` (which refers to the phone itself).
- **Fix**: Set `EXPO_PUBLIC_API_URL` in `AIRIS-Mobile/.env` to your computer's local network IP address (e.g. `http://192.168.1.15:8000`).

---

## Security Guidelines
- **Never commit `.env` or `.env.local` files.**
- Maintain updated Firebase security rules (`firestore.rules` is tracked in version control).
- Do not commit keystores (`*.keystore`, `*.jks`) or service account JSON credentials into Git.
