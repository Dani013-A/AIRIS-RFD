import json
import uuid
from typing import Dict, Any, List
from ai_service import generate_text_with_fallback, evaluate_intrinsic_resume_strength

def is_resume_valid(parsed_sections: Dict[str, str], raw_text: str = "") -> bool:
    """
    Multidisciplinary, composite-signal validator to determine if a document is a resume.
    Evaluates structural section diversity, text density bounds, contact information,
    and universal cross-discipline career terminology without discipline bias.
    """
    if not parsed_sections:
        return False

    import re
    from resume_parser import SECTION_ALIASES

    CAREER_SECTIONS = {
        "Education", "WorkExperience", "Skills", "Projects", "Certifications",
        "Internships", "OrganizationsAndLeadership", "Achievements", "Languages",
        "Trainings", "RelevantCoursework", "ProfessionalSummary"
    }

    combined_text = raw_text or " ".join([f"{k} {v}" for k, v in parsed_sections.items()])
    combined_clean = combined_text.strip()

    # Normalize spaced text (e.g. "E D U C A T I O N" -> "EDUCATION")
    normalized_search = re.sub(r'(?<=\b[a-zA-Z])\s+(?=[a-zA-Z]\b)', '', combined_clean).lower()

    words = combined_clean.split()
    word_count = len(words)

    # 1. Reject extremely short text (< 12 words)
    if word_count < 12:
        return False

    # 2. Reject obvious non-resume document markers (Cover letters, Memos, Syllabi, Job Openings)
    top_5_lines = "\n".join(combined_clean.splitlines()[:5]).lower()
    bottom_5_lines = "\n".join(combined_clean.splitlines()[-5:]).lower()

    is_cover_letter = ("dear hiring" in top_5_lines or "dear recruiter" in top_5_lines or "re: application for" in top_5_lines or "i am writing to express my" in top_5_lines or "sincerely," in bottom_5_lines)
    is_job_opening = ("job opening:" in top_5_lines or "job summary:" in top_5_lines or "we are seeking an experienced" in top_5_lines or "salary range:" in top_5_lines or "key responsibilities:" in combined_clean.lower())
    is_memo_or_announcement = ("announcement regarding" in top_5_lines or "policy update" in top_5_lines or "meeting minutes" in top_5_lines or "syllabus:" in top_5_lines or "course syllabus" in top_5_lines or "project summary:" in top_5_lines or "project description:" in top_5_lines or "lab activity" in top_5_lines or "laboratory activity" in top_5_lines or "activity no." in top_5_lines)

    recognized_career_sections = [
        k for k in parsed_sections.keys()
        if k in CAREER_SECTIONS or (k not in ("Content", "ContactInformation"))
    ]
    career_section_count = len(recognized_career_sections)

    if is_cover_letter or is_job_opening or is_memo_or_announcement:
        return False

    # 3. Contact Information Signals
    email_pattern = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", re.IGNORECASE)
    phone_pattern = re.compile(r"(?:\+?\d{1,3})?[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}")
    linkedin_pattern = re.compile(r"linkedin\.com", re.IGNORECASE)
    github_pattern = re.compile(r"github\.com", re.IGNORECASE)

    has_contact = (
        bool(email_pattern.search(combined_clean))
        or bool(phone_pattern.search(combined_clean))
        or bool(linkedin_pattern.search(combined_clean))
        or bool(github_pattern.search(combined_clean))
    )

    # 4. Universal Multidisciplinary Resume Vocabulary
    universal_resume_terms = [
        "education", "experience", "skills", "projects", "work", "university",
        "college", "degree", "bachelor", "master", "gpa", "intern", "internship",
        "certification", "certificate", "curriculum vitae", "resume", "objective",
        "summary", "responsibilities", "achievement", "award", "leadership", "background",
        "bs", "ba", "ms", "mba", "phd"
    ]
    search_text = (combined_clean + " " + normalized_search).lower()
    matched_terms = sum(1 for term in universal_resume_terms if re.search(r'\b' + re.escape(term) + r'\b', search_text))

    # 5. Composite Multidisciplinary Validation Rules:
    # Path A: Strong structural evidence (>= 2 career sections)
    if career_section_count >= 2:
        return True

    # Path B: 1 career section + (contact info OR >= 2 universal terms)
    if career_section_count >= 1 and (has_contact or matched_terms >= 2):
        return True

    # Path C: Contact Info + Strong Universal Resume Vocabulary (>= 3 terms) for messy formatting
    if has_contact and matched_terms >= 3:
        return True

    # Path D: Explicit Resume/CV header in top lines + (contact info OR >= 1 career section)
    if ("resume" in top_5_lines or "curriculum vitae" in top_5_lines or "cv" in top_5_lines) and (has_contact or career_section_count >= 1):
        return True

    return False

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
