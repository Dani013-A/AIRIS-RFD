import json
import uuid
from typing import Dict, Any, List
from ai_service import generate_text_with_fallback, evaluate_intrinsic_resume_strength

def is_resume_valid(parsed_sections: Dict[str, str]) -> bool:
    """Enhanced heuristic to determine if a document appears to be a resume.
    Tolerant of various layout structures, sizes, and section naming conventions.
    """
    if not parsed_sections:
        return False

    combined_text = " ".join([f"{k} {v}" for k, v in parsed_sections.items()]).strip()
    if not combined_text or len(combined_text.split()) < 3:
        return True
    import re
    email_pattern = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", re.IGNORECASE)
    phone_pattern = re.compile(r"(?:\+?\d{1,3})?[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}")

    has_contact = bool(email_pattern.search(combined_text) or phone_pattern.search(combined_text))

    keywords = ["education", "experience", "skills", "projects", "work", "university", "college", "degree", "intern", "developer", "engineer"]
    matched_keywords = sum(1 for kw in keywords if kw in combined_text.lower())

    return has_contact or matched_keywords >= 2 or len(combined_text.split()) >= 100

def validate_and_enhance_analysis(
    raw_text: str,
    parsed_sections: Dict[str, str],
    target_position: str,
    sbert_results: Dict[str, Any],
    local_analysis: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Validates parsed resume sections and enrich the response with AI-generated suggestions
    based ONLY on the semantic evidence object from SBERT matching.
    The backend is now the absolute source of truth.
    """
    overall_match = sbert_results.get("overallMatchScore", 0)
    evidence = sbert_results.get("evidence", [])

    # 1. Fetch SBERT Normalized Component Scores (This is ROLE RELEVANCE)
    skills_raw = sbert_results.get("skillsMatchScore", 0)
    exp_raw = sbert_results.get("experienceScore", 0)
    edu_raw = sbert_results.get("educationScore", 0)
    cert_raw = sbert_results.get("certificationsScore", 0)

    # Calculate Role Relevance Weights based on official manuscript formula
    role_skills = skills_raw * 0.40
    role_exp = exp_raw * 0.30
    role_edu = edu_raw * 0.20
    role_cert = cert_raw * 0.10

    role_relevance_score = round(role_skills + role_exp + role_edu + role_cert)

    # 2. Evaluate Intrinsic Resume Strength (This is RESUME SCORE)
    intrinsic_eval = evaluate_intrinsic_resume_strength(raw_text)
    intrinsic_skills_raw = intrinsic_eval.get("skills", 50)
    intrinsic_edu_raw = intrinsic_eval.get("education", 50)
    intrinsic_cert_raw = intrinsic_eval.get("certifications", 0)

    intrinsic_skills = intrinsic_skills_raw * 0.50
    intrinsic_edu = intrinsic_edu_raw * 0.25
    intrinsic_cert = intrinsic_cert_raw * 0.25

    resume_score = round(intrinsic_skills + intrinsic_edu + intrinsic_cert)

    # 3. Final Blended OVERALL RESUME SCORE
    final_score = round((resume_score * 0.5) + (role_relevance_score * 0.5))

    # 4. Determine Overall Level
    if final_score >= 85: level = "ExcellentMatch"
    elif final_score >= 70: level = "StrongFoundation"
    elif final_score >= 50: level = "GettingThere"
    else: level = "NeedsImprovement"

    # Check what sections actually exist for the frontend response
    detected_names = []
    from resume_parser import SECTION_ALIASES
    for key, content in parsed_sections.items():
        if len(content.strip()) > 5:
            detected_names.append(key)
    detected_sections_list = [{"name": key, "isPresent": True} for key in detected_names]

    # Determine missing required sections
    required_sections = ["ContactInformation", "Education", "Skills", "WorkExperience"]
    missing_sections = []
    for req in required_sections:
        if req not in detected_names:
            missing_sections.append({
                "name": req,
                "requirement": "required",
                "importance": "high",
                "reason": f"Missing core section: {req}"
            })

    ats_score = {
        "overallScore": final_score,
        "level": level,
        "resumeScore": {
            "total": resume_score,
            "breakdown": {
                "skills": {
                    "rawScore": intrinsic_skills_raw,
                    "weight": 0.50,
                    "weightedScore": round(intrinsic_skills, 1)
                },
                "education": {
                    "rawScore": intrinsic_edu_raw,
                    "weight": 0.25,
                    "weightedScore": round(intrinsic_edu, 1)
                },
                "certifications": {
                    "rawScore": intrinsic_cert_raw,
                    "weight": 0.25,
                    "weightedScore": round(intrinsic_cert, 1)
                }
            }
        },
        "roleRelevance": {
            "total": role_relevance_score,
            "breakdown": {
                "skillsMatch": {
                    "rawScore": skills_raw,
                    "weight": 0.40,
                    "weightedScore": round(role_skills, 1)
                },
                "experienceMatch": {
                    "rawScore": exp_raw,
                    "weight": 0.30,
                    "weightedScore": round(role_exp, 1)
                },
                "educationMatch": {
                    "rawScore": edu_raw,
                    "weight": 0.20,
                    "weightedScore": round(role_edu, 1)
                },
                "certificationsMatch": {
                    "rawScore": cert_raw,
                    "weight": 0.10,
                    "weightedScore": round(role_cert, 1)
                }
            },
            "adjustments": []
        }
    }

    # Populate adjustments for Role Relevance Diagnostic
    for ev in evidence:
        if ev["status"] == "STRONG_MATCH":
            ats_score["roleRelevance"]["adjustments"].append({
                "ruleId": f"match_{ev['concept'].replace(' ', '_')}",
                "category": "skillsMatch",
                "points": 10,
                "maximumPoints": 10,
                "passed": True,
                "reason": f"Strong evidence for {ev['concept']} found in {ev['matchedSection']}.",
                "matchedChunk": ev.get("matchedChunk")
            })
        elif ev["status"] == "PARTIAL_MATCH":
            ats_score["roleRelevance"]["adjustments"].append({
                "ruleId": f"match_{ev['concept'].replace(' ', '_')}",
                "category": "skillsMatch",
                "points": 5,
                "maximumPoints": 10,
                "passed": False,
                "reason": f"Partial evidence for {ev['concept']}. Strengthen this area.",
                "matchedChunk": ev.get("matchedChunk")
            })
        else:
            ats_score["roleRelevance"]["adjustments"].append({
                "ruleId": f"match_{ev['concept'].replace(' ', '_')}",
                "category": "skillsMatch",
                "points": 0,
                "maximumPoints": 10,
                "passed": False,
                "reason": f"No evidence found for {ev['concept']}.",
                "matchedChunk": None
            })

    from ai_service import generate_learning_snapshot
    learning_snapshot = generate_learning_snapshot(
        target_position=target_position,
        parsed_sections=parsed_sections,
        sbert_results=sbert_results
    )

    default_response = {
        "atsScore": ats_score,
        "detectedSections": detected_sections_list,
        "missingSections": missing_sections,
        "learningSnapshot": learning_snapshot,
        "suggestions": [],
        "recommendations": []
    }

    missing_concepts = [e["concept"] for e in evidence if e["status"] == "NO_RELEVANT_EVIDENCE"]
    partial_concepts = [e for e in evidence if e["status"] == "PARTIAL_MATCH"]

    evidence_context = f"""
    TARGET ROLE: {target_position}
    MISSING CONCEPTS (0 evidence): {', '.join(missing_concepts) if missing_concepts else 'None'}
    PARTIAL CONCEPTS:
    """
    for p in partial_concepts:
        evidence_context += f"- {p['concept']} (Found in {p['matchedSection']}: '{p['matchedChunk']}')\n"

    # 2. Prompt Gemini for suggestions based STRICTLY on evidence
    prompt = f"""
    You are an expert recruiter evaluating a resume for the target role "{target_position}".
    You must base your suggestions STRICTLY on the following concrete evidence from our semantic engine.

    EVIDENCE METRICS:
    {evidence_context}

    Task:
    Provide 1 or 2 specific, semantic critiques.
    If there are PARTIAL CONCEPTS, quote the weak chunk and rewrite it to be stronger and more impactful for the target role.
    If there are MISSING CONCEPTS, recommend how they might incorporate them if they have that experience.

    Return a concise JSON payload with exactly this structure:
    {{
      "suggestions": [
        {{
           "priority": "high",
           "type": "content",
           "title": "Short title (e.g. Strengthen Impact)",
           "description": "What is wrong, why it matters. Quote the weak chunk if applicable.",
           "example": "Provide the rewritten, stronger chunk or actionable advice.",
           "reason": "AI Semantic Review"
        }}
      ]
    }}

    Return ONLY the JSON object, no markdown, no other text.
    """

    try:
        response_text = generate_text_with_fallback(prompt)
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            if lines[0].startswith("```json") or lines[0].startswith("```"):
                response_text = "\n".join(lines[1:-1]).strip()
        parsed_json = json.loads(response_text)

        ai_suggestions = parsed_json.get("suggestions", [])
        default_response["suggestions"].extend(ai_suggestions[:2])

        return default_response
    except Exception as e:
        print("AI validation enhancement failed, using baseline defaults:", e)
        return default_response
