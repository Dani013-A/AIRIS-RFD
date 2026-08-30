import numpy as np
import time
from sentence_transformers import SentenceTransformer
from typing import Dict, List, Any, Optional
import os
import json
from functools import lru_cache
from ai_service import generate_text_with_fallback
from evidence_chunker import chunk_resume_evidence, EvidenceChunk

_model = None

def get_sbert_model() -> SentenceTransformer:
    global _model
    if _model is None:
        try:
            _model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        except Exception:
            _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

def calculate_cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    dot_product = np.dot(vec1, vec2)
    norm_a = np.linalg.norm(vec1)
    norm_b = np.linalg.norm(vec2)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot_product / (norm_a * norm_b))

@lru_cache(maxsize=1024)
def _cached_encode(text: str) -> np.ndarray:
    return get_sbert_model().encode(text)

# --- GENERIC DATA-DRIVEN BENCHMARK CATALOG (Domain-Neutral) ---
# Expandable catalog for standard roles; unlisted roles fetch dynamic profiles
CAREER_BENCHMARKS: Dict[str, Dict[str, List[str]]] = {
    "software engineer": {
        "required_skills": ["Python", "FastAPI", "React Native", "TypeScript", "SQL"],
        "recommended_skills": ["Firebase", "REST API", "Docker", "Git"],
        "education_benchmarks": ["Bachelor of Science in Information Technology", "Bachelor of Science in Computer Science", "Software Engineering Fundamentals", "Computer Science Discipline"],
        "certification_benchmarks": ["AWS Certified Developer", "CompTIA Security+", "Microsoft Certified Developer"]
    },
    "senior software engineer": {
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "React", "TypeScript"],
        "recommended_skills": ["Docker", "Kubernetes", "AWS", "System Design"],
        "education_benchmarks": ["Bachelor of Science in Computer Science", "Computer Science Degree", "Software Architecture"],
        "certification_benchmarks": ["AWS Certified Solutions Architect", "AWS Certified Developer"]
    },
    "data analyst": {
        "required_skills": ["SQL", "Python", "Data Visualization", "Excel", "Financial Reporting"],
        "recommended_skills": ["Power BI", "Tableau", "Statistical Analysis", "ETL"],
        "education_benchmarks": ["Bachelor of Science in Information Technology", "Statistics", "Computer Science", "Business Analytics"],
        "certification_benchmarks": ["Google Data Analytics Professional Certificate", "Microsoft Certified Power BI Data Analyst"]
    },
    "accountant": {
        "required_skills": ["Financial Auditing", "Bookkeeping", "Tax Compliance", "Excel", "Financial Reporting"],
        "recommended_skills": ["Bank Reconciliation", "Accounting Software", "Internal Controls"],
        "education_benchmarks": ["Bachelor of Science in Accountancy", "Accounting Discipline", "Financial Management Degree"],
        "certification_benchmarks": ["Certified Public Accountant", "Certified Bookkeeper"]
    },
    "civil engineer": {
        "required_skills": ["Structural Analysis", "AutoCAD", "STAAD.Pro", "Quantity Estimation", "Construction Planning"],
        "recommended_skills": ["Concrete Structure Design", "Site Safety"],
        "education_benchmarks": ["Bachelor of Science in Civil Engineering", "Civil Engineering Discipline", "Structural Engineering"],
        "certification_benchmarks": ["Licensed Civil Engineer", "Professional Engineer"]
    },
    "architectural designer": {
        "required_skills": ["AutoCAD", "SketchUp", "Architectural Design", "3D Modeling", "Technical Drawing"],
        "recommended_skills": ["Building Information Modeling", "Drafting"],
        "education_benchmarks": ["Bachelor of Science in Architecture", "Architectural Studies", "Design Studio"],
        "certification_benchmarks": ["Registered Architect", "Autodesk Certified Professional"]
    },
    "marketing specialist": {
        "required_skills": ["Digital Marketing", "Social Media Marketing", "Excel", "Market Research", "Content Creation"],
        "recommended_skills": ["Google Analytics", "Campaign Planning", "Customer Personas"],
        "education_benchmarks": ["Bachelor of Science in Business Administration", "Marketing Management", "Business Administration"],
        "certification_benchmarks": ["Google Analytics Certificate", "HubSpot Marketing Certified"]
    }
}

# Backward-compatibility export for normalizer.py and entity normalizer lookup
CAREER_CONCEPTS: Dict[str, List[str]] = {
    role: data.get("required_skills", []) + data.get("recommended_skills", [])
    for role, data in CAREER_BENCHMARKS.items()
}

def fetch_dynamic_profile_from_ai(target_position: str) -> Dict[str, List[str]]:
    """Uses LLM to retrieve data-driven benchmark profiles for unlisted roles."""
    prompt = f"""
    You are an expert technical recruiter. Provide benchmark competencies for a professional working as '{target_position}'.
    Return ONLY a JSON object with this exact structure:
    {{
        "required_skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"],
        "recommended_skills": ["Skill 6", "Skill 7"],
        "education_benchmarks": ["Degree in relevant field", "Academic discipline"],
        "certification_benchmarks": ["Relevant Certification Title"]
    }}
    Do not include markdown formatting or extra text.
    """
    try:
        response_text = generate_text_with_fallback(prompt)
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            if lines[0].startswith("```json") or lines[0].startswith("```"):
                response_text = "\n".join(lines[1:-1]).strip()
        parsed = json.loads(response_text)
        if isinstance(parsed, dict) and "required_skills" in parsed:
            return parsed
    except Exception as e:
        print(f"Dynamic profile fetch failed for '{target_position}': {e}")

    norm = target_position.replace(" ", "+")
    return {
        "required_skills": [f"{target_position} Core Competency", "Domain Knowledge", "Technical Skills", "Problem Solving", "Execution"],
        "recommended_skills": ["Industry Best Practices", "Tools"],
        "education_benchmarks": [f"Degree in {target_position} or related field", "Relevant Academic Discipline"],
        "certification_benchmarks": [f"Professional Certification in {target_position}"]
    }

def get_target_benchmark_profile(target_position: str) -> Dict[str, List[str]]:
    norm_pos = target_position.strip().lower()
    if norm_pos in CAREER_BENCHMARKS:
        return CAREER_BENCHMARKS[norm_pos]

    # Partial matching check for standard roles
    for key, profile in CAREER_BENCHMARKS.items():
        if key in norm_pos or norm_pos in key:
            return profile

    return fetch_dynamic_profile_from_ai(target_position)

def evaluate_semantic_alignment(
    parsed_sections: Dict[str, str],
    target_position: str
) -> Dict[str, Any]:
    """
    SBERT Semantic Measurement Layer.
    Encodes candidate evidence chunks and compares them against target-career-specific benchmark references
    using cosine similarity to produce semantic evidence retrieval maps.
    """
    start_time = time.time()
    model = get_sbert_model()

    # 1. Fetch data-driven target profile
    profile = get_target_benchmark_profile(target_position)
    req_skills = profile.get("required_skills", [])
    rec_skills = profile.get("recommended_skills", [])
    all_skill_concepts = req_skills + rec_skills
    edu_benchmarks = profile.get("education_benchmarks", [])
    cert_benchmarks = profile.get("certification_benchmarks", [])

    # 2. Extract Traceable Evidence Chunks
    evidence_chunks = chunk_resume_evidence(parsed_sections)

    if not evidence_chunks:
        return {
            "evidence": [],
            "requiredSkills": req_skills,
            "recommendedSkills": rec_skills,
            "educationScore": 0,
            "certificationsScore": 0,
            "chunks": []
        }

    # 3. Encode all Evidence Chunks
    chunk_embs = []
    for chunk in evidence_chunks:
        try:
            chunk_embs.append(_cached_encode(chunk.text))
        except Exception:
            chunk_embs.append(model.encode(chunk.text))

    # 4. Semantic Similarity Search for Skill Concepts
    evidence_results = []

    for concept in all_skill_concepts:
        c_emb = _cached_encode(concept)
        best_sim = 0.0
        best_chunk = None
        best_has_verbatim = False

        c_lower = concept.lower()
        concept_terms = [t.strip() for t in c_lower.replace("/", " ").replace("-", " ").split() if len(t.strip()) >= 3]

        for idx, chunk in enumerate(evidence_chunks):
            raw_sim = calculate_cosine_similarity(c_emb, chunk_embs[idx])
            chunk_lower = chunk.text.lower()

            has_verbatim = c_lower in chunk_lower
            if not has_verbatim and concept_terms:
                has_verbatim = any(term in chunk_lower for term in concept_terms)

            sim = min(1.0, raw_sim + 0.25) if has_verbatim else raw_sim

            if sim > best_sim:
                best_sim = sim
                best_chunk = chunk
                best_has_verbatim = has_verbatim

        if best_chunk and best_has_verbatim:
            if best_sim >= 0.45:
                status = "STRONG_MATCH"
            elif best_sim >= 0.25:
                status = "PARTIAL_MATCH"
            else:
                status = "NO_RELEVANT_EVIDENCE"

            evidence_results.append({
                "concept": concept,
                "status": status,
                "best_sim": round(best_sim, 3),
                "matchedSection": best_chunk.section,
                "matchedChunk": best_chunk.text,
                "chunkId": best_chunk.chunkId
            })
        else:
            # Evidence Verification Gate: Pure semantic proximity without verbatim or alias evidence is rejected
            evidence_results.append({
                "concept": concept,
                "status": "NO_RELEVANT_EVIDENCE",
                "best_sim": 0.0,
                "matchedSection": None,
                "matchedChunk": None,
                "chunkId": None
            })

    # 5. Semantic Measurement for Education Criterion (Academic Discipline Benchmark)
    edu_chunks = [c for c in evidence_chunks if c.section in ("Education", "RelevantCoursework")]
    edu_similarity_score = 0.0
    if edu_chunks and edu_benchmarks:
        max_edu_sim = 0.0
        for edu_c in edu_chunks:
            c_emb = _cached_encode(edu_c.text)
            for bm in edu_benchmarks:
                bm_emb = _cached_encode(bm)
                sim = calculate_cosine_similarity(c_emb, bm_emb)
                if any(kw in edu_c.text.lower() for kw in ["bachelor", "degree", "bs", "ba", "master", "gpa"]):
                    sim = min(1.0, sim + 0.20)
                if sim > max_edu_sim:
                    max_edu_sim = sim
        edu_similarity_score = round(max_edu_sim * 100)

    elapsed = time.time() - start_time
    print(f"SBERT Semantic Alignment for '{target_position}' completed in {elapsed:.2f}s across {len(evidence_chunks)} chunks.")

    return {
        "evidence": evidence_results,
        "requiredSkills": req_skills,
        "recommendedSkills": rec_skills,
        "educationBenchmarks": edu_benchmarks,
        "certificationBenchmarks": cert_benchmarks,
        "eduSimilarityScore": edu_similarity_score,
        "chunks": [c.dict() for c in evidence_chunks]
    }
