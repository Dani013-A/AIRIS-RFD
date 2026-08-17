import numpy as np
import time
from sentence_transformers import SentenceTransformer
from typing import Dict, List, Any
import os
import json
from ai_service import generate_text_with_fallback
from semantic_chunker import chunk_resume_sections

_model = None

def get_sbert_model() -> SentenceTransformer:
    global _model
    if _model is None:
        try:
            _model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        except Exception:
            _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

# Pre-defined granular concepts for common roles to save API calls
CAREER_CONCEPTS: Dict[str, List[str]] = {
    "data analyst": ["SQL databases", "Python programming", "Data cleaning", "Data visualization", "Tableau or Power BI", "Excel", "Statistical analysis", "Reporting"],
    "software engineer": ["JavaScript or TypeScript", "React or Angular", "Node.js or Backend", "API development", "Git version control", "Testing and debugging", "Data structures", "Databases"],
    "civil engineer": ["AutoCAD", "Structural analysis", "Project management", "Concrete design", "Surveying", "Construction site safety", "Estimation"],
}

def calculate_cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    dot_product = np.dot(vec1, vec2)
    norm_a = np.linalg.norm(vec1)
    norm_b = np.linalg.norm(vec2)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot_product / (norm_a * norm_b))

def fetch_dynamic_profile_from_ai(target_position: str) -> List[str]:
    """Uses LLM to retrieve granular concepts for any custom role."""
    prompt = f"""
    You are an expert technical recruiter. Provide exactly 10 distinct, key technical skills, tools, and core competencies expected for a professional working as a '{target_position}'.
    
    Return ONLY a JSON array of strings. Do not include markdown formatting or explanation.
    Example: ["Skill 1", "Tool 2", "Competency 3"]
    """
    
    try:
        response_text = generate_text_with_fallback(prompt)
        # Strip markdown if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            if lines[0].startswith("```json") or lines[0].startswith("```"):
                response_text = "\n".join(lines[1:-1]).strip()
        parsed = json.loads(response_text)
        if isinstance(parsed, list) and len(parsed) > 0:
            return [str(p) for p in parsed]
    except Exception as e:
        print("Failed to fetch dynamic career profile from AI:", e)

    return ["technical skills", "professional experience", "problem solving", "communication"]

from functools import lru_cache

@lru_cache(maxsize=1024)
def _cached_encode(text: str) -> np.ndarray:
    return get_sbert_model().encode(text)

def evaluate_semantic_alignment(
    parsed_sections: Dict[str, str],
    target_position: str
) -> Dict[str, Any]:
    start_time = time.time()
    model = get_sbert_model()
    norm_position = target_position.strip().lower()

    # 1. Get Target Concepts
    concepts = CAREER_CONCEPTS.get(norm_position)
    if not concepts:
        print(f"Custom role '{target_position}' not in hardcoded dictionary. Fetching dynamic profile...")
        concepts = fetch_dynamic_profile_from_ai(target_position)
        
    # 2. Chunk Resume
    resume_chunks = chunk_resume_sections(parsed_sections)
    
    # 3. Handle Empty Resumes
    if not resume_chunks:
        print("LOG: Resume appears completely empty or unchunkable.")
        return {
            "skillsMatchScore": 0,
            "experienceScore": 0,
            "educationScore": 0,
            "certificationsScore": 0,
            "overallMatchScore": 0,
            "evidence": [],
            "standardProfileUsed": ", ".join(concepts)
        }

    # 4. Generate Embeddings for Concepts
    concept_embs = []
    for c in concepts:
        try:
            concept_embs.append(_cached_encode(c))
        except:
            concept_embs.append(model.encode(c))
            
    # 5. Group Chunks by Category and Embed
    skills_sections = ["Skills"]
    experience_sections = ["WorkExperience", "Internships", "Projects", "OrganizationsAndLeadership"]
    education_sections = ["Education", "RelevantCoursework"]
    certifications_sections = ["Certifications", "Trainings", "Achievements"]

    def is_in_category(section_name: str, category_list: List[str]) -> bool:
        # Also match custom section names if they contain the category name
        for cat in category_list:
            if cat.lower() in section_name.lower():
                return True
        return False

    cat_chunks = {
        "skills": [],
        "experience": [],
        "education": [],
        "certifications": []
    }
    
    # Populate cat_chunks
    for chunk in resume_chunks:
        sec = chunk["section"]
        if is_in_category(sec, skills_sections):
            cat_chunks["skills"].append(chunk)
        elif is_in_category(sec, experience_sections):
            cat_chunks["experience"].append(chunk)
        elif is_in_category(sec, education_sections):
            cat_chunks["education"].append(chunk)
        elif is_in_category(sec, certifications_sections):
            cat_chunks["certifications"].append(chunk)
        else:
            # Fallback for unrecognized sections, put them in experience
            cat_chunks["experience"].append(chunk)

    # Pre-calculate embeddings for chunks
    cat_embs = {k: [] for k in cat_chunks.keys()}
    for cat, chunks in cat_chunks.items():
        for chunk in chunks:
            try:
                emb = _cached_encode(chunk["text"])
            except:
                emb = model.encode(chunk["text"])
            cat_embs[cat].append(emb)

    # 6. Find global best chunk for each concept to validate
    # Flat list of all chunks
    all_chunks = []
    all_embs = []
    for cat in cat_chunks:
        all_chunks.extend(cat_chunks[cat])
        all_embs.extend(cat_embs[cat])
        
    global_evidence = []
    for i, concept in enumerate(concepts):
        c_emb = concept_embs[i]
        best_sim = 0.0
        best_chunk = None
        
        for j, chunk in enumerate(all_chunks):
            sim = calculate_cosine_similarity(c_emb, all_embs[j])
            if concept.lower() in chunk["text"].lower():
                sim = min(1.0, sim + 0.2)
            if sim > best_sim:
                best_sim = sim
                best_chunk = chunk
                
        global_evidence.append({
            "concept": concept,
            "best_sim": best_sim,
            "best_chunk": best_chunk
        })

    # 7. Batch Validate Evidence using LLM
    from ai_service import validate_evidence_batch
    batch_to_validate = []
    for ev in global_evidence:
        if ev["best_sim"] >= 0.15 and ev["best_chunk"]:
            batch_to_validate.append({
                "concept": ev["concept"],
                "evidence": ev["best_chunk"]["text"]
            })
            
    validation_results = {}
    if batch_to_validate:
        try:
            print(f"LOG: Validating {len(batch_to_validate)} pieces of evidence via LLM...")
            llm_results = validate_evidence_batch(batch_to_validate)
            for res in llm_results:
                concept = res.get("concept")
                classification = res.get("classification")
                if concept and classification:
                    validation_results[concept] = classification
        except Exception as e:
            print(f"LOG: Validation failed, falling back to thresholds. Error: {e}")

    # Resolve final status for each concept (LLM -> Threshold fallback -> Missing)
    concept_status = {}
    for ev in global_evidence:
        c = ev["concept"]
        sim = ev["best_sim"]
        
        # 1. Check LLM Result
        if c in validation_results:
            concept_status[c] = validation_results[c]
        # 2. Threshold Fallback
        else:
            if sim >= 0.40:
                concept_status[c] = "STRONG_MATCH"
            elif sim >= 0.25:
                concept_status[c] = "PARTIAL_MATCH"
            else:
                concept_status[c] = "NO_RELEVANT_EVIDENCE"

    # 8. Calculate Validated Component Scores
    def calculate_validated_category_score(cat_name: str) -> float:
        c_chunks = cat_chunks[cat_name]
        c_embs = cat_embs[cat_name]
        if not c_chunks:
            return 0.0
            
        total_sim = 0.0
        for i, concept in enumerate(concepts):
            status = concept_status.get(concept, "NO_RELEVANT_EVIDENCE")
            if status == "NO_RELEVANT_EVIDENCE":
                # Zero out similarity if LLM determined it's a hallucinated/false match
                continue
                
            c_emb = concept_embs[i]
            best_sim = 0.0
            for j, chunk in enumerate(c_chunks):
                sim = calculate_cosine_similarity(c_emb, c_embs[j])
                if concept.lower() in chunk["text"].lower():
                    sim = min(1.0, sim + 0.2)
                if sim > best_sim:
                    best_sim = sim
            total_sim += best_sim
            
        return total_sim / len(concepts) if concepts else 0.0

    skills_sim = calculate_validated_category_score("skills")
    experience_sim = calculate_validated_category_score("experience")
    education_sim = calculate_validated_category_score("education")
    cert_sim = calculate_validated_category_score("certifications")

    skills_score = int(skills_sim * 100)
    experience_score = int(experience_sim * 100)
    education_score = int(education_sim * 100)
    cert_score = int(cert_sim * 100)

    # 9. Format Final Evidence Output for Frontend
    evidence = []
    for ev in global_evidence:
        c = ev["concept"]
        best_chunk = ev["best_chunk"]
        
        evidence.append({
            "concept": c,
            "status": concept_status.get(c, "NO_RELEVANT_EVIDENCE"),
            "bestSimilarity": ev["best_sim"],
            "matchedChunk": best_chunk["text"] if best_chunk else None,
            "matchedSection": best_chunk["section"] if best_chunk else None
        })

    # Weighted overall for backwards compatibility if needed, but ai_validator will recalculate
    overall_match = int((skills_score * 0.4) + (experience_score * 0.3) + (education_score * 0.2) + (cert_score * 0.1))

    elapsed = time.time() - start_time
    print(f"LOG: SBERT Semantic Analysis (with LLM Validation) completed in {elapsed:.2f} seconds!")
    print(f"Scores -> Skills: {skills_score}, Exp: {experience_score}, Edu: {education_score}, Cert: {cert_score}")

    return {
        "skillsMatchScore": skills_score,
        "experienceScore": experience_score,
        "educationScore": education_score,
        "certificationsScore": cert_score,
        "overallMatchScore": overall_match,
        "evidence": evidence,
        "standardProfileUsed": ", ".join(concepts)
    }

