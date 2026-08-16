import numpy as np
import time
from sentence_transformers import SentenceTransformer
from typing import Dict, List, Any
from google import genai
import os

_model = None

def get_sbert_model() -> SentenceTransformer:
    global _model
    if _model is None:
        try:
            _model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        except Exception:
            _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

# Hardcoded templates for non-IT and IT career tracks
CAREER_PROFILES: Dict[str, str] = {
    # IT & Computing
    "data analyst": "SQL, Python, data cleaning, data visualization, databases, Tableau, Power BI, Excel, statistics, reporting, data modeling",
    "software engineer": "javascript, typescript, React, Node.js, API development, git, testing, debugging, data structures, algorithms, databases",
    "software developer": "javascript, typescript, React, Node.js, API development, git, testing, debugging, data structures, algorithms, databases",
    "system support": "windows server, Linux, networking, hardware troubleshooting, operating systems, active directory, security, customer support",
    "cybersecurity analyst": "network security, penetration testing, firewalls, incident response, vulnerability assessment, encryption, risk analysis, SIEM",
    "data annotation specialist": "data labeling, image annotation, bounding boxes, text tagging, dataset curation, quality assurance, ML validation, annotation guidelines",
    "ai data trainer": "ai reinforcement learning, prompt engineering, output grading, model evaluation, response tuning, dataset generation, rlhf",
    "mobile application developer": "react native, swift, kotlin, flutter, mobile UI, API integration, app store deployment, device testing, ios development, android development",
    
    # Engineering & Architecture
    "civil engineer": "AutoCAD, structural analysis, project management, concrete design, surveying, construction site safety, structural calculations, estimation",
    "mechanical engineer": "SolidWorks, CAD, thermodynamics, machine design, fluid mechanics, product testing, manufacturing processes, robotics, structural analysis",
    "electrical engineer": "circuit design, MATLAB, electrical wiring, power systems, PLC programming, signal processing, safety standards, electrical CAD",
    "architect": "Architectural design, Revit, SketchUp, AutoCAD, blueprints, building codes, sustainable design, space planning, drafting, project management",
    
    # Business, Finance & Management
    "accountant": "financial statements, general ledger, bookkeeping, tax preparation, cost accounting, auditing, balance sheets, billing, Excel, accounting standards",
    "financial analyst": "financial modeling, corporate finance, market research, Excel forecasting, portfolio management, business valuation, investment analysis",
    "marketing specialist": "SEO, SEM, social media management, content marketing, Google Analytics, market research, copywriting, advertising, brand strategy",
    "human resources manager": "employee relations, recruiting, onboarding, conflict resolution, labor laws, payroll administration, performance management, training",
    "business administrator": "operations management, business strategy, project coordination, budgeting, leadership, process improvement, communications",

    # Health & Science
    "nurse": "patient care, clinical assessment, medication administration, CPR, first aid, medical charting, healthcare safety, wound care, emergency response",
    "medical technologist": "laboratory testing, specimen analysis, microscopy, quality control, hematology, clinical chemistry, lab safety, blood banking",
    "pharmacist": "pharmacology, prescription verification, drug interactions, patient counseling, inventory management, dispensing, healthcare regulations",
    "data scientist": "machine learning, Python, R, deep learning, statistical modeling, data mining, SQL, pandas, predictive analytics, big data"
}

def calculate_cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    dot_product = np.dot(vec1, vec2)
    norm_a = np.linalg.norm(vec1)
    norm_b = np.linalg.norm(vec2)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot_product / (norm_a * norm_b))

import concurrent.futures

def fetch_dynamic_profile_from_ai(target_position: str) -> str:
    """Uses Gemini to retrieve standard expectations for any custom role."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return f"technical professional capabilities related to {target_position}"

    def _do_fetch():
        client = genai.Client(api_key=api_key)
        prompt = f"Provide a single-line comma-separated list of the top 10 key technical skills, tools, and responsibilities expected for a professional working as a '{target_position}'. Do not return anything else except the list."
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return response.text.strip()

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_do_fetch)
            text = future.result(timeout=3.0)
            if text:
                return text
    except Exception as e:
        print("Failed to fetch dynamic career profile from Gemini:", e)

    return f"technical professional capabilities related to {target_position}"

from functools import lru_cache

# Simple in‑memory cache for embeddings (up to 256 entries)
@lru_cache(maxsize=256)
def _cached_encode(text: str) -> np.ndarray:
    return get_sbert_model().encode(text)

def evaluate_semantic_alignment(
    skills_text: str,
    experience_text: str,
    target_position: str
) -> Dict[str, Any]:
    start_time = time.time()
    model = get_sbert_model()
    norm_position = target_position.strip().lower()

    # Retrieve standard profile template or query Gemini dynamically
    standard_profile = CAREER_PROFILES.get(norm_position)
    if not standard_profile:
        print(f"Custom role '{target_position}' not in hardcoded dictionary. Fetching dynamic profile from Gemini...")
        standard_profile = fetch_dynamic_profile_from_ai(target_position)

    # Batch‑encode the three texts in a single call for speed
    texts = [standard_profile, skills_text or "no technical skills listed", experience_text or "no professional experience listed"]
    # Use cached encoding for repeated texts, otherwise fall back to batch encode
    embeddings = []
    for txt in texts:
        try:
            embeddings.append(_cached_encode(txt))
        except Exception:
            # Fallback to direct encode if cache fails
            embeddings.append(model.encode(txt))
    profile_emb, skills_emb, exp_emb = embeddings

    skills_similarity = calculate_cosine_similarity(profile_emb, skills_emb)
    exp_similarity = calculate_cosine_similarity(profile_emb, exp_emb)

    skills_score = max(0, min(100, int((skills_similarity * 80) + 20)))
    experience_score = max(0, min(100, int((exp_similarity * 75) + 25)))

    if not skills_text.strip():
        skills_score = 0
    if not experience_text.strip():
        experience_score = 0

    elapsed = time.time() - start_time
    print(f"LOG: SBERT Analysis completed successfully from backend in {elapsed:.2f} seconds!")

    return {
        "skillsMatchScore": skills_score,
        "experienceScore": experience_score,
        "rawSkillsSimilarity": skills_similarity,
        "rawExperienceSimilarity": exp_similarity,
        "standardProfileUsed": standard_profile,
    }
