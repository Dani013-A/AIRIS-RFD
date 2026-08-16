# AIRIS
AI-Resume & Career Readiness Suite

AIRIS is a platform that helps students prepare for their careers through automated resume reviews, mock interviews, and employability analytics. The system evaluates student inputs and provides actionable feedback using AI models.

## Technologies Used
- React Native / Expo (Mobile and Web export)
- Next.js (Admin Dashboard)
- FastAPI (Python Backend)
- Firebase (Auth, Firestore, Storage)
- PyTorch / SentenceTransformers (Local NLP)
- External AI Providers (Gemini, Groq, OpenRouter)

## System Architecture

AIRIS-Mobile
      |
   Backend API
      |
AI Services / Firebase

AIRIS-Web
      |
Firebase / Backend

Note: AIRIS-Mobile is built with React Native and Expo. It can be compiled for native mobile platforms, but we currently use Expo Web as a build target to allow project managers and stakeholders to test the application via a web browser without needing to run simulators or native builds.

## Repository Structure
- `AIRIS-Mobile/`: The main student application (React Native/Expo).
- `AIRIS-Backend/`: The FastAPI backend handling AI processing and resume parsing.
- `AIRIS-Web/`: The Next.js admin dashboard for viewing analytics.

## Prerequisites
- Node.js (v18+)
- Python (3.9+)
- A Firebase project

## Complete First-Time Setup
We provide setup scripts for each project directory to install dependencies and initialize configuration files. Run the following from the repository root:

```bash
./AIRIS-Mobile/setup.sh
./AIRIS-Backend/setup.sh
./AIRIS-Web/setup.sh
```

## Environment Variable Setup
Each setup script will prompt you if a `.env` file is missing. 
Do not check real credentials into version control. You should copy the provided `.env.example` file in each directory to a local `.env` (or `.env.local`) file and fill in your actual API keys.

## Component Communication
- The **Mobile/Web** frontend sends resumes and interview audio to the **Backend API**.
- The **Backend API** parses the files, evaluates them against the target job using NLP and LLMs, and returns the analysis.
- Both the **Mobile** app and the **Admin Dashboard** connect directly to **Firebase** for authentication and database reads/writes. 
- The backend enforces strict CORS policies and limits upload sizes to prevent abuse.

## How to Run Each Component
Each directory has its own instructions for running locally. Refer to the specific README files:
- [AIRIS-Mobile/README.md](./AIRIS-Mobile/README.md)
- [AIRIS-Backend/README.md](./AIRIS-Backend/README.md)
- [AIRIS-Web/README.md](./AIRIS-Web/README.md)

## Testing
We have simple shell scripts in the root directory to help verify the system:
- `test_api.sh`: Verifies backend endpoints are responsive.
- `test_all.sh`: Runs a suite of health checks and mock uploads against the backend.

## Security Guidelines
- Never commit `.env` or `.env.local` files.
- Keep Firebase security rules updated (`firestore.rules` is tracked in version control).
- Do not bypass backend size limits on file uploads.
- The repository `.gitignore` is configured to prevent accidental commits of keys, virtual environments, and node modules.

## Development Workflow
1. Start the FastAPI backend locally.
2. Start the Expo development server in the `AIRIS-Mobile` directory.
3. Make changes and test using the Expo Go app or an iOS/Android simulator.

## Production / PM Testing Workflow
To provide a fast, accessible testing environment for project managers without requiring local setups:
1. The backend is deployed to a remote host (e.g., Hugging Face Spaces).
2. The frontend is exported as a static web application (`npx expo export -p web`) and deployed to a static host (e.g., Vercel).
3. The PM tests the application via a standard web URL.

## Current Project Status
- The core mobile frontend, backend API, and admin web dashboard are functional.
- The project is ready for its first remote deployment to support PM testing.
- Local hardcoded IPs have been removed in favor of environment variables.
