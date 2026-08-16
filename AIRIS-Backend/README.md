# AIRIS Backend

## Purpose
This directory contains the FastAPI application that powers the AI features of AIRIS. It handles resume parsing, semantic similarity scoring, and interview transcriptions using local and cloud-based machine learning models.

## Architecture
The backend is a lightweight FastAPI server. It exposes endpoints for file uploads, analysis, and interview evaluations. It delegates heavy NLP matching to a local SentenceTransformers model and relies on external APIs (Gemini, Groq, OpenRouter) for complex reasoning and summarization.

## Python Requirements
- Python 3.9 or higher

## Virtual Environment Setup
It is highly recommended to isolate dependencies using a virtual environment.
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

## Dependency Installation
Use the provided setup script or install dependencies manually:
```bash
./setup.sh
# or manually:
pip install -r requirements.txt
```

## `.env` Configuration
The application requires environment variables to authenticate with external AI providers and configure security policies.

A `.env.example` file is provided with safe placeholders.
1. Copy `.env.example` to `.env`.
2. Edit `.env` and fill in your actual API keys.

### Required Environment Variables
- `GEMINI_API_KEY`: API key for Google Gemini.
- `GROQ_API_KEY`: API key for Groq.
- `OPENROUTER_API_KEY`: API key for OpenRouter.
- `FRONTEND_URL`: The origin URL of your frontend application (used for CORS).

## Running the API
To run the server locally:
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

## Health Endpoint
You can verify the backend is running by visiting the root endpoint:
`GET http://127.0.0.1:8000/`

## AI and ML Components
### SBERT
We use `sentence-transformers/all-MiniLM-L6-v2` to compute similarity scores between student resumes and target job descriptions. This model runs entirely on the host machine.

### Gemini / Groq / OpenRouter
These external services are used to evaluate interview responses and generate contextual feedback. The backend manages the prompts and forwards the requests securely.

## Firebase
The backend does not currently utilize the Firebase Admin SDK. All database mutations are handled by the frontend apps using their respective client SDKs.

## CORS
Cross-Origin Resource Sharing (CORS) is strictly enforced. The backend reads the `FRONTEND_URL` environment variable and only allows requests originating from that domain. For local development, set this to `http://localhost:3000` or `http://localhost:8081`.

## File Upload Limitations
To protect against Denial of Service (DoS) and out-of-memory errors, the `/interview/transcribe` and `/upload` endpoints enforce a strict file size limit. Audio files exceeding 5MB are rejected before they are fully loaded into memory.

## Testing
A test script is available in the repository root (`test_api.sh`). Make sure the backend is running before executing it.

## Troubleshooting
- **Missing modules**: Ensure you have activated your virtual environment before running the server.
- **CORS errors**: Verify that `FRONTEND_URL` in your `.env` matches the exact URL of your client application.
- **Model download hangs**: The first time you run the backend, PyTorch will download the SBERT model (~90MB). Ensure you have a stable internet connection.

## Production Considerations
The SBERT model requires a reasonable amount of memory. Platforms with very low RAM limits (like the 512MB Render free tier) will crash with Out-Of-Memory (OOM) errors during startup or under load. Deploy this application to a host that provides at least 1GB to 2GB of RAM, such as Hugging Face Spaces (which provides 16GB RAM on the free tier).
