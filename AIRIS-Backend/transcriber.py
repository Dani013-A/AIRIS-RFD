import os
import requests
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

def call_groq_whisper(file_bytes: bytes, mime_type: str) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set")
    
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    # We must use multipart/form-data
    # Determine extension from mime
    ext = ".m4a" if "m4a" in mime_type else ".webm"
    files = {
        "file": (f"audio{ext}", file_bytes, mime_type)
    }
    data = {
        "model": "whisper-large-v3-turbo",
        "response_format": "json"
    }
    
    res = requests.post(url, headers=headers, files=files, data=data, timeout=10)
    res.raise_for_status()
    return res.json().get("text", "").strip()

def call_gemini_audio(file_bytes: bytes, mime_type: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    prompt = "Please accurately transcribe the following spoken audio. Output strictly the text transcription with no extra conversational text."
    
    response = model.generate_content([
        prompt,
        {"mime_type": mime_type, "data": file_bytes}
    ])
    return response.text.strip()

def transcribe_audio(file_bytes: bytes, mime_type: str) -> str:
    errors = []
    
    has_groq = bool(os.getenv("GROQ_API_KEY"))
    if has_groq:
        try:
            print("Executing transcriber: Groq Whisper ...")
            return call_groq_whisper(file_bytes, mime_type)
        except Exception as e:
            print("Groq Whisper error:", e)
            errors.append(str(e))
            
    has_gemini = bool(os.getenv("GEMINI_API_KEY"))
    if has_gemini:
        try:
            print("Executing transcriber: Gemini Fallback ...")
            return call_gemini_audio(file_bytes, mime_type)
        except Exception as e:
            print("Gemini Audio error:", e)
            errors.append(str(e))
            
    raise RuntimeError(f"All transcription providers failed: {'; '.join(errors)}")
