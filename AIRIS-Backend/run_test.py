import os
import requests
from dotenv import load_dotenv

load_dotenv(".env")

def check_groq():
    api_key = os.getenv("GROQ_API_KEY")
    print("GROQ API KEY:", "SET" if api_key else "MISSING")
    if not api_key: return
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    data = {"model": "openai/gpt-oss-120b", "messages": [{"role": "user", "content": "Hello"}], "temperature": 0.2}
    res = requests.post(url, headers=headers, json=data)
    print("Groq Response:", res.status_code, res.text)

def check_mistral():
    api_key = os.getenv("MISTRAL_API_KEY")
    print("MISTRAL API KEY:", "SET" if api_key else "MISSING")
    if not api_key: return
    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json", "Accept": "application/json"}
    data = {"model": "mistral-large-latest", "messages": [{"role": "user", "content": "Hello"}], "temperature": 0.2}
    res = requests.post(url, headers=headers, json=data)
    print("Mistral Response:", res.status_code, res.text)

def check_openrouter():
    api_key = os.getenv("OPENROUTER_API_KEY")
    print("OPENROUTER API KEY:", "SET" if api_key else "MISSING")
    if not api_key: return
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    data = {"model": "openai/gpt-4o", "messages": [{"role": "user", "content": "Hello"}], "temperature": 0.2}
    res = requests.post(url, headers=headers, json=data)
    print("OpenRouter Response:", res.status_code, res.text)

def check_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    print("GEMINI API KEY:", "SET" if api_key else "MISSING")
    if not api_key: return
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-pro")
    try:
        response = model.generate_content("Hello")
        print("Gemini Response: OK", response.text)
    except Exception as e:
        print("Gemini Response: Error", e)

print("--- Checking Providers ---")
check_groq()
check_mistral()
check_openrouter()
check_gemini()
