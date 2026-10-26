import math
import re
from credential_evidence import listed_credentials
from typing import Dict, List, Any, Optional, Tuple, Union, Set
from output_validator import AuditedFinding
from evidence_chunker import EvidenceChunk
from ai_service import is_skill_grounded_in_text

SCORING_MODEL_VERSION = "3.1.0-manuscript"
RESUME_SCORE_FORMULA = "Resume Score = round(ATS Readability × 0.40 + Role Alignment × 0.60)"

# =====================================================================
# ACTION VERBS FOR ATS & EXPERIENCE NARRATIVE EVALUATION
# =====================================================================
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


# =====================================================================
# PART 1: ATS MACHINE-READABILITY EVALUATION (ROLE-INDEPENDENT)
# =====================================================================
# This evaluator evaluates ONLY document machine-readability and conventional
# ATS parsing characteristics. It NEVER receives target role, role benchmarks,
# or career profiles. For the same document, ATS remains strictly stable.
# =====================================================================

ATS_DIMENSION_WEIGHTS: Dict[str, float] = {
    "sectionStructure": 0.20,
    "contactRecognition": 0.15,
    "skillsFormatting": 0.20,
    "experienceStructure": 0.20,
    "educationStructure": 0.15,
    "dateRecognition": 0.10,
}

def _evaluate_ats_experience_parseability(evidence_chunks: List[EvidenceChunk], parsed: Optional[Dict[str, Any]] = None) -> float:
    if parsed is None:
        parsed = {}
    exp_chunks = [
        c for c in evidence_chunks
        if c.section in {"WorkExperience", "Internships", "Projects", "OrganizationsLeadership", "Achievements"}
    ]
    exp_struct_score = 0.0
    if exp_chunks or str(parsed.get("WorkExperience", "") or parsed.get("Projects", "")).strip():
        exp_struct_score += 25.0

        if len(exp_chunks) >= 2:
            exp_struct_score += 25.0
        elif len(exp_chunks) >= 1:
            exp_struct_score += 15.0

        all_exp_text = " ".join(c.text for c in exp_chunks).lower() if exp_chunks else str(parsed.get("WorkExperience", "")).lower()
        matched_actions = sum(1 for verb in CONTRIBUTION_ACTION_VERBS if re.search(r'\b' + re.escape(verb) + r'\b', all_exp_text))
        if matched_actions >= 3:
            exp_struct_score += 25.0
        elif matched_actions >= 1:
            exp_struct_score += 18.0
        else:
            exp_struct_score += 10.0

        substantive_entries = sum(1 for c in exp_chunks if c.wordCount >= 6)
        if substantive_entries >= 2:
            exp_struct_score += 25.0
        elif substantive_entries >= 1:
            exp_struct_score += 15.0
    return min(100.0, max(0.0, exp_struct_score))


def evaluate_ats_machine_readability(
    evidence_chunks: List[EvidenceChunk],
    parsed_sections: Optional[Dict[str, Any]] = None,
    detected_skills: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Evaluates how reliably automated ATS parsers can ingest, tokenize, and extract
    structural content from the document. Completely role-independent (0–100).

    Dimensions:
    1. Section Structure: Standard headings, core section presence, clear boundaries.
    2. Contact Information: Presence and syntactic parseability of email, phone, name, links.
    3. Skills Formatting: Delimitation, token integrity, anti-stuffing, clean typography.
    4. Experience Structure: Entry demarcation, chronological consistency, action verbs, descriptive completeness.
    5. Education Structure: Degree pattern, institution name, dates/timeframe extraction.
    6. Date / Entry Recognition: Temporal parseability across sections (valid formats, no broken ranges).
    """
    if not evidence_chunks and not parsed_sections and not detected_skills:
        return {
            "overallScore": 0,
            "level": "LowParseability",
            "levelLabel": "Formatting At Risk",
            "breakdown": {
                "sectionStructure": {"rawScore": 0, "label": "Section Structure"},
                "contactRecognition": {"rawScore": 0, "label": "Contact Information"},
                "skillsFormatting": {"rawScore": 0, "label": "Skills Formatting"},
                "experienceStructure": {"rawScore": 0, "label": "Experience Structure"},
                "educationStructure": {"rawScore": 0, "label": "Education Structure"},
                "dateRecognition": {"rawScore": 0, "label": "Date / Entry Recognition"}
            }
        }

    parsed = parsed_sections or {}

    # 1. Section Structure (0–100)
    sec_score = 0.0
    core_sections = ["ContactInformation", "Education", "Skills", "WorkExperience", "Projects"]
    found_core = sum(1 for s in core_sections if len(str(parsed.get(s, "")).strip()) > 5)
    if found_core >= 4:
        sec_score += 50.0
    elif found_core >= 3:
        sec_score += 40.0
    elif found_core >= 2:
        sec_score += 25.0
    elif found_core >= 1:
        sec_score += 15.0

    total_sections_count = len([k for k, v in parsed.items() if len(str(v).strip()) > 5])
    if total_sections_count >= 5:
        sec_score += 30.0
    elif total_sections_count >= 3:
        sec_score += 20.0
    elif total_sections_count >= 1:
        sec_score += 10.0

    if len(evidence_chunks) >= 4:
        sec_score += 20.0
    elif len(evidence_chunks) >= 2:
        sec_score += 10.0
    sec_score = min(100.0, max(0.0, sec_score))

    # 2. Contact Information Recognition (0–100)
    contact_text = str(parsed.get("ContactInformation", "")).strip()
    if not contact_text and evidence_chunks:
        c_chunks = [c for c in evidence_chunks if c.section == "ContactInformation"]
        if c_chunks:
            contact_text = " ".join(c.text for c in c_chunks)
    all_text_sample = " ".join(c.text for c in evidence_chunks[:6]) if evidence_chunks else ""

    contact_score = 0.0
    if re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', contact_text or all_text_sample):
        contact_score += 35.0

    if re.search(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b09\d{9}\b|\b\+63\d{10}\b', contact_text or all_text_sample):
        contact_score += 30.0

    if re.search(r'linkedin\.com|github\.com|gitlab\.com|\.io|\.dev|portfolio', (contact_text + " " + all_text_sample).lower()):
        contact_score += 20.0
    else:
        contact_score += 10.0

    if len(contact_text.splitlines()) >= 1 or len(all_text_sample.splitlines()) >= 1:
        contact_score += 15.0
    contact_score = min(100.0, max(0.0, contact_score))

    # 3. Skills Formatting & Token Integrity (0–100)
    skills_text = str(parsed.get("Skills", "") or parsed.get("TechnicalSkills", "") or "").strip()
    if not skills_text:
        s_chunks = [c for c in evidence_chunks if c.section in ("Skills", "TechnicalSkills")]
        if s_chunks:
            skills_text = " ".join(c.text for c in s_chunks)

    skills_fmt_score = 0.0
    if skills_text or (detected_skills and len(detected_skills) > 0):
        skills_fmt_score += 25.0

        has_delimiters = bool(re.search(r'[,•\|\*\-\n/]', skills_text)) if skills_text else (len(detected_skills or []) > 1)
        word_count = len(skills_text.split()) if skills_text else len(detected_skills or []) * 2
        is_dense_narrative = (word_count > 40 and not has_delimiters)

        if has_delimiters and not is_dense_narrative:
            skills_fmt_score += 25.0
        elif not is_dense_narrative:
            skills_fmt_score += 15.0

        candidate_tokens = detected_skills if (detected_skills and len(detected_skills) > 0) else [
            s.strip() for s in re.split(r'[,•\|\*\-\n/]+', skills_text) if s.strip()
        ]
        if candidate_tokens:
            clean_tokens = [
                t for t in candidate_tokens
                if 0 < len(t.split()) <= 5 and '\ufffd' not in t and not re.search(r'[\x00-\x1F\x7F]', t)
            ]
            ratio = len(clean_tokens) / max(1, len(candidate_tokens))
            if ratio >= 0.70 and len(clean_tokens) >= 2:
                skills_fmt_score += 25.0
            elif len(clean_tokens) >= 1:
                skills_fmt_score += 15.0

        has_ocr_corruption = ('\ufffd' in skills_text) or bool(re.search(r'[^\x00-\x7F]{4,}', skills_text))
        words = re.findall(r'\b\w+\b', skills_text.lower()) if skills_text else []
        unique_words = set(words)
        stuffing_detected = False
        if len(words) >= 15:
            if (len(words) / max(1, len(unique_words))) > 2.5:
                stuffing_detected = True

        if not has_ocr_corruption and not stuffing_detected:
            skills_fmt_score += 25.0
        elif not has_ocr_corruption:
            skills_fmt_score += 10.0
    skills_fmt_score = min(100.0, max(0.0, skills_fmt_score))

    # 4. Experience Structure (0–100)
    exp_struct_score = _evaluate_ats_experience_parseability(evidence_chunks, parsed)

    # 5. Education Structure (0–100)
    edu_text = str(parsed.get("Education", "") or parsed.get("RelevantCoursework", "")).strip()
    if not edu_text:
        edu_c = [c for c in evidence_chunks if c.section in {"Education", "RelevantCoursework"}]
        if edu_c:
            edu_text = " ".join(c.text for c in edu_c)

    edu_struct_score = 0.0
    if edu_text:
        edu_struct_score += 25.0
        text_lower = edu_text.lower()

        deg_patterns = ["bachelor", "degree", "bs", "ba", "b.s.", "b.a.", "master", "ms", "m.s.", "diploma", "associate"]
        if any(re.search(r'\b' + re.escape(deg) + r'\b', text_lower) for deg in deg_patterns):
            edu_struct_score += 35.0
        elif any(w in text_lower for w in ["engineering", "science", "arts", "technology", "accountancy", "management"]):
            edu_struct_score += 25.0

        inst_patterns = ["institute", "university", "college", "school", "academy", "technological", "t.i.p", "tip"]
        if any(inst in text_lower for inst in inst_patterns):
            edu_struct_score += 25.0
        elif len(text_lower.split()) >= 3:
            edu_struct_score += 15.0

        if re.search(r'\b(19|20)\d{2}\b|\bpresent\b|\bexpected\b|\bgraduat', text_lower):
            edu_struct_score += 15.0
    edu_struct_score = min(100.0, max(0.0, edu_struct_score))

    # 6. Date / Entry Recognition (0–100)
    full_text = " ".join(c.text for c in evidence_chunks) if evidence_chunks else " ".join(str(v) for v in parsed.values())
    date_rec_score = 0.0
    all_dates = re.findall(r'\b(?:19|20)\d{2}\b', full_text)
    if len(all_dates) >= 3:
        date_rec_score += 40.0
    elif len(all_dates) >= 1:
        date_rec_score += 25.0

    has_date_ranges = bool(re.search(r'\b(19|20)\d{2}\s*(?:[\-–—]|to)\s*(?:(19|20)\d{2}|present|current)\b', full_text, re.IGNORECASE))
    if has_date_ranges:
        date_rec_score += 40.0
    elif len(all_dates) >= 2:
        date_rec_score += 25.0

    if re.search(r'\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(?:19|20)\d{2}\b', full_text, re.IGNORECASE):
        date_rec_score += 20.0
    elif len(all_dates) >= 1:
        date_rec_score += 10.0
    date_rec_score = min(100.0, max(0.0, date_rec_score))

    # Composite ATS Score: 20% Section, 15% Contact, 20% Skills, 20% Exp, 15% Edu, 10% Date
    overall_raw = (
        (ATS_DIMENSION_WEIGHTS["sectionStructure"] * sec_score) +
        (ATS_DIMENSION_WEIGHTS["contactRecognition"] * contact_score) +
        (ATS_DIMENSION_WEIGHTS["skillsFormatting"] * skills_fmt_score) +
        (ATS_DIMENSION_WEIGHTS["experienceStructure"] * exp_struct_score) +
        (ATS_DIMENSION_WEIGHTS["educationStructure"] * edu_struct_score) +
        (ATS_DIMENSION_WEIGHTS["dateRecognition"] * date_rec_score)
    )
    overall_ats = min(100, max(0, round(overall_raw)))

    if overall_ats >= 85:
        level = "OptimalParseability"
        level_label = "Optimal Parseability"
    elif overall_ats >= 70:
        level = "GoodParseability"
        level_label = "Good Parseability"
    elif overall_ats >= 50:
        level = "ModerateParseability"
        level_label = "Moderate Parseability"
    else:
        level = "LowParseability"
        level_label = "Low Parseability"

    return {
        "overallScore": overall_ats,
        "level": level,
        "levelLabel": level_label,
        "breakdown": {
            "sectionStructure": {
                "rawScore": round(sec_score),
                "weight": ATS_DIMENSION_WEIGHTS["sectionStructure"],
                "weightedScore": round(sec_score * ATS_DIMENSION_WEIGHTS["sectionStructure"], 1),
                "label": "Section Structure"
            },
            "contactRecognition": {
                "rawScore": round(contact_score),
                "weight": ATS_DIMENSION_WEIGHTS["contactRecognition"],
                "weightedScore": round(contact_score * ATS_DIMENSION_WEIGHTS["contactRecognition"], 1),
                "label": "Contact Information"
            },
            "skillsFormatting": {
                "rawScore": round(skills_fmt_score),
                "weight": ATS_DIMENSION_WEIGHTS["skillsFormatting"],
                "weightedScore": round(skills_fmt_score * ATS_DIMENSION_WEIGHTS["skillsFormatting"], 1),
                "label": "Skills Formatting"
            },
            "experienceStructure": {
                "rawScore": round(exp_struct_score),
                "weight": ATS_DIMENSION_WEIGHTS["experienceStructure"],
                "weightedScore": round(exp_struct_score * ATS_DIMENSION_WEIGHTS["experienceStructure"], 1),
                "label": "Experience Structure"
            },
            "educationStructure": {
                "rawScore": round(edu_struct_score),
                "weight": ATS_DIMENSION_WEIGHTS["educationStructure"],
                "weightedScore": round(edu_struct_score * ATS_DIMENSION_WEIGHTS["educationStructure"], 1),
                "label": "Education Structure"
            },
            "dateRecognition": {
                "rawScore": round(date_rec_score),
                "weight": ATS_DIMENSION_WEIGHTS["dateRecognition"],
                "weightedScore": round(date_rec_score * ATS_DIMENSION_WEIGHTS["dateRecognition"], 1),
                "label": "Date / Entry Recognition"
            }
        }
    }


# =====================================================================
# PART 2: ROLE ALIGNMENT EVALUATION (ROLE-DEPENDENT, 4 COMPONENTS)
# =====================================================================

def evaluate_role_alignment(
    audited_findings: List[AuditedFinding],
    evidence_chunks: List[EvidenceChunk],
    detected_skills: List[str],
    parsed_sections: Dict[str, Any],
    target_position: str,
    required_competencies: List[str],
    recommended_competencies: List[str],
    education_benchmarks: List[str],
    certification_benchmarks: List[str],
    sbert_edu_sim_score: float = 0.0,
    role_profile_metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Evaluates candidate demonstrated evidence across the manuscript's 4 components:
    - Skills Match: 40%
    - Experience & Projects: 30%
    - Education Relevance: 20%
    - Certifications: 10%
    Zero career-specific 'if career == ...' branches. Zero artificial score floors.
    """
    # -------------------------------------------------------------
    # 1. SKILLS MATCH (40% Weight in Alignment)
    # -------------------------------------------------------------
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
                if level_rank.get(f.evidenceLevel, 0) > level_rank.get(existing.evidenceLevel, 0):
                    finding_by_competency[c_key] = f

    detected_skills_lower = [s.lower().strip() for s in (detected_skills or [])]

    def find_direct_evidence_for_comp(comp_str: str) -> Optional[Tuple[str, str, bool]]:
        """
        Returns (evidence_section, chunk_text, has_action_verb) if found in chunks or detected skills, else None.
        Gives stronger evidence weight to projects/experience than skills-section-only mentions.
        """
        STOP_WORDS = {
            "and", "or", "with", "using", "for", "the", "in", "of", "to", "a", "an",
            "development", "framework", "pipelines", "tools", "systems", "management"
        }
        raw_toks = [w.strip().lower() for w in re.split(r'[,;•|\(\)\[\]]+|\s+or\s+|\s+and\s+|\s+using\s+|\s+with\s+', comp_str) if len(w.strip()) >= 2]
        comp_toks = [t for t in raw_toks if t not in STOP_WORDS]
        if not comp_toks:
            comp_toks = [comp_str.lower()]

        # 1. Check project and experience chunks first (higher evidentiary hierarchy)
        for c in evidence_chunks:
            if c.section in ("WorkExperience", "Internships", "Projects", "Achievements", "OrganizationsLeadership"):
                c_text_lower = c.text.lower()
                for tok in comp_toks:
                    if is_skill_grounded_in_text(tok, c.text):
                        has_verb = any(v in c_text_lower for v in ("developed", "engineered", "built", "implemented", "designed", "automated", "created", "integrated"))
                        return (c.section, c.text, has_verb)

        # 2. Check detected skills list or explicit skills section
        for tok in comp_toks:
            if any(is_skill_grounded_in_text(tok, ds) for ds in detected_skills_lower):
                return ("Skills", tok, False)

        for c in evidence_chunks:
            if c.section in ("Skills", "TechnicalSkills", "CoreCompetencies"):
                c_text_lower = c.text.lower()
                for tok in comp_toks:
                    if is_skill_grounded_in_text(tok, c.text):
                        return ("Skills", tok, False)

        return None

    skills_numerator = 0.0
    skills_denominator = 0.0
    chunk_section_map = {c.chunkId: c.section for c in evidence_chunks}

    for req_comp in req_set:
        skills_denominator += 1.0
        f = finding_by_competency.get(req_comp)
        if f and f.classification in ("STRONG_MATCH", "PARTIAL_MATCH"):
            chunk_sec = chunk_section_map.get(f.chunkId, "")
            is_skills_sec_only = chunk_sec in ("Skills", "TechnicalSkills", "CoreCompetencies")

            if f.evidenceLevel == "STRONG_DEMONSTRATED" and not is_skills_sec_only:
                lvl_factor = 1.00
            elif f.evidenceLevel == "DEMONSTRATED" and not is_skills_sec_only:
                lvl_factor = 0.75
            else:
                lvl_factor = 0.40

            acmo_mult = 0.50 + (0.15 * int(f.acmo.action)) + (0.15 * int(f.acmo.context)) + (0.10 * int(f.acmo.method)) + (0.10 * int(f.acmo.outcome))
            match_mult = 1.0 if f.classification == "STRONG_MATCH" else 0.50
            skills_numerator += 1.0 * lvl_factor * acmo_mult * match_mult
        else:
            ev = find_direct_evidence_for_comp(req_comp)
            if ev:
                ev_sec, _, has_verb = ev
                if ev_sec in ("Projects", "WorkExperience", "Internships", "Achievements"):
                    lvl_factor = 1.00 if has_verb else 0.75
                    acmo_mult = 0.90 if has_verb else 0.80
                else:
                    lvl_factor = 0.40
                    acmo_mult = 0.65
                skills_numerator += 1.0 * lvl_factor * acmo_mult * 1.0

    for rec_comp in rec_set:
        skills_denominator += 0.6
        f = finding_by_competency.get(rec_comp)
        if f and f.classification in ("STRONG_MATCH", "PARTIAL_MATCH"):
            chunk_sec = chunk_section_map.get(f.chunkId, "")
            is_skills_sec_only = chunk_sec in ("Skills", "TechnicalSkills", "CoreCompetencies")

            if f.evidenceLevel == "STRONG_DEMONSTRATED" and not is_skills_sec_only:
                lvl_factor = 1.00
            elif f.evidenceLevel == "DEMONSTRATED" and not is_skills_sec_only:
                lvl_factor = 0.75
            else:
                lvl_factor = 0.40

            acmo_mult = 0.50 + (0.15 * int(f.acmo.action)) + (0.15 * int(f.acmo.context)) + (0.10 * int(f.acmo.method)) + (0.10 * int(f.acmo.outcome))
            match_mult = 1.0 if f.classification == "STRONG_MATCH" else 0.50
            skills_numerator += 0.6 * lvl_factor * acmo_mult * match_mult
        else:
            ev = find_direct_evidence_for_comp(rec_comp)
            if ev:
                ev_sec, _, has_verb = ev
                if ev_sec in ("Projects", "WorkExperience", "Internships", "Achievements"):
                    lvl_factor = 1.00 if has_verb else 0.75
                    acmo_mult = 0.90 if has_verb else 0.80
                else:
                    lvl_factor = 0.40
                    acmo_mult = 0.65
                skills_numerator += 0.6 * lvl_factor * acmo_mult * 1.0

    skills_raw = (skills_numerator / max(1.0, skills_denominator)) * 100.0 if skills_denominator > 0 else 0.0
    skills_score = min(100, max(0, round(skills_raw)))

    # -------------------------------------------------------------
    # 2. EXPERIENCE & INTERNSHIP (30% Weight in Alignment)
    # Relevance/Evidence/Context-Driven
    # -------------------------------------------------------------
    exp_chunks_raw = [
        c for c in evidence_chunks
        if c.section in {"WorkExperience", "Internships", "Projects", "OrganizationsLeadership", "Achievements"}
    ]
    seen_chunk_texts = set()
    exp_chunks = []
    for c in exp_chunks_raw:
        norm_t = " ".join(c.text.lower().split())
        if norm_t not in seen_chunk_texts:
            seen_chunk_texts.add(norm_t)
            exp_chunks.append(c)

    all_target_terms = set(req_set + rec_set)
    exp_relevance_accum = 0.0
    exp_denominator = max(2.0, min(5.0, float(len(exp_chunks))))

    has_any_role_evidence = (
        skills_numerator > 0
        or any(f.classification in ("STRONG_MATCH", "PARTIAL_MATCH") for f in audited_findings)
        or any(any(is_skill_grounded_in_text(t, c.text) for t in all_target_terms) for c in evidence_chunks)
    )

    for chunk in exp_chunks:
        text_lower = chunk.text.lower()
        chunk_pts = 0.0

        chunk_findings = [f for f in audited_findings if f.chunkId == chunk.chunkId and f.classification in ("STRONG_MATCH", "PARTIAL_MATCH")]
        matched_target_terms = sum(1 for term in all_target_terms if is_skill_grounded_in_text(term, chunk.text)) + len(chunk_findings)

        has_verb = any(re.search(r'\b' + re.escape(v) + r'\b', text_lower) for v in CONTRIBUTION_ACTION_VERBS)
        has_quant = bool(re.search(r'(\d+[%kK\+]|\b\d{2,}\b|\bpercent\b|users|clients|reduced|increased)', text_lower))
        is_substantive_sec = chunk.section in ("Projects", "WorkExperience", "Internships", "Achievements")

        if matched_target_terms > 0:
            chunk_pts = 45.0 if matched_target_terms >= 2 else 30.0
            if has_verb:
                chunk_pts += 25.0
            if has_quant:
                chunk_pts += 20.0
            if chunk.wordCount >= 12:
                chunk_pts += 10.0
            if chunk.section == "WorkExperience":
                chunk_pts += 15.0
        elif has_any_role_evidence and (is_substantive_sec and chunk.wordCount >= 6 and (has_verb or has_quant or chunk.wordCount >= 12) or chunk.section == "WorkExperience"):
            chunk_pts = 20.0
            if has_verb:
                chunk_pts += 25.0
            if has_quant:
                chunk_pts += 20.0
            if chunk.wordCount >= 12:
                chunk_pts += 10.0
            if chunk.section == "WorkExperience":
                chunk_pts += 15.0
        else:
            chunk_pts = 0.0

        exp_relevance_accum += min(100.0, chunk_pts)

    if exp_chunks and has_any_role_evidence:
        exp_raw = exp_relevance_accum / exp_denominator
        exp_score = min(100, max(0, round(exp_raw)))
    else:
        exp_score = 0

    # -------------------------------------------------------------
    # 3. EDUCATION RELEVANCE (20% Weight in Alignment)
    # -------------------------------------------------------------
    edu_text = str(parsed_sections.get("Education", "") or parsed_sections.get("RelevantCoursework", "")).strip()
    if not edu_text:
        edu_c = [c for c in evidence_chunks if c.section in {"Education", "RelevantCoursework"}]
        if edu_c:
            edu_text = " ".join(c.text for c in edu_c)

    edu_score = 0
    if edu_text:
        text_lower = edu_text.lower()
        degree_mentions = re.findall(r"\b(?:bachelor|degree|bs|ba|b\.s\.?|b\.a\.?|master|ms|associate|diploma)\b", text_lower)
        has_degree = any(is_skill_grounded_in_text(mention, edu_text) for mention in degree_mentions)

        best_bm_match = 0.0
        for bm in education_benchmarks:
            bm_lower = bm.lower()
            bm_tokens = [w for w in re.findall(r'\b\w+\b', bm_lower) if len(w) >= 3 and w not in ("bachelor", "science", "arts", "degree", "of", "in")]
            if bm_tokens:
                matched_tokens = sum(1 for tok in bm_tokens if tok in text_lower)
                ratio = matched_tokens / len(bm_tokens)
                if ratio > best_bm_match:
                    best_bm_match = ratio

        sbert_sim = (sbert_edu_sim_score / 100.0) if sbert_edu_sim_score > 0 else 0.0
        effective_edu_match = max(best_bm_match, sbert_sim)

        if has_degree and effective_edu_match >= 0.70:
            edu_score = min(100, round(85 + (15 * effective_edu_match)))
        elif has_degree and effective_edu_match >= 0.40:
            edu_score = min(84, round(70 + (14 * effective_edu_match)))
        elif has_degree and effective_edu_match >= 0.20:
            edu_score = min(69, round(50 + (19 * effective_edu_match)))
        elif has_degree and effective_edu_match >= 0.05:
            edu_score = round(30 + (20 * effective_edu_match))
        else:
            # Completely unrelated discipline (e.g. IT degree for Civil Engineering) has 0 relevance without artificial floor
            edu_score = 0
    edu_score = min(100, max(0, edu_score))

    # -------------------------------------------------------------
    # 4. CERTIFICATIONS (10% Weight in Alignment)
    # Role-Profile-Aware & Declarative
    # -------------------------------------------------------------
    cert_text = str(parsed_sections.get("Certifications", "") or parsed_sections.get("Credentials", "") or parsed_sections.get("Licenses", "")).strip()
    if not cert_text:
        cert_c = [c for c in evidence_chunks if c.section in {"Certifications", "Credentials", "Licenses"}]
        if cert_c:
            cert_text = " ".join(c.text for c in cert_c)

    cert_text = listed_credentials(cert_text)
    cert_score = 0
    has_any_certs = bool(cert_text and len(cert_text.split()) >= 2)

    has_empty_header_defect = any(
        sec in (parsed_sections or {}) and not str(parsed_sections[sec]).strip()
        for sec in ("Certifications", "Credentials", "Licenses")
    )

    has_verified_finding = any(
        f.classification in ("STRONG_MATCH", "PARTIAL_MATCH")
        and any(w in f.competency.lower() for w in ("certified", "solutions architect", "certification", "credential", "license", "aws", "cisco", "comptia"))
        for f in audited_findings
    )

    matched_benchmarks = 0
    for c_bm in certification_benchmarks:
        c_bm_lower = c_bm.lower()
        bm_toks = [w for w in re.findall(r'\b[a-zA-Z0-9\+\#]+\b', c_bm_lower) if len(w) >= 3 and w not in ("certified", "professional", "certificate", "associate")]
        if bm_toks and any(all(re.search(r"\b" + re.escape(tok) + r"\b", entry.lower()) for tok in bm_toks) for entry in cert_text.splitlines()):
            matched_benchmarks += 1

    has_explicit_benchmarks = len(certification_benchmarks) > 0

    if has_any_certs and (matched_benchmarks > 0 or has_verified_finding):
        cert_score = min(100, 80 + max(20, matched_benchmarks * 10))
    elif has_any_certs and has_explicit_benchmarks:
        cert_score = 65
    elif has_any_certs:
        cert_score = 85
    elif has_empty_header_defect:
        cert_score = 30
    elif has_explicit_benchmarks:
        cert_score = 0
    elif target_position and any(kw in target_position.lower() for kw in ("specialist", "network", "system", "infrastructure", "security", "cloud", "technician")):
        cert_score = 0
    else:
        neutral_baseline = round((skills_score * 0.5) + (exp_score * 0.5))
        cert_score = neutral_baseline
    cert_score = min(100, max(0, cert_score))

    # -------------------------------------------------------------
    # COMPOSITE ALIGNMENT SCORE: 40% Skills + 30% Exp + 20% Edu + 10% Certs
    # -------------------------------------------------------------
    official_alignment_raw = (0.40 * skills_score) + (0.30 * exp_score) + (0.20 * edu_score) + (0.10 * cert_score)
    official_alignment_score = min(100, max(0, round(official_alignment_raw)))

    if official_alignment_score >= 85:
        align_level = "HighAlignment"
        align_label = "High Alignment"
    elif official_alignment_score >= 70:
        align_level = "StrongAlignment"
        align_label = "Strong Alignment"
    elif official_alignment_score >= 50:
        align_level = "DevelopingAlignment"
        align_label = "Developing Alignment"
    else:
        align_level = "LimitedAlignment"
        align_label = "Limited Alignment"

    competencies_list: List[Dict[str, Any]] = []
    seen_comps = set()

    for comp in required_competencies:
        c_lower = comp.lower().strip()
        if c_lower in seen_comps:
            continue
        seen_comps.add(c_lower)
        f = finding_by_competency.get(c_lower)
        if f and f.classification == "STRONG_MATCH":
            status = "DEMONSTRATED"
            icon = "✓"
        elif f and f.classification == "PARTIAL_MATCH":
            status = "RELATED"
            icon = "~"
        else:
            ev = find_direct_evidence_for_comp(c_lower)
            if ev:
                ev_sec, _, _ = ev
                if ev_sec in ("Projects", "WorkExperience", "Internships", "Achievements"):
                    status = "DEMONSTRATED"
                    icon = "✓"
                else:
                    status = "RELATED"
                    icon = "~"
            else:
                status = "NOT_EVIDENCED"
                icon = "○"
        competencies_list.append({
            "name": comp,
            "status": status,
            "icon": icon,
            "isRequired": True
        })

    for comp in recommended_competencies:
        c_lower = comp.lower().strip()
        if c_lower in seen_comps:
            continue
        seen_comps.add(c_lower)
        f = finding_by_competency.get(c_lower)
        if f and f.classification == "STRONG_MATCH":
            status = "DEMONSTRATED"
            icon = "✓"
        elif f and f.classification == "PARTIAL_MATCH":
            status = "RELATED"
            icon = "~"
        else:
            ev = find_direct_evidence_for_comp(c_lower)
            if ev:
                ev_sec, _, _ = ev
                if ev_sec in ("Projects", "WorkExperience", "Internships", "Achievements"):
                    status = "DEMONSTRATED"
                    icon = "✓"
                else:
                    status = "RELATED"
                    icon = "~"
            else:
                status = "NOT_EVIDENCED"
                icon = "○"
        competencies_list.append({
            "name": comp,
            "status": status,
            "icon": icon,
            "isRequired": False
        })

    strongest_evidence: List[str] = []
    areas_with_limited: List[str] = []

    for comp_item in competencies_list:
        if comp_item["status"] == "DEMONSTRATED" and len(strongest_evidence) < 3:
            f = finding_by_competency.get(comp_item["name"].lower().strip())
            quote = f.observedEvidence[:55] + "..." if (f and f.observedEvidence and len(f.observedEvidence) > 55) else f.observedEvidence if (f and f.observedEvidence) else f"{comp_item['name']} practical application"
            if quote and quote not in strongest_evidence:
                strongest_evidence.append(quote)
        elif comp_item["status"] in ("NOT_EVIDENCED", "RELATED") and comp_item["isRequired"] and len(areas_with_limited) < 5:
            if comp_item["name"] not in areas_with_limited:
                areas_with_limited.append(comp_item["name"])

    for comp_item in competencies_list:
        if comp_item["status"] in ("NOT_EVIDENCED", "RELATED") and not comp_item["isRequired"] and len(areas_with_limited) < 5:
            if comp_item["name"] not in areas_with_limited:
                areas_with_limited.append(comp_item["name"])

    if not strongest_evidence and exp_chunks:
        for c in exp_chunks:
            q = c.text[:60] + "..." if len(c.text) > 60 else c.text
            if q and q not in strongest_evidence:
                strongest_evidence.append(q)
            if len(strongest_evidence) >= 2:
                break

    dem_count = sum(1 for c in competencies_list if c["status"] == "DEMONSTRATED" and c["isRequired"])
    req_total = sum(1 for c in competencies_list if c["isRequired"])
    if dem_count >= max(1, req_total - 1):
        alignment_summary = f"Demonstrates comprehensive relevance and strong project evidence across core competencies for {target_position}."
    elif dem_count >= 1:
        alignment_summary = f"Demonstrates solid foundational alignment for {target_position} with evidenced capabilities, alongside clear development opportunities."
    else:
        alignment_summary = f"Active development stage for {target_position}. Targeted project demonstration in core competencies is recommended to strengthen direct readiness."

    return {
        "overallScore": official_alignment_score,
        "targetPosition": target_position,
        "level": align_level,
        "levelLabel": align_label,
        "breakdown": {
            "skillsMatch": {
                "rawScore": skills_score,
                "weight": 0.40,
                "weightedScore": round(skills_score * 0.40, 1),
                "label": "Skills Match"
            },
            "experienceProjects": {
                "rawScore": exp_score,
                "weight": 0.30,
                "weightedScore": round(exp_score * 0.30, 1),
                "label": "Experience & Projects"
            },
            "educationRelevance": {
                "rawScore": edu_score,
                "weight": 0.20,
                "weightedScore": round(edu_score * 0.20, 1),
                "label": "Education Relevance"
            },
            "certifications": {
                "rawScore": cert_score,
                "weight": 0.10,
                "weightedScore": round(cert_score * 0.10, 1),
                "label": "Certifications"
            }
        },
        "competencies": competencies_list,
        "evidenceSummary": {
            "strongestEvidence": strongest_evidence,
            "areasWithLimitedEvidence": areas_with_limited
        },
        "alignmentSummary": alignment_summary,
        "priorityGaps": areas_with_limited
    }


# =====================================================================
# PART 3: CANONICAL RESUME SCORE SYNTHESIS
# =====================================================================

def calculate_canonical_resume_score(
    evidence_chunks: List[EvidenceChunk],
    parsed_sections: Dict[str, Any],
    detected_skills: List[str],
    target_position: str,
    required_competencies: List[str],
    recommended_competencies: Optional[List[str]] = None,
    education_benchmarks: Optional[List[str]] = None,
    certification_benchmarks: Optional[List[str]] = None,
    audited_findings: Optional[List[AuditedFinding]] = None,
    sbert_edu_sim_score: float = 0.0,
    role_profile_metadata: Optional[Dict[str, Any]] = None,
    audit_status_metadata: str = "VERIFIED"
) -> Dict[str, Any]:
    """
    Returns the two-tier Resume Score specified in manuscript section 3.5.1.
    Role Alignment retains the Skills/Experience/Education/Certifications 40/30/20/10 matrix.
    """
    if recommended_competencies is None:
        recommended_competencies = []
    if education_benchmarks is None:
        education_benchmarks = []
    if certification_benchmarks is None:
        certification_benchmarks = []
    if audited_findings is None:
        audited_findings = []

    # 1. Evaluate ATS Machine-Readability (Completely Role-Independent)
    ats_payload = evaluate_ats_machine_readability(
        evidence_chunks=evidence_chunks,
        parsed_sections=parsed_sections,
        detected_skills=detected_skills
    )

    # 2. Evaluate Role Alignment (Role-Dependent, 4 Components)
    alignment_payload = evaluate_role_alignment(
        audited_findings=audited_findings,
        evidence_chunks=evidence_chunks,
        detected_skills=detected_skills,
        parsed_sections=parsed_sections,
        target_position=target_position,
        required_competencies=required_competencies,
        recommended_competencies=recommended_competencies,
        education_benchmarks=education_benchmarks,
        certification_benchmarks=certification_benchmarks,
        sbert_edu_sim_score=sbert_edu_sim_score,
        role_profile_metadata=role_profile_metadata
    )

    # Finalized manuscript section 3.5.1 (PDF p.133): combine the two tiers.
    ats_score = ats_payload["overallScore"]
    align_score = alignment_payload["overallScore"]

    resume_score = round(0.40 * ats_score + 0.60 * align_score)

    if resume_score >= 85:
        overall_level = "ExcellentMatch"
    elif resume_score >= 70:
        overall_level = "StrongFoundation"
    elif resume_score >= 50:
        overall_level = "GettingThere"
    else:
        overall_level = "NeedsImprovement"

    legacy_resume_score_breakdown = {
        "skills": alignment_payload["breakdown"]["skillsMatch"],
        "experience": alignment_payload["breakdown"]["experienceProjects"],
        "education": alignment_payload["breakdown"]["educationRelevance"],
        "certifications": alignment_payload["breakdown"]["certifications"]
    }

    # Category C: detected skills outside target profile competencies
    all_target_lower = {c.lower().strip() for c in (required_competencies or []) + (recommended_competencies or [])}
    matched_comp_names_lower = {c["name"].lower().strip() for c in alignment_payload["competencies"] if c["status"] == "DEMONSTRATED"}
    relevant_technical_skills: List[str] = []
    if detected_skills:
        for s in detected_skills:
            s_clean = s.strip()
            if s_clean.lower() not in all_target_lower and s_clean.lower() not in matched_comp_names_lower:
                if s_clean not in relevant_technical_skills:
                    relevant_technical_skills.append(s_clean)

    alignment_summary = alignment_payload.get("alignmentSummary", "")
    if relevant_technical_skills and alignment_summary:
        sample_rel = ", ".join(relevant_technical_skills[:2])
        if "Shows technical breadth in" not in alignment_summary:
            alignment_summary = f"{alignment_summary} Shows technical breadth in {sample_rel}."

    legacy_role_relevance = {
        "alignmentPercentage": alignment_payload["breakdown"]["skillsMatch"]["rawScore"],
        "matchedCompetencies": [c["name"] for c in alignment_payload["competencies"] if c["status"] == "DEMONSTRATED"],
        "transferableCompetencies": [c["name"] for c in alignment_payload["competencies"] if c["status"] == "RELATED"],
        "relevantTechnicalSkills": relevant_technical_skills,
        "priorityGaps": alignment_payload["priorityGaps"],
        "alignmentSummary": alignment_summary
    }

    return {
        "scoringModelVersion": SCORING_MODEL_VERSION,
        "resumeScore": {
            "overallScore": resume_score,
            "level": overall_level,
            "atsContribution": round(0.40 * ats_score, 2),
            "alignmentContribution": round(0.60 * align_score, 2),
            "formula": RESUME_SCORE_FORMULA,
            "total": resume_score,
            "breakdown": legacy_resume_score_breakdown,
            "diagnosticAtsScore": ats_score
        },
        "atsScore": {
            "overallScore": ats_score,
            "level": ats_payload["level"],
            "levelLabel": ats_payload["levelLabel"],
            "breakdown": ats_payload["breakdown"],
            "diagnosticSummary": "Role-independent machine-readability analysis (contact, section headings, layout, dates, formatting)",
            "roleRelevance": legacy_role_relevance,
            "resumeScore": {
                "total": resume_score,
                "breakdown": legacy_resume_score_breakdown
            }
        },
        "alignmentScore": alignment_payload,
        "overallScore": resume_score,
        "traceability": {
            "scoringModelVersion": SCORING_MODEL_VERSION,
            "scoringEngineVersion": "4.0.0-decoupled-ats-alignment",
            "auditStatus": audit_status_metadata,
            "formula": RESUME_SCORE_FORMULA,
            "roleProfileId": (role_profile_metadata or {}).get("roleProfileId", f"static_{target_position.lower().replace(' ', '_')}"),
            "roleProfileVersion": (role_profile_metadata or {}).get("roleProfileVersion", "1.0.0"),
            "profileSource": (role_profile_metadata or {}).get("profileSource", "AUTHORITATIVE_STATIC"),
            "isDegraded": (role_profile_metadata or {}).get("isDegraded", False),
            "domain": (role_profile_metadata or {}).get("domain", "General")
        }
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
    parsed_sections: Optional[Dict[str, Any]] = None,
    education_benchmarks: Optional[List[str]] = None,
    certification_benchmarks: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Legacy wrapper delegating to calculate_canonical_resume_score.
    Returns backward-compatible dictionary structure while guaranteeing canonical calculations.
    """
    canonical_result = calculate_canonical_resume_score(
        evidence_chunks=evidence_chunks,
        parsed_sections=parsed_sections or {},
        detected_skills=detected_skills or [],
        target_position=target_position,
        required_competencies=required_competencies,
        recommended_competencies=recommended_competencies or [],
        education_benchmarks=education_benchmarks or [],
        certification_benchmarks=certification_benchmarks or [],
        audited_findings=audited_findings,
        sbert_edu_sim_score=sbert_edu_sim_score,
        role_profile_metadata=role_profile_metadata,
        audit_status_metadata=audit_status_metadata
    )

    ats_score_val = canonical_result["atsScore"]["overallScore"]
    ats_level_val = canonical_result["atsScore"]["level"]

    ats_payload = dict(canonical_result["atsScore"])
    ats_payload["overallScore"] = ats_score_val
    ats_payload["level"] = ats_level_val
    ats_payload["parseabilityLevel"] = ats_level_val
    ats_payload["resumeScore"] = canonical_result["resumeScore"]
    ats_payload["traceability"] = canonical_result["traceability"]
    ats_payload["alignmentScore"] = canonical_result["alignmentScore"]
    ats_payload["canonicalResumeScore"] = canonical_result["resumeScore"]["overallScore"]
    ats_payload["diagnosticAtsScore"] = ats_score_val
    ats_payload["roleRelevance"] = canonical_result["atsScore"]["roleRelevance"]
    return ats_payload
