import os
import re
from typing import Dict, List, Any
from evidence_chunker import chunk_resume_evidence, EvidenceChunk
from output_validator import validate_ai_response, AuditedFinding
from deterministic_scorer import calculate_official_ats_score
from sbert_matcher import evaluate_semantic_alignment

from ai_service import generate_text_with_fallback, _extract_json

def is_resume_valid_structural(parsed_sections: Dict[str, str], raw_text: str) -> bool:
    """
    Offline structural fallback validator.
    Used ONLY as a fallback if AI API keys are unavailable.
    """
    if not raw_text or len(raw_text.strip()) < 50:
        return False

    raw_lower = raw_text.lower()
    top_5_lines = " ".join([line.strip().lower() for line in raw_text.splitlines()[:5] if line.strip()])

    # Reject upfront non-resume document headers
    is_cover_letter = ("dear hiring manager" in raw_lower or "dear recruiter" in raw_lower or "application for the position of" in top_5_lines)
    is_job_opening = ("job title:" in raw_lower or "salary range:" in raw_lower or "job responsibilities:" in raw_lower or "how to apply:" in raw_lower)
    is_memo_or_announcement = ("subject:" in top_5_lines and "date:" in top_5_lines)

    if is_cover_letter or is_job_opening or is_memo_or_announcement:
        return False

    # Standard multidisciplinary career sections
    career_sections = [
        "Education", "WorkExperience", "Skills", "Projects", "Certifications",
        "Internships", "OrganizationsLeadership", "Achievements", "Languages",
        "Trainings", "RelevantCoursework", "ProfessionalSummary"
    ]
    career_section_count = sum(1 for sec in career_sections if len(parsed_sections.get(sec, "").strip()) > 5)

    # Contact info signals
    has_email = "@" in raw_lower and ("." in raw_lower or "com" in raw_lower)
    has_phone = bool(re.search(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b', raw_text))
    has_contact = (has_email or has_phone or len(parsed_sections.get("ContactInformation", "").strip()) > 5)

    # Universal multidisciplinary terms
    universal_terms = [
        "curriculum vitae", "resume", "cv", "bachelor", "degree", "university",
        "college", "graduated", "gpa", "internship", "project", "developed",
        "analyzed", "designed", "managed", "assisted", "prepared", "verified",
        "certified", "skills", "experience", "activities", "leadership"
    ]
    matched_terms = sum(1 for term in universal_terms if term in raw_lower)

    if career_section_count >= 2:
        return True
    if career_section_count >= 1 and (has_contact or matched_terms >= 2):
        return True
    if has_contact and matched_terms >= 3:
        return True
    if ("resume" in top_5_lines or "curriculum vitae" in top_5_lines or "cv" in top_5_lines) and (has_contact or career_section_count >= 1):
        return True

    return False

def validate_resume_validity_with_llm(raw_text: str, parsed_sections: Dict[str, str] = None) -> Dict[str, Any]:
    """
    Universal LLM Resume / CV Validity Gate.
    Determines if an uploaded document represents an individual's genuine resume/CV or candidate profile,
    or a non-resume document (e.g. quotation, invoice, contract, essay, business proposal, technical manual, assignment).

    Domain-neutral, career-neutral, college-neutral, industry-neutral.
    Does NOT use hardcoded document-type keyword lists.
    """
    default_reject_msg = "This document doesn't appear to be a resume or CV. Please upload a document containing your academic, professional, or career information."

    if not raw_text or len(raw_text.strip()) < 30:
        return {
            "is_resume": False,
            "confidence": 1.0,
            "document_type": "non_resume",
            "reason": default_reject_msg
        }

    sample_text = raw_text[:3500].strip()

    prompt = f"""
You are an expert ATS document classifier and occupational domain specialist.
Analyze the following document text and determine whether it represents an individual person's resume, CV, academic background, or professional career profile.

DOCUMENT TEXT SAMPLE:
\"\"\"
{sample_text}
\"\"\"

CRITICAL CLASSIFICATION INSTRUCTIONS:

1. FUNDAMENTAL QUESTION:
Does this document represent an individual PERSON'S resume/CV or professional/academic career profile?

2. VALID RESUME CHARACTERISTICS:
A valid resume/CV describes an individual candidate's personal background, including any combination of:
- Personal name, contact details (email, phone, location, online profile)
- Education, academic program, degree, coursework, school/university background
- Work experience, employment history, internships, or On-the-Job Training (OJT)
- Projects, technical/academic capstones, or practical deliverables
- Skills (technical skills, soft skills, domain expertise)
- Certifications, licenses, trainings, workshops, or seminars
- Organizations, student leadership, volunteer work, awards, or achievements
Note: Fresh-graduate or student resumes may contain primarily education, projects, skills, and activities with little or no formal work history. Experienced professional resumes may contain extensive work history with minimal coursework. ALL of these are VALID resumes.

3. REJECTED NON-RESUME DOCUMENTS:
Reject ANY document whose primary purpose is NOT an individual candidate's resume/CV.
Examples of non-resume documents include:
- Commercial, financial, or business paperwork (quotations, cost estimates, invoices, receipts, purchase orders, financial statements)
- Legal, contractual, or organizational documents (contracts, terms of service, meeting minutes, company policies, brochures)
- Business or project proposals (documents describing project scopes, vendor proposals, or company capabilities)
- Academic assignments, essays, research papers, exams, lecture notes, textbooks, or course syllabi
- Technical documentation, user manuals, system specifications, or product documentation
- Random text, articles, news, fiction, stories, or correspondence
Note: A non-resume document (such as a business proposal or quotation) might contain words like "project", "experience", "skills", or "requirements". You MUST NOT mistake commercial or organizational documents for a candidate's resume. Evaluate the document's overall semantic purpose.

4. REQUIRED OUTPUT FORMAT:
Return STRICT JSON ONLY with the exact following structure:
{{
  "is_resume": true or false,
  "confidence": 0.0 to 1.0,
  "document_type": "resume" or "non_resume",
  "reason": "Clear explanation of why this document is or is not an individual's resume/CV."
}}

Do NOT include markdown fences, extra text, or preamble outside the JSON.
"""

    try:
        raw_response = generate_text_with_fallback(prompt)
        parsed = _extract_json(raw_response)

        if isinstance(parsed, dict) and "is_resume" in parsed:
            is_resume = bool(parsed.get("is_resume"))
            confidence = float(parsed.get("confidence", 0.95))
            reason = str(parsed.get("reason", "")).strip()

            if not is_resume or confidence < 0.70:
                return {
                    "is_resume": False,
                    "confidence": confidence,
                    "document_type": "non_resume",
                    "reason": reason or default_reject_msg
                }

            return {
                "is_resume": True,
                "confidence": confidence,
                "document_type": "resume",
                "reason": reason or "The document represents an individual's academic and professional profile."
            }
    except Exception as err:
        print(f"[LLM Validity Gate Exception]: {err}")

    # Fallback if LLM fails: Check structural signals; fail safely if uncertain
    structural_valid = is_resume_valid_structural(parsed_sections or {}, raw_text)
    if not structural_valid:
        return {
            "is_resume": False,
            "confidence": 0.90,
            "document_type": "non_resume",
            "reason": default_reject_msg
        }

    return {
        "is_resume": True,
        "confidence": 0.80,
        "document_type": "resume",
        "reason": "Document contains structure consistent with a candidate profile."
    }

def is_resume_valid(parsed_sections: Dict[str, str], raw_text: str) -> bool:
    """
    Public entry point for resume validity check.
    Delegates to the LLM Resume Validity Gate.
    """
    res = validate_resume_validity_with_llm(raw_text, parsed_sections)
    return res.get("is_resume", False)

CANONICAL_SECTIONS = [
    "ContactInformation", "ProfessionalSummary", "Education", "Skills",
    "WorkExperience", "Projects", "Internships", "RelevantCoursework",
    "Certifications", "OrganizationsLeadership", "Achievements",
    "Languages", "Trainings"
]

def validate_and_enhance_analysis(
    raw_text: str,
    parsed_sections: Dict[str, str],
    target_position: str,
    sbert_results: Dict[str, Any],
    local_analysis: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Pipeline Orchestration & Synthesis:
    Extracts traceable evidence chunks, discovers SBERT vector semantic similarities,
    runs qualitative evaluation, validates facts via output_validator, and computes
    the authoritative 40/30/20/10 ATS score via deterministic_scorer.
    """
    req_skills = sbert_results.get("requiredSkills", [])
    rec_skills = sbert_results.get("recommendedSkills", [])
    all_target_comps = req_skills + rec_skills
    evidence_list = sbert_results.get("evidence", [])
    edu_sim_score = sbert_results.get("eduSimilarityScore", 0.0)

    # 1. Chunk resume evidence
    evidence_chunks = chunk_resume_evidence(parsed_sections)

    # 2. Qualitatively evaluate findings via LLM batch validator
    raw_evaluations = []
    for ev in evidence_list:
        if ev.get("status") in ("STRONG_MATCH", "PARTIAL_MATCH") and ev.get("matchedChunk"):
            raw_evaluations.append({
                "chunkId": ev.get("chunkId", "chunk_general_001"),
                "competency": ev["concept"],
                "classification": ev["status"],
                "evidenceLevel": "STRONG_DEMONSTRATED" if ev["status"] == "STRONG_MATCH" else "DEMONSTRATED",
                "acmo": {"action": True, "context": True, "method": True, "outcome": (ev["status"] == "STRONG_MATCH")},
                "observedEvidence": ev["matchedChunk"],
                "reasoningSummary": f"Grounded evidence for {ev['concept']}"
            })

    # 3. Deterministically validate AI response
    audited_findings = validate_ai_response(raw_evaluations, evidence_chunks, all_target_comps)

    # 4. Calculate Authoritative ATS Score via Pure Python Math
    ats_score_payload = calculate_official_ats_score(
        audited_findings=audited_findings,
        evidence_chunks=evidence_chunks,
        target_position=target_position,
        required_competencies=req_skills,
        recommended_competencies=rec_skills,
        sbert_edu_sim_score=edu_sim_score,
        audit_status_metadata="VERIFIED"
    )

    # Populate adjustments for Role Relevance Diagnostic
    adjustments = []
    for ev in evidence_list:
        rule_id = f"match_{ev['concept'].lower().replace(' ', '_')}"
        if ev["status"] == "STRONG_MATCH":
            adjustments.append({
                "ruleId": rule_id,
                "category": "skillsMatch",
                "points": 10,
                "maximumPoints": 10,
                "passed": True,
                "reason": f"Strong demonstrated evidence for {ev['concept']} found in {ev.get('matchedSection', 'resume')}.",
                "matchedChunk": ev.get("matchedChunk")
            })
        elif ev["status"] == "PARTIAL_MATCH":
            adjustments.append({
                "ruleId": rule_id,
                "category": "skillsMatch",
                "points": 5,
                "maximumPoints": 10,
                "passed": False,
                "reason": f"Partial evidence for {ev['concept']}. Practical project demonstration recommended.",
                "matchedChunk": ev.get("matchedChunk")
            })
        else:
            adjustments.append({
                "ruleId": rule_id,
                "category": "skillsMatch",
                "points": 0,
                "maximumPoints": 10,
                "passed": False,
                "reason": f"No evidence found for {ev['concept']}.",
                "matchedChunk": None
            })

    ats_score_payload["roleRelevance"]["adjustments"] = adjustments

    # 5. Build Canonical Detected & Missing Sections Payloads
    detected_sections_list = []
    missing_sections_list = []

    for canon in CANONICAL_SECTIONS:
        content = parsed_sections.get(canon, "").strip()
        is_present = len(content) > 5
        detected_sections_list.append({"name": canon, "isPresent": is_present})

        if not is_present and canon in ("ContactInformation", "Education", "Skills", "WorkExperience"):
            missing_sections_list.append({
                "name": canon,
                "requirement": "required",
                "importance": "high",
                "reason": f"Missing core section: {canon.replace('([A-Z])', ' $1').strip()}"
            })

    # 6. Concise, Scannable Suggestions (Top 5 Max)
    suggestions = []
    missing_comps = [ev["concept"] for ev in evidence_list if ev["status"] == "NO_RELEVANT_EVIDENCE"]
    partial_comps = [ev["concept"] for ev in evidence_list if ev["status"] == "PARTIAL_MATCH"]

    sug_idx = 1
    for ev in evidence_list:
        comp = ev["concept"]
        status = ev["status"]

        if status == "NO_RELEVANT_EVIDENCE" and sug_idx <= 3:
            suggestions.append({
                "id": f"sug_{sug_idx}",
                "section": "Skills",
                "type": "skill_gap",
                "priority": "high",
                "title": f"Add {comp} Evidence",
                "why": f"Core requirement missing for target role: {target_position}.",
                "action": f"WHAT TO ADD:\nDescribe the project, coursework, or task where you actually implemented {comp}.",
                "example": f"Include specific details of your {comp} implementation in your Projects or Work Experience section.",
                "reason": f"Core requirement missing for {target_position}."
            })
            sug_idx += 1
        elif status == "PARTIAL_MATCH" and sug_idx <= 5:
            matched_quote = ev.get("matchedChunk")
            ex_text = f"Verbatim evidence from your resume: \"{matched_quote}\". Add measurable metrics or results achieved." if matched_quote else f"Specify your exact technical ownership and deliverables when applying {comp}."
            suggestions.append({
                "id": f"sug_{sug_idx}",
                "section": "Projects",
                "type": "improvement",
                "priority": "medium",
                "title": f"Strengthen {comp} Outcome",
                "why": f"Partial evidence found for {comp}.",
                "action": f"WHAT TO IMPROVE:\nDetail your specific role and outcomes when applying {comp}.",
                "example": ex_text,
                "reason": f"Partial evidence found for {comp}."
            })
            sug_idx += 1

    if not suggestions:
        suggestions.append({
            "id": "sug_1",
            "section": "General",
            "type": "improvement",
            "priority": "medium",
            "title": "Optimize Portfolio Demonstration",
            "why": "Resume has solid core alignment.",
            "action": "- Ensure capstone and lab deliverables are clearly highlighted.\n- Add public portfolio or repository link.",
            "example": "Included github repository link for project.",
            "reason": "Enhance competitive positioning."
        })

    from ai_service import generate_learning_snapshot
    learning_snapshot = generate_learning_snapshot(
        target_position=target_position,
        parsed_sections=parsed_sections,
        sbert_results=sbert_results
    )

    import datetime
    analyzed_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    return {
        "atsScore": ats_score_payload,
        "detectedSections": detected_sections_list,
        "missingSections": missing_sections_list,
        "suggestions": suggestions[:5],
        "recommendations": suggestions[:5],
        "learningSnapshot": learning_snapshot,
        "isAnalysisComplete": True,
        "analyzedAt": analyzed_at,
        "analysisVersion": "2.0.0-sbert-deterministic"
    }
