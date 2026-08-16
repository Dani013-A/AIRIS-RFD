import os
import time
import requests
from dotenv import load_dotenv
# Load environment variables from .env in this directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
# Use legacy google.generativeai package for Gemini (compatible with current environment)
import google.generativeai as genai


import concurrent.futures

def call_gemini(prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    def _do_call():
        if hasattr(genai, "configure"):
            genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text.strip()

    # Do not use 'with' block, which calls executor.shutdown(wait=True) and blocks the main thread
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    future = executor.submit(_do_call)
    try:
        return future.result(timeout=3.0)
    except concurrent.futures.TimeoutError:
        raise TimeoutError("Gemini API timed out after 3 seconds")


def call_groq(prompt: str) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set")
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2
    }
    res = requests.post(url, headers=headers, json=data, timeout=3.0)
    res.raise_for_status()
    return res.json()["choices"][0]["message"]["content"].strip()

def call_openrouter(prompt: str) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not set")
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "google/gemini-2.5-flash",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2
    }
    res = requests.post(url, headers=headers, json=data, timeout=10)
    res.raise_for_status()
    return res.json()["choices"][0]["message"]["content"].strip()

def generate_text_with_fallback(prompt: str) -> str:
    """
    Attempts to complete a prompt using available providers (Gemini, Groq, OpenRouter).
    If no API keys are set, immediately raises RuntimeError to use local SBERT baseline.
    """
    has_gemini = bool(os.getenv("GEMINI_API_KEY"))
    has_groq = bool(os.getenv("GROQ_API_KEY"))
    has_openrouter = bool(os.getenv("OPENROUTER_API_KEY"))

    if not (has_gemini or has_groq or has_openrouter):
        raise RuntimeError("No AI API keys set. Using local SBERT baseline.")

    providers = []
    if has_groq:
        providers.append(("Groq", call_groq))
    if has_openrouter:
        providers.append(("OpenRouter", call_openrouter))
    if has_gemini:
        providers.append(("Gemini", call_gemini))
    
    errors = []
    for name, func in providers:
        try:
            print(f"Executing provider: {name} ...")
            start_time = time.time()
            res = func(prompt)
            elapsed = time.time() - start_time
            print(f"Provider {name} finished in {elapsed:.2f} seconds.")
            if res:
                return res
        except Exception as e:
            elapsed = time.time() - start_time
            err_msg = f"{name} error after {elapsed:.2f}s: {str(e)}"
            print(err_msg)
            errors.append(err_msg)
            
    raise RuntimeError(f"All AI API providers failed: {'; '.join(errors)}")
