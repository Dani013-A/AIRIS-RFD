import math
import re
from typing import Dict, List, Any, Optional
from output_validator import AuditedFinding
from evidence_chunker import EvidenceChunk

# =====================================================================
# EXPERIENCE & PROJECTS SCORING CONSTANTS (Declarative Hierarchy)
# =====================================================================
EXPERIENCE_PORTFOLIO_DENOMINATOR = 60.0

EXPERIENCE_SECTION_BASE_WEIGHTS = {
    "FORMAL_WORK": 25.0,              # Professional full-time employment
    "INTERNSHIP_OJT": 18.0,           # Internship, OJT, practicum, apprentice
    "MAJOR_CAPSTONE_PROJECT": 14.0,   # Capstone, thesis, major platform/system
    "HACKATHON_COMPETITION": 10.0,    # Hackathons, coding competitions, contest wins
    "STANDARD_PROJECT": 12.0,         # Standard academic/portfolio project
    "ORGANIZATION_LEADERSHIP": 8.0    # Student leadership, officer, extracurricular
}

CONTRIBUTION_ACTION_VERBS = {
    "develop", "developed", "developing", "build", "built", "building",
    "design", "designed", "designing", "implement", "implemented", "implementing",
    "engineer", "engineered", "engineering", "architect", "architected", "architecting",
    "create", "created", "creating", "program", "programmed", "programming",
    "integrate", "integrated", "integrating", "deploy", "deployed", "deploying",
    "configure", "configured", "configuring", "manage", "managed", "managing",
    "lead", "led", "leading", "optimize", "optimized", "optimizing",
    "analyze", "analyzed", "analyzing", "automate", "automated", "automating",
    "collaborate", "collaborated", "collaborating", "test", "tested", "testing",
    "maintain", "maintained", "maintaining", "refactor", "refactored", "refactoring",
    "prepare", "prepared", "preparing", "reconcile", "reconciled", "reconciling",
    "audit", "audited", "auditing", "calculate", "calculated", "calculating",
    "coordinate", "coordinated", "coordinating", "facilitate", "facilitated", "facilitating",
    "draft", "drafted", "drafting", "inspect", "inspected", "inspecting",
    "supervise", "supervised", "supervising", "execute", "executed", "executing",
    "evaluate", "evaluated", "evaluating", "conduct", "conducted", "conducting",
    "present", "presented", "presenting", "document", "documented", "documenting",
    "assist", "assisted", "assisting", "research", "researched", "researching",
    "monitor", "monitored", "monitoring", "produce", "produced", "producing",
    "review", "reviewed", "reviewing", "resolve", "resolved", "resolving",
    "direct", "directed", "directing", "install", "installed", "installing",
    "winner", "won", "champion"
}

PROJECT_DIMINISHING_SCHEDULE = [1.00, 0.70, 0.45, 0.25, 0.15]

def _categorize_experience_chunk(chunk: EvidenceChunk) -> str:
    sec = chunk.section
    text_lower = chunk.text.lower()

    if sec == "WorkExperience":
        if any(term in text_lower for term in ["intern", "internship", "ojt", "on-the-job training", "trainee", "practicum", "apprentice"]):
            return "INTERNSHIP_OJT"
        return "FORMAL_WORK"

    if sec == "Internships" or any(term in text_lower for term in ["internship", "ojt", "practicum"]):
        return "INTERNSHIP_OJT"

    if any(term in text_lower for term in ["hackathon", "competition", "contest", "challenge", "datathon", "codefest", "olympiad"]):
        return "HACKATHON_COMPETITION"

    if sec == "Projects":
        capstone_signals = [
            "capstone", "thesis", "final-year", "final year", "graduation project",
            "major academic project", "degree project", "lead developer of capstone"
        ]
        if any(term in text_lower for term in capstone_signals):
            return "MAJOR_CAPSTONE_PROJECT"
        return "STANDARD_PROJECT"

    if sec == "OrganizationsLeadership":
        return "ORGANIZATION_LEADERSHIP"

    if sec == "Achievements" and any(term in text_lower for term in ["hackathon", "competition", "contest", "winner", "champion", "runner-up", "datathon"]):
        return "HACKATHON_COMPETITION"

    return "STANDARD_PROJECT"


def _evaluate_ats_skills_parseability(
    evidence_chunks: List[EvidenceChunk],
    detected_skills: Optional[List[str]] = None,
    parsed_sections: Optional[Dict[str, Any]] = None
) -> int:
    """
    Evaluates machine-readable presentation and extraction of Skills information (0-100).
    Strictly measures ATS parseability, NOT candidate skill volume or taxonomy whitelist match.
    - Heading & Section Standard (25 pts)
    - Structure & Delimitation (25 pts)
    - Syntactic Token Integrity (25 pts)
    - Hygiene & Anti-Stuffing (25 pts)
    """
    skills_chunks = [c for c in evidence_chunks if c.section in ("Skills", "TechnicalSkills", "CoreCompetencies")]
    skills_text = ""
    if parsed_sections and isinstance(parsed_sections, dict):
        skills_text = str(parsed_sections.get("Skills", "") or parsed_sections.get("TechnicalSkills", "") or "").strip()
    if not skills_text and skills_chunks:
        skills_text = " ".join(c.text for c in skills_chunks).strip()

    if not skills_text and not detected_skills and not skills_chunks:
        return 0

    score = 0.0

    # 1. Section Presence & Heading Standard (25 pts)
    if skills_chunks or (parsed_sections and any(k.lower() in ("skills", "technicalskills", "technical skills", "core competencies") for k in parsed_sections)):
        score += 25.0
    elif detected_skills:
        score += 15.0

    # 2. Structure & Delimitation (25 pts)
    has_delimiters = bool(re.search(r'[,•\|\*\-\n/]', skills_text)) if skills_text else (len(detected_skills or []) > 1)
    word_count = len(skills_text.split()) if skills_text else len(detected_skills or []) * 2
    is_dense_narrative = (word_count > 40 and not has_delimiters)
    if has_delimiters and not is_dense_narrative:
        score += 25.0
    elif is_dense_narrative:
        score += 0.0
    else:
        score += 15.0

    # 3. Syntactic Token Integrity (25 pts)
    candidate_tokens = detected_skills if (detected_skills and len(detected_skills) > 0) else [s.strip() for s in re.split(r'[,•\|\*\-\n/]+', skills_text) if s.strip()]
    if candidate_tokens:
        clean_tokens = [
            t for t in candidate_tokens
            if 0 < len(t.split()) <= 5 and '\ufffd' not in t and not re.search(r'[\x00-\x1F\x7F]', t)
        ]
        ratio = len(clean_tokens) / max(1, len(candidate_tokens))
        if ratio >= 0.70 and len(clean_tokens) >= 2:
            score += 25.0
        elif len(clean_tokens) >= 1:
            score += 15.0
        else:
            score += 0.0
    else:
        score += 0.0

    # 4. Hygiene & Anti-Stuffing (25 pts)
    has_ocr_corruption = ('\ufffd' in skills_text) or bool(re.search(r'[^\x00-\x7F]{4,}', skills_text)) or bool(re.search(r'[\x00-\x1F\x7F]', skills_text))
    words = re.findall(r'\b\w+\b', skills_text.lower()) if skills_text else []
    unique_words = set(words)
    stuffing_detected = False
    if len(words) >= 15:
        repetition_ratio = len(words) / max(1, len(unique_words))
        if repetition_ratio > 2.5:
            stuffing_detected = True

    if has_ocr_corruption and stuffing_detected:
        score += 0.0
    elif has_ocr_corruption or stuffing_detected:
        score += 5.0
    else:
        score += 25.0

    # Specific penalties for severe machine extraction degradation
    if has_ocr_corruption:
        score = min(score, 45.0)
    if is_dense_narrative:
        score = min(score, 45.0)

    return min(100, max(0, round(score)))


def _evaluate_ats_experience_parseability(
    evidence_chunks: List[EvidenceChunk]
) -> int:
    """
    Evaluates generic parseability of Experience, Projects, Internships, and Achievements (0-100).
    Measures entry demarcation, dates, action verbs, and descriptive completeness.
    Measurable outcomes (percentages/metrics) are strictly optional for ATS points.
    """
    exp_chunks = []
    for c in evidence_chunks:
        if c.section in {"WorkExperience", "Internships", "Projects", "OrganizationsLeadership"}:
            exp_chunks.append(c)
        elif c.section == "Achievements":
            c_lower = c.text.lower()
            if any(term in c_lower for term in ["hackathon", "competition", "contest", "winner", "champion", "runner-up", "datathon"]):
                exp_chunks.append(c)

    if not exp_chunks:
        return 0

    score = 20.0  # Section Presence & Standard Heading

    seen_texts = set()
    total_chunks = 0
    has_dates = False
    has_action_verbs = 0
    clean_length_count = 0

    for chunk in exp_chunks:
        norm = chunk.text.strip().lower()
        if norm in seen_texts:
            continue
        seen_texts.add(norm)
        total_chunks += 1

        if re.search(r'\b(19|20)\d{2}\b|\bpresent\b|\bcurrent\b', norm):
            has_dates = True

        matched_actions = sum(1 for verb in CONTRIBUTION_ACTION_VERBS if re.search(r'\b' + re.escape(verb) + r'\b', norm))
        if matched_actions >= 1:
            has_action_verbs += 1

        if chunk.wordCount >= 6:
            clean_length_count += 1

    # Entry & Chronological Delimitation (25 pts)
    if total_chunks >= 2 and has_dates:
        score += 25.0
    elif total_chunks >= 1 and has_dates:
        score += 20.0
    elif total_chunks >= 1:
        score += 15.0

    # Action-Oriented Narrative Structure (30 pts)
    if has_action_verbs >= 2:
        score += 30.0
    elif has_action_verbs == 1:
        score += 20.0
    else:
        score += 10.0

    # Descriptive Depth & Structural Completeness (25 pts)
    # Strictly domain-agnostic: evaluates whether entries contain substantive, readable descriptions
    # without requiring IT vocabulary, technical jargon, or specific tool keywords.
    if clean_length_count >= 2:
        score += 25.0
    elif clean_length_count >= 1:
        score += 18.0
    else:
        score += 10.0

    # Truncated entries penalty: title-only without description (< 6 words per entry)
    avg_words = sum(c.wordCount for c in exp_chunks) / max(1, len(exp_chunks))
    if avg_words < 6 and not has_dates:
        score = min(score, 10.0)

    return min(100, max(0, round(score)))


def _evaluate_ats_education_parseability(
    evidence_chunks: List[EvidenceChunk],
    parsed_sections: Optional[Dict[str, Any]] = None
) -> int:
    """
    Evaluates machine extractability of Education information (0-100).
    Zero scoring of institutional prestige, rankings, accreditation, or target career relevance.
    """
    edu_sections = {"Education", "RelevantCoursework"}
    edu_chunks = [c for c in evidence_chunks if c.section in edu_sections]
    edu_text = ""
    if parsed_sections and isinstance(parsed_sections, dict):
        edu_text = str(parsed_sections.get("Education", "")).strip()
    if not edu_text and edu_chunks:
        edu_text = " ".join(c.text for c in edu_chunks).strip()

    if not edu_chunks and not edu_text:
        return 0

    score = 0.0

    # 1. Section Presence (20 pts)
    score += 20.0

    text_lower = (edu_text + " " + " ".join(c.text for c in edu_chunks)).lower()

    # 2. Degree / Program Extraction (35 pts)
    deg_patterns = [
        "bachelor", "degree", "bs", "ba", "b.s.", "b.a.", "master", "ms", "m.s.",
        "doctorate", "phd", "ph.d.", "diploma", "associate", "secondary", "high school", "strand"
    ]
    if any(re.search(r'\b' + re.escape(deg) + r'\b', text_lower) for deg in deg_patterns):
        score += 35.0
    elif any(d in text_lower for d in ["engineering", "science", "arts", "technology", "accountancy", "management", "education"]):
        score += 22.0

    # 3. Institution Extraction (25 pts)
    inst_patterns = [
        "institute", "university", "college", "school", "academy", "technological", "campus", "t.i.p", "tip"
    ]
    if any(inst in text_lower for inst in inst_patterns):
        score += 25.0
    elif len(text_lower.split()) >= 4:
        score += 15.0

    # 4. Dates / Timeframe Extraction (20 pts)
    if re.search(r'\b(19|20)\d{2}\b|\bpresent\b|\bexpected\b|\bgraduat', text_lower):
        score += 20.0
    elif len(text_lower.split()) >= 6:
        score += 10.0

    return min(100, max(0, round(score)))


def _evaluate_ats_certification_parseability(
    evidence_chunks: List[EvidenceChunk],
    audited_findings: List[AuditedFinding],
    parsed_sections: Optional[Dict[str, Any]] = None,
    detected_skills: Optional[List[str]] = None
) -> int:
    """
    Evaluates certification section structural integrity and extractability (0-100).
    Clean omission of optional certification section is recognized as valid document hygiene (100).
    Distinguishes parseable credentials (100), training (85), clean omission (100),
    empty headers (30), and corrupted OCR text (15).
    """
    # Empty document invariant: an empty document with zero content is not an omitted section
    if not evidence_chunks and not parsed_sections and not detected_skills and not audited_findings:
        return 0

    cert_sections = {"Certifications", "Trainings", "Credentials", "Licenses"}
    cert_chunks = [c for c in evidence_chunks if c.section in cert_sections]

    cert_text = ""
    section_explicitly_present = False
    if parsed_sections and isinstance(parsed_sections, dict):
        for k in parsed_sections:
            if any(cs.lower() in k.lower() for cs in cert_sections):
                section_explicitly_present = True
                cert_text = str(parsed_sections[k]).strip()
                break

    if not section_explicitly_present and cert_chunks:
        section_explicitly_present = True
        cert_text = " ".join(c.text for c in cert_chunks).strip()

    # Case 1: Clean omission of optional certification section (standard for fresh graduates)
    if not section_explicitly_present and not cert_chunks and not cert_text:
        return 100

    # Case 2: Section header exists but is completely empty (structural formatting defect)
    if section_explicitly_present and len(cert_text.strip()) < 3:
        return 30

    # Check for severe OCR corruption
    if '\ufffd' in cert_text or bool(re.search(r'[^\x00-\x7F]{4,}', cert_text)):
        return 15

    # Case 3: Parseable credential evidence present
    has_cert_findings = any(
        f.chunkId in [c.chunkId for c in cert_chunks] and f.auditStatus in ("VERIFIED", "AUDITED", "AUDIT_DEGRADED")
        for f in audited_findings
    )
    cert_keywords = [
        "certified", "certification", "license", "credential", "comptia", "cisco", "aws",
        "microsoft", "google", "oracle", "pmp", "tesda", "passed", "certificate of completion"
    ]
    text_lower = cert_text.lower()
    has_cert_keywords = any(kw in text_lower for kw in cert_keywords)
    has_dates = bool(re.search(r'\b(19|20)\d{2}\b', text_lower))

    if has_cert_findings or (has_cert_keywords and has_dates):
        return 100
    elif has_cert_keywords or len(text_lower.split()) >= 4:
        return 85
    else:
        return 50


def _evaluate_target_alignment(
    audited_findings: List[AuditedFinding],
    required_competencies: List[str],
    recommended_competencies: List[str],
    target_position: str,
    detected_skills: Optional[List[str]] = None,
    evidence_chunks: Optional[List[EvidenceChunk]] = None
) -> Dict[str, Any]:
    """
    Authoritative Target Alignment Evaluator.
    Evaluates career-specific competency overlap, gaps, and grounded improvement advice.
    """
    req_set = [c.lower().strip() for c in required_competencies]
    rec_set = [c.lower().strip() for c in recommended_competencies]

    finding_by_competency: Dict[str, AuditedFinding] = {}
    for f in audited_findings:
        if f.auditStatus in ("VERIFIED", "AUDITED", "AUDIT_DEGRADED"):
            c_key = f.competency.lower().strip()
            existing = finding_by_competency.get(c_key)
            if not existing:
                finding_by_competency[c_key] = f
            else:
                level_rank = {"STRONG_DEMONSTRATED": 3, "DEMONSTRATED": 2, "EXPLICIT": 1}
                new_rank = level_rank.get(f.evidenceLevel, 0)
                old_rank = level_rank.get(existing.evidenceLevel, 0)
                if new_rank > old_rank:
                    finding_by_competency[c_key] = f

    total_numerator = 0.0
    req_denominator = sum(1.0 for _ in req_set)

    for req_comp in req_set:
        f = finding_by_competency.get(req_comp)
        if f and f.classification in ("STRONG_MATCH", "PARTIAL_MATCH"):
            lvl_mult = {"STRONG_DEMONSTRATED": 1.00, "DEMONSTRATED": 0.70, "EXPLICIT": 0.35}.get(f.evidenceLevel, 0.35)
            acmo_mult = 0.40 + (0.15 * int(f.acmo.action)) + (0.15 * int(f.acmo.context)) + (0.15 * int(f.acmo.method)) + (0.15 * int(f.acmo.outcome))
            total_numerator += 1.0 * lvl_mult * acmo_mult

    for rec_comp in rec_set:
        f = finding_by_competency.get(rec_comp)
        if f and f.classification in ("STRONG_MATCH", "PARTIAL_MATCH"):
            lvl_mult = {"STRONG_DEMONSTRATED": 1.00, "DEMONSTRATED": 0.70, "EXPLICIT": 0.35}.get(f.evidenceLevel, 0.35)
            acmo_mult = 0.40 + (0.15 * int(f.acmo.action)) + (0.15 * int(f.acmo.context)) + (0.15 * int(f.acmo.method)) + (0.15 * int(f.acmo.outcome))
            total_numerator += 0.6 * lvl_mult * acmo_mult

    total_denominator = req_denominator if req_denominator > 0 else (len(rec_set) * 0.6)
    alignment_raw = min(100.0, (total_numerator / max(1.0, total_denominator)) * 100.0) if total_denominator > 0 else 0.0
    alignment_score = min(100, max(0, round(alignment_raw)))

    matched_competencies: List[str] = []
    transferable_competencies: List[str] = []
    seen_comps = set()

    for comp in req_set + rec_set:
        f = finding_by_competency.get(comp)
        c_disp = f.competency if f else comp.title()
        if c_disp.lower() in seen_comps:
            continue
        seen_comps.add(c_disp.lower())

        if f and f.classification == "STRONG_MATCH":
            matched_competencies.append(c_disp)
        elif f and f.classification == "PARTIAL_MATCH":
            transferable_competencies.append(c_disp)

    priority_gaps: List[str] = []
    for comp in req_set:
        f = finding_by_competency.get(comp)
        if not f or f.classification not in ("STRONG_MATCH", "PARTIAL_MATCH"):
            orig_comp = next((c for c in required_competencies if c.lower().strip() == comp), comp.title())
            if orig_comp not in priority_gaps:
                priority_gaps.append(orig_comp)
    for comp in rec_set:
        f = finding_by_competency.get(comp)
        if not f or f.classification not in ("STRONG_MATCH", "PARTIAL_MATCH"):
            orig_comp = next((c for c in recommended_competencies if c.lower().strip() == comp), comp.title())
            if orig_comp not in priority_gaps:
                priority_gaps.append(orig_comp)

    relevant_technical_skills: List[str] = []
    if detected_skills:
        all_target_lower = set(req_set + rec_set)
        for s in detected_skills:
            s_clean = s.strip()
            if s_clean.lower() not in all_target_lower and s_clean.lower() not in seen_comps:
                relevant_technical_skills.append(s_clean)

    alignment_suggestions: List[Dict[str, Any]] = []
    sug_idx = 1
    if evidence_chunks:
        proj_chunks = [c for c in evidence_chunks if c.section in ("Projects", "WorkExperience")]
        for pc in proj_chunks:
            if not re.search(r'(\d+[%kK\+]|\b\d{2,}\b|\bpercent\b)', pc.text) and len(pc.text.split()) >= 8:
                alignment_suggestions.append({
                    "id": f"align_sug_{sug_idx}",
                    "type": "quantifiable_impact",
                    "priority": "high",
                    "title": "Quantify Project Outcomes & Scale",
                    "why": f"Adding measurable outcomes makes your experience more compelling for {target_position}.",
                    "action": f"Where supported by your actual work in '{pc.text[:60]}...', state the scale (e.g. number of users, daily volume, processing time reduced, or records handled).",
                    "example": "Include percentages or volume metrics you actually achieved."
                })
                sug_idx += 1
                break

    for gap in priority_gaps[:3]:
        alignment_suggestions.append({
            "id": f"align_sug_{sug_idx}",
            "type": "missing_competency",
            "priority": "high",
            "title": f"Demonstrate {gap} Evidence",
            "why": f"Key requirement for {target_position}.",
            "action": f"Build a practical lab, portfolio project, or describe specific coursework applying {gap}.",
            "example": f"Add project or practical demonstration of {gap}."
        })
        sug_idx += 1

    sample_dem = ", ".join((matched_competencies + transferable_competencies)[:2])
    sample_gaps = ", ".join(priority_gaps[:2])
    sample_rel = ", ".join(relevant_technical_skills[:2])

    if not priority_gaps:
        alignment_summary = f"Demonstrates comprehensive evidence across core competencies for {target_position}."
    elif (matched_competencies or transferable_competencies) and relevant_technical_skills:
        alignment_summary = (
            f"Foundational alignment with demonstrated capabilities in {sample_dem}. "
            f"Shows technical breadth in {sample_rel}, while developing targeted evidence in {sample_gaps} "
            f"will strengthen direct readiness for {target_position}."
        )
    elif matched_competencies or transferable_competencies:
        alignment_summary = (
            f"Foundational alignment with demonstrated capabilities in {sample_dem}. "
            f"Developing direct evidence in {sample_gaps} will strengthen target role readiness."
        )
    elif relevant_technical_skills:
        alignment_summary = (
            f"Demonstrates credible technical skills in {sample_rel}. "
            f"Targeting {target_position} requires focused project demonstration in {sample_gaps} "
            f"to establish role-specific alignment."
        )
    else:
        sample_gaps_all = ", ".join(priority_gaps[:3])
        alignment_summary = (
            f"Active development stage for {target_position}. "
            f"Core project demonstration in {sample_gaps_all} is recommended to build competitive alignment."
        )

    return {
        "alignmentPercentage": alignment_score,
        "matchedCompetencies": matched_competencies,
        "transferableCompetencies": transferable_competencies,
        "relevantTechnicalSkills": relevant_technical_skills,
        "priorityGaps": priority_gaps,
        "alignmentSummary": alignment_summary,
        "alignmentSuggestions": alignment_suggestions
    }


def calculate_official_ats_score(
    audited_findings: List[AuditedFinding],
    evidence_chunks: List[EvidenceChunk],
    target_position: str,
    required_competencies: List[str],
    recommended_competencies: Optional[List[str]] = None,
    sbert_edu_sim_score: float = 0.0,
    audit_status_metadata: str = "UNAUDITED",
    role_profile_metadata: Optional[Dict[str, Any]] = None,
    detected_skills: Optional[List[str]] = None,
    parsed_sections: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Pure Python mathematical scoring engine for AIRIS.
    Zero LLM calls. Reproducible math (same input evidence always produces identical score).

    AUTHORITATIVE OFFICIAL ATS FORMULA (Manuscript Weights Frozen):
    FINAL ATS = 0.40 * Skills Parseability + 0.30 * Experience Parseability + 0.20 * Education Parseability + 0.10 * Certification Parseability

    ATS Score strictly measures machine-friendliness and extraction structural integrity.
    Target Alignment exclusively owns career-specific role readiness and competency gaps.
    """
    if recommended_competencies is None:
        recommended_competencies = []

    # 1. ATS COMPONENT SCORES (Machine-friendliness & extraction integrity)
    skills_score = _evaluate_ats_skills_parseability(evidence_chunks, detected_skills, parsed_sections)
    exp_score = _evaluate_ats_experience_parseability(evidence_chunks)
    edu_score = _evaluate_ats_education_parseability(evidence_chunks, parsed_sections)
    cert_score = _evaluate_ats_certification_parseability(evidence_chunks, audited_findings, parsed_sections, detected_skills)

    # 2. AUTHORITATIVE COMPOSITE ATS FORMULA
    official_ats_exact = (0.40 * skills_score) + (0.30 * exp_score) + (0.20 * edu_score) + (0.10 * cert_score)
    official_ats_score = round(official_ats_exact)
    official_ats_score = min(100, max(0, official_ats_score))

    # Determine ATS Level
    if official_ats_score >= 85: level = "ExcellentMatch"
    elif official_ats_score >= 70: level = "StrongFoundation"
    elif official_ats_score >= 50: level = "GettingThere"
    else: level = "NeedsImprovement"

    # 3. TARGET ALIGNMENT (Career-specific role readiness and gap diagnostics)
    target_alignment_payload = _evaluate_target_alignment(
        audited_findings=audited_findings,
        required_competencies=required_competencies,
        recommended_competencies=recommended_competencies,
        target_position=target_position,
        detected_skills=detected_skills,
        evidence_chunks=evidence_chunks
    )

    ats_score_payload = {
        "overallScore": official_ats_score,
        "level": level,
        "resumeScore": {
            "total": official_ats_score,
            "breakdown": {
                "skills": {"rawScore": skills_score, "weight": 0.40, "weightedScore": round(skills_score * 0.40, 1)},
                "experience": {"rawScore": exp_score, "weight": 0.30, "weightedScore": round(exp_score * 0.30, 1)},
                "education": {"rawScore": edu_score, "weight": 0.20, "weightedScore": round(edu_score * 0.20, 1)},
                "certifications": {"rawScore": cert_score, "weight": 0.10, "weightedScore": round(cert_score * 0.10, 1)}
            }
        },
        "roleRelevance": target_alignment_payload,
        "breakdown": {
            "atsCompatibilityScore": official_ats_score,
            "resumeQualityScore": official_ats_score,
            "experienceScore": exp_score,
            "skillsMatchScore": skills_score,
            "educationRelevanceScore": edu_score,
            "certificationsScore": cert_score
        },
        "traceability": {
            "auditStatus": audit_status_metadata,
            "scoringEngineVersion": "4.0.0-decoupled-ats-alignment",
            "formula": "FINAL ATS = 0.40 * Skills + 0.30 * Experience + 0.20 * Education + 0.10 * Certifications",
            "roleProfileId": (role_profile_metadata or {}).get("roleProfileId", f"static_{target_position.lower().replace(' ', '_')}"),
            "roleProfileVersion": (role_profile_metadata or {}).get("roleProfileVersion", "1.0.0"),
            "profileSource": (role_profile_metadata or {}).get("profileSource", "AUTHORITATIVE_STATIC"),
            "isDegraded": (role_profile_metadata or {}).get("isDegraded", False),
            "domain": (role_profile_metadata or {}).get("domain", "General")
        }
    }

    return ats_score_payload
