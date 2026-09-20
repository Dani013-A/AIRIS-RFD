import numpy as np
import time
import re
from sentence_transformers import SentenceTransformer
from typing import Dict, List, Any, Optional
import os
import json
from functools import lru_cache
from ai_service import generate_text_with_fallback, is_skill_grounded_in_text
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

# --- AUTHORITATIVE DATA-DRIVEN BENCHMARK CATALOG (Domain-Neutral) ---
from role_profile_registry import (
    resolve_role_profile,
    RoleProfile,
    RoleProfileUnresolvedError,
    AUTHORITATIVE_STATIC_PROFILES,
    canonicalize_role_title
)

# Export for backward compatibility with normalizer.py and entity lookups
CAREER_BENCHMARKS: Dict[str, Dict[str, List[str]]] = {
    role.lower(): {
        "required_skills": list(data["required_skills"]),
        "recommended_skills": list(data["recommended_skills"]),
        "education_benchmarks": list(data["education_benchmarks"]),
        "certification_benchmarks": list(data["certification_benchmarks"]),
    }
    for role, data in AUTHORITATIVE_STATIC_PROFILES.items()
}

CAREER_CONCEPTS: Dict[str, List[str]] = {
    role: data.get("required_skills", []) + data.get("recommended_skills", [])
    for role, data in CAREER_BENCHMARKS.items()
}

def get_target_benchmark_profile(target_position: str) -> Dict[str, Any]:
    """
    Authoritative resolution wrapper for target role profiles.
    Returns dictionary with required_skills, recommended_skills, education_benchmarks, certification_benchmarks.
    """
    profile = resolve_role_profile(target_position)
    return profile.to_dict()

def evaluate_semantic_alignment(
    parsed_sections: Dict[str, str],
    target_position: str
) -> Dict[str, Any]:
    """
    SBERT Semantic Measurement Layer.
    Encodes candidate evidence chunks and compares them against immutable target-career benchmark references
    using cosine similarity to produce semantic evidence retrieval maps.
    """
    start_time = time.time()
    model = get_sbert_model()

    # 1. Resolve authoritative immutable role profile (Tier 1-4)
    profile = resolve_role_profile(target_position)
    req_skills = list(profile.required_skills)
    rec_skills = list(profile.recommended_skills)
    all_skill_concepts = req_skills + rec_skills
    edu_benchmarks = list(profile.education_benchmarks)
    cert_benchmarks = list(profile.certification_benchmarks)

    # 2. Extract Traceable Evidence Chunks
    evidence_chunks = chunk_resume_evidence(parsed_sections)

    if not evidence_chunks:
        return {
            "evidence": [],
            "requiredSkills": req_skills,
            "recommendedSkills": rec_skills,
            "educationBenchmarks": edu_benchmarks,
            "certificationBenchmarks": cert_benchmarks,
            "educationScore": 0,
            "certificationsScore": 0,
            "eduSimilarityScore": 0,
            "chunks": [],
            "roleProfileMetadata": {
                "roleProfileId": profile.profile_id,
                "roleProfileVersion": profile.version,
                "canonicalRole": profile.canonical_role,
                "domain": profile.domain,
                "profileSource": profile.profile_source,
                "isDegraded": profile.is_degraded,
                "lastUpdated": profile.last_updated
            }
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
        STOP_WORDS = {
            "and", "or", "with", "using", "for", "the", "in", "of", "to", "a", "an",
            "design", "development", "implementation", "framework", "pipelines",
            "orchestration", "containerization", "databases", "front", "end", "backend",
            "management", "tools", "systems", "guide", "fundamentals", "overview", "level"
        }
        ROLE_GENERIC_TERMS = {
            "administration", "specialist", "engineer", "management", "developer",
            "operations", "fundamentals", "practices", "principles", "scripting",
            "programming", "analysis"
        }
        # Disallow single generic/subsidiary tokens (e.g. "github") from matching compound requirements (e.g. "CI/CD Pipelines using Jenkins, GitHub Actions...")
        raw_tokens = [t.strip() for t in re.split(r'[,;•|\(\)\[\]]+|\s+or\s+|\s+and\s+|\s+using\s+|\s+with\s+', c_lower) if len(t.strip()) >= 2]
        concept_candidates = [t for t in raw_tokens if t not in STOP_WORDS]
        if not concept_candidates:
            concept_candidates = [c_lower]

        # Extract constituent technical terms for transferable competency grounding
        constituent_tokens = [w for w in re.findall(r'[a-zA-Z0-9\+\#\.]+', c_lower) if len(w) >= 3 and w not in STOP_WORDS and w not in ROLE_GENERIC_TERMS]

        for idx, chunk in enumerate(evidence_chunks):
            raw_sim = calculate_cosine_similarity(c_emb, chunk_embs[idx])
            chunk_text = chunk.text

            # 1. Direct concept or authoritative alias match in chunk
            has_direct = is_skill_grounded_in_text(concept, chunk_text)
            if not has_direct and concept_candidates:
                has_direct = any(is_skill_grounded_in_text(cand, chunk_text) for cand in concept_candidates)

            # 2. Transferable constituent technical competency match
            has_transferable = False
            if not has_direct and constituent_tokens:
                has_transferable = any(is_skill_grounded_in_text(tok, chunk_text) for tok in constituent_tokens)

            if has_direct:
                sim = min(1.0, raw_sim + 0.25)
                # Prioritize demonstrated, contextual project/work evidence over raw comma-separated skill lists
                if chunk.section in ("Projects", "WorkExperience", "Internships"):
                    sim = min(1.0, sim + 0.12)
                grounding_type = "DIRECT"
            elif has_transferable:
                sim = min(1.0, raw_sim + 0.15)
                if chunk.section in ("Projects", "WorkExperience", "Internships"):
                    sim = min(1.0, sim + 0.08)
                grounding_type = "TRANSFERABLE"
            else:
                sim = raw_sim
                grounding_type = "NONE"

            if sim > best_sim:
                best_sim = sim
                best_chunk = chunk
                best_grounding_type = grounding_type

        if best_chunk and best_grounding_type in ("DIRECT", "TRANSFERABLE"):
            if best_grounding_type == "DIRECT" and best_sim >= 0.35:
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
        "chunks": [c.dict() for c in evidence_chunks],
        "roleProfileMetadata": {
            "roleProfileId": profile.profile_id,
            "roleProfileVersion": profile.version,
            "canonicalRole": profile.canonical_role,
            "domain": profile.domain,
            "profileSource": profile.profile_source,
            "isDegraded": profile.is_degraded,
            "lastUpdated": profile.last_updated
        }
    }
