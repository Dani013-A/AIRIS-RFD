import os
import json
from typing import Dict, Any, List, Optional
from ai_service import generate_text_with_fallback
from sbert_matcher import get_sbert_model, calculate_cosine_similarity, CAREER_CONCEPTS

# Standard predefined entities lists for local lookup
STANDARD_JOBS = list(CAREER_CONCEPTS.keys())

STANDARD_SKILLS = [
    "python", "javascript", "typescript", "react.js", "node.js", "sql", "tableau", "power bi",
    "excel", "git", "machine learning", "data labeling", "html", "css", "autocad", "revit",
    "solidworks", "bookkeeping", "auditing", "tax preparation", "clinical care", "first aid"
]

STANDARD_CERTIFICATIONS = [
    "AWS Certified Cloud Practitioner", "AWS Certified Developer - Associate",
    "Microsoft Certified: Azure Data Fundamentals", "Project Management Professional (PMP)",
    "Certified Public Accountant (CPA)"
]

STANDARD_PROGRAMS = [
    "Bachelor of Science in Information Technology",
    "Bachelor of Science in Computer Science",
    "Bachelor of Science in Information Systems",
    "Bachelor of Science in Data Science and Analytics",
    "Bachelor of Science in Entertainment and Multimedia Computing",
    "Bachelor of Science in Civil Engineering",
    "Bachelor of Science in Mechanical Engineering",
    "Bachelor of Science in Electrical Engineering",
    "Bachelor of Science in Electronics Engineering",
    "Bachelor of Science in Industrial Engineering",
    "Bachelor of Science in Chemical Engineering",
    "Bachelor of Science in Accountancy",
    "Bachelor of Science in Accounting Information System",
    "Bachelor of Science in Business Administration"
]

def LevenshteinDistance(s1: str, s2: str) -> int:
    if len(s1) > len(s2):
        s1, s2 = s2, s1
    distances = range(len(s1) + 1)
    for i2, c2 in enumerate(s2):
        distances_ = [i2+1]
        for i1, c1 in enumerate(s1):
            if c1 == c2:
                distances_.append(distances[i1])
            else:
                distances_.append(1 + min((distances[i1], distances[i1 + 1], distances_[-1])))
        distances = distances_
    return distances[-1]

def clean_text_formatting(val: str) -> str:
    """Stage 1: Normalize formatting (spaces, case, dash)."""
    if not val:
        return ""
    val = val.strip().lower()
    val = " ".join(val.split())
    return val

def check_exact_match(val: str, standard_list: List[str]) -> Optional[str]:
    """Stage 2: Check for exact match (case-insensitive)."""
    cleaned = clean_text_formatting(val)
    for item in standard_list:
        if item.lower() == cleaned:
            return item
    return None

def check_fuzzy_spelling(val: str, standard_list: List[str]) -> Optional[str]:
    """Stage 3: Typo matching via Levenshtein distance."""
    cleaned = clean_text_formatting(val)
    if len(cleaned) < 4:
        return None
        
    best_match = None
    min_dist = 999
    
    for item in standard_list:
        item_lower = item.lower()
        dist = LevenshteinDistance(cleaned, item_lower)
        if dist < min_dist:
            min_dist = dist
            best_match = item
            
    if min_dist <= 2:
        return best_match
    return None

def run_semantic_sbert_match(val: str, type_name: str) -> Optional[str]:
    """Stage 4: Semantic match utilizing SBERT embeddings."""
    if type_name != "job":
        return None
        
    model = get_sbert_model()
    cleaned = clean_text_formatting(val)
    input_emb = model.encode(cleaned)
    
    best_job = None
    max_sim = 0.0
    
    for job, profile in CAREER_CONCEPTS.items():
        # Compare against SBERT profile representation
        profile_emb = model.encode(", ".join(profile))
        sim = calculate_cosine_similarity(input_emb, profile_emb)
        if sim > max_sim:
            max_sim = sim
            best_job = job
            
    # Clear semantic cutoff threshold
    if max_sim >= 0.82:
        for key in CAREER_CONCEPTS.keys():
            if key.lower() == best_job.lower():
                return key
    return None

def run_ai_interpretation(val: str, type_name: str, standard_list: List[str]) -> Dict[str, Any]:
    """Stage 5: AI fallback interpretation utilizing Gemini/Groq chain."""
    prompt = f"""
    You are an expert career ontology engine. We need to normalize a user input value representing a '{type_name}'.
    User entered value: "{val}"
    
    Here is our list of accepted standard '{type_name}' options:
    {json.dumps(standard_list, indent=2)}

    Task:
    Determine if this represents a clear synonym, typo, or alias of one of the standard options, OR if it represents a distinct custom value, OR if it is completely ambiguous.
    
    Generate a JSON response conforming EXACTLY to the following keys:
    {{
      "normalizedValue": "string (the matched standard option or a proper title-cased custom option, or null if completely ambiguous)",
      "confidence": 0.0 - 1.0 (float confidence rating),
      "jobFamily": "string (e.g., Software Engineering, Healthcare, Accounting, or null)",
      "industry": "string (e.g., Technology, Healthcare, Finance, or null)",
      "suggestions": ["string" (list of 2-3 closest standard options if confidence is medium/low)]
    }}

    Rules:
    - Return ONLY valid JSON, do not include markdown blocks like ```json.
    - If the input is completely ambiguous or nonsense (e.g., "AI thing", "asd"), confidence should be < 0.4 and normalizedValue should be null.
    """
    
    try:
        res = generate_text_with_fallback(prompt)
        if res.startswith("```"):
            lines = res.split("\n")
            if lines[0].startswith("```json") or lines[0].startswith("```"):
                res = "\n".join(lines[1:-1]).strip()
        parsed = json.loads(res)
        return parsed
    except Exception as e:
        print("AI Normalization fallback failed:", e)
        return {
            "normalizedValue": None,
            "confidence": 0.0,
            "jobFamily": None,
            "industry": None,
            "suggestions": []
        }

def normalize_career_input(input_val: str, type_name: str) -> Dict[str, Any]:
    """
    Executes the multi-stage normalization pipeline for any input type.
    """
    if not input_val or not input_val.strip():
        return {"originalInput": input_val, "normalizedValue": None, "confidence": 0.0, "suggestions": []}

    standard_lists = {
        "job": STANDARD_JOBS,
        "skill": STANDARD_SKILLS,
        "certification": STANDARD_CERTIFICATIONS,
        "program": STANDARD_PROGRAMS
    }
    
    std_list = standard_lists.get(type_name, [])
    
    # 1. Exact match check
    exact = check_exact_match(input_val, std_list)
    if exact:
        return {
            "originalInput": input_val,
            "normalizedValue": exact,
            "confidence": 1.0,
            "suggestions": []
        }
        
    # 2. Fuzzy spelling check
    fuzzy = check_fuzzy_spelling(input_val, std_list)
    if fuzzy:
        return {
            "originalInput": input_val,
            "normalizedValue": fuzzy,
            "confidence": 0.95,
            "suggestions": []
        }
        
    # 3. SBERT semantic check (for jobs)
    semantic = run_semantic_sbert_match(input_val, type_name)
    if semantic:
        return {
            "originalInput": input_val,
            "normalizedValue": semantic,
            "confidence": 0.85,
            "suggestions": []
        }
        
    ai_res = run_ai_interpretation(input_val, type_name, std_list)
    
    conf = ai_res.get("confidence", 0.0)
    norm_val = ai_res.get("normalizedValue")
    
    if conf < 0.5:
        norm_val = None
        
    return {
        "originalInput": input_val,
        "normalizedValue": norm_val,
        "confidence": conf,
        "jobFamily": ai_res.get("jobFamily"),
        "industry": ai_res.get("industry"),
        "suggestions": ai_res.get("suggestions", [])
    }
