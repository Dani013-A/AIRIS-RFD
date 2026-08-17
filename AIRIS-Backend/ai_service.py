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
        return future.result(timeout=30.0)
    except concurrent.futures.TimeoutError:
        raise TimeoutError("Gemini API timed out after 30 seconds")


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
    res = requests.post(url, headers=headers, json=data, timeout=30.0)
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
    res = requests.post(url, headers=headers, json=data, timeout=30.0)
    res.raise_for_status()
    return res.json()["choices"][0]["message"]["content"].strip()

def call_mistral(prompt: str) -> str:
    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        raise ValueError("MISTRAL_API_KEY not set")
    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "mistral-small-latest",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2
    }
    res = requests.post(url, headers=headers, json=data, timeout=30.0)
    res.raise_for_status()
    return res.json()["choices"][0]["message"]["content"].strip()

def generate_text_with_fallback(prompt: str) -> str:
    """
    Attempts to complete a prompt using available providers.
    If no API keys are set, immediately raises RuntimeError to use local SBERT baseline.
    """
    has_mistral = bool(os.getenv("MISTRAL_API_KEY"))
    has_gemini = bool(os.getenv("GEMINI_API_KEY"))
    has_groq = bool(os.getenv("GROQ_API_KEY"))
    has_openrouter = bool(os.getenv("OPENROUTER_API_KEY"))

    if not (has_mistral or has_gemini or has_groq or has_openrouter):
        raise RuntimeError("No AI API keys set. Using local SBERT baseline.")

    providers = []
    # Prioritize: Groq -> Mistral -> Gemini -> OpenRouter
    if has_groq:
        providers.append(("Groq", call_groq))
    if has_mistral:
        providers.append(("Mistral", call_mistral))
    if has_gemini:
        providers.append(("Gemini", call_gemini))
    if has_openrouter:
        providers.append(("OpenRouter", call_openrouter))
    
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
            
import json
import re

def _extract_json(text: str) -> dict | list:
    """Safely extracts JSON from a string that might contain markdown fences."""
    try:
        match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
        if match:
            return json.loads(match.group(1))
        return json.loads(text)
    except Exception:
        # If extraction fails completely, return empty list to fallback safely
        return []

def validate_evidence_batch(evidence_batch: list) -> list:
    """
    Takes a list of dicts: [{"concept": "Python", "evidence": "I used AutoCAD"}]
    Returns a list of dicts with classifications.
    If LLM fails, returns an empty list.
    """
    if not evidence_batch:
        return []
        
    prompt = f"""
    You are an expert technical recruiter performing a strict audit of candidate resumes.
    SBERT found semantic overlap between the target concept and the candidate's text chunk, but SBERT is often easily fooled by loosely related terms (e.g. AutoCAD != Data Visualization, Project Management != SQL).
    
    TASK: Validating Candidate Evidence
    For each item in the batch below, strictly evaluate if the candidate's text chunk provides DIRECT, MEANINGFUL evidence that they possess the specific target competency.
    
    RULES:
    1. STRONG_MATCH: The text contains explicit, direct evidence of the exact skill or a highly equivalent direct synonym in the same domain.
    2. PARTIAL_MATCH: The text demonstrates some genuinely transferable aspect or tangential experience, but does NOT directly demonstrate the core competency.
    3. NO_RELEVANT_EVIDENCE: The text is from a different domain entirely, or the semantic overlap is purely coincidental. (e.g., Engineering analysis ≠ Statistical analysis. Technical reports ≠ Data visualization). Do not infer skills that are not supported.
    
    BATCH TO EVALUATE:
    {json.dumps(evidence_batch, indent=2)}
    
    OUTPUT FORMAT:
    Respond STRICTLY with a JSON array in the exact same order, containing your classifications. Do not output anything outside the JSON.
    [
      {{
        "concept": "<concept>",
        "classification": "<STRONG_MATCH|PARTIAL_MATCH|NO_RELEVANT_EVIDENCE>",
        "reasoning": "<short sentence explaining why>"
      }}
    ]
    """
    
    try:
        # Generate text using the fallback system, ensuring we get a response from any available provider
        raw_response = generate_text_with_fallback(prompt)
        parsed = _extract_json(raw_response)
        
        if isinstance(parsed, list):
            return parsed
        return []
    except Exception as e:
        print(f"Evidence validation failed: {e}")
        return []

def evaluate_intrinsic_resume_strength(parsed_text: str) -> dict:
    """
    Evaluates the intrinsic strength/value of the resume itself, completely separate from Role Relevance.
    Passes cached job-market intelligence to the LLM to determine the actual demand value of the candidate's skills.
    """
    if not parsed_text:
        return {"skills": 0, "education": 0, "certifications": 0}
        
    cache_data = "{}"
    try:
        cache_path = os.path.join(os.path.dirname(__file__), "market_intelligence_cache.json")
        with open(cache_path, "r") as f:
            cache_data = f.read()
    except Exception as e:
        print(f"Failed to load market intelligence cache: {e}")
        
    prompt = f"""
    You are an expert technical recruiter and labor market analyst evaluating the INTRINSIC VALUE of a candidate's resume.
    
    TASK:
    Evaluate the raw strength of the resume across three dimensions on a 0-100 scale.
    Do NOT evaluate how well they match a specific target role.
    Evaluate how STRONG and VALUABLE the resume is based on its own merits and actual evidence.
    
    1. Skills Value (0-100)
    - Evaluate explicit skill presence, demonstrated use, projects/work supporting the skill, and proficiency evidence.
    - Below is the current Job Market Intelligence Cache. Identify which skills the candidate possesses and use the cached `demandScore` to inform how valuable their skillset is in the current job market.
    - Highly demanded skills strongly support a high score.
    - A skill explicitly listed but never demonstrated should receive less strength than a proven skill.
    
    JOB MARKET INTELLIGENCE CACHE:
    {cache_data}
    
    2. Education Value (0-100)
    - Evaluate degree/program, field of study, relevance, and coursework/achievements.
    - Do NOT create a large score bonus simply because a university is prestigious.
    
    3. Certification Value (0-100)
    - Evaluate certification relevance, recognized issuer, technical value, and recency.
    - If there are zero certifications, the score is 0.
    
    RESUME TEXT:
    {parsed_text}
    
    OUTPUT FORMAT:
    Respond STRICTLY with a JSON object. Do not output anything outside the JSON.
    {{
      "skills": <int 0-100>,
      "education": <int 0-100>,
      "certifications": <int 0-100>,
      "reasoning": "<brief sentence justifying the scores based on evidence and market intelligence>"
    }}
    """
    
    try:
        raw_response = generate_text_with_fallback(prompt)
        parsed = _extract_json(raw_response)
        
        if isinstance(parsed, dict) and "skills" in parsed:
            return {
                "skills": int(parsed.get("skills", 0)),
                "education": int(parsed.get("education", 0)),
                "certifications": int(parsed.get("certifications", 0))
            }
        return {"skills": 50, "education": 50, "certifications": 0}
    except Exception as e:
        print(f"Intrinsic evaluation failed: {e}")
        return {"skills": 50, "education": 50, "certifications": 0}
