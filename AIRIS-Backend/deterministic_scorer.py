import math
from typing import Dict, List, Any, Optional
from output_validator import AuditedFinding
from evidence_chunker import EvidenceChunk

def calculate_official_ats_score(
    audited_findings: List[AuditedFinding],
    evidence_chunks: List[EvidenceChunk],
    target_position: str,
    required_competencies: List[str],
    recommended_competencies: Optional[List[str]] = None,
    sbert_edu_sim_score: float = 0.0,
    audit_status_metadata: str = "UNAUDITED"
) -> Dict[str, Any]:
    """
    Pure Python mathematical scoring engine for AIRIS.
    Zero LLM calls. Reproducible math (same input evidence always produces identical score).
    
    AUTHORITATIVE OFFICIAL ATS FORMULA:
    FINAL ATS = 0.40 * Skills Match + 0.30 * Experience & Internship + 0.20 * Education Relevance + 0.10 * Certifications
    """
    if recommended_competencies is None:
        recommended_competencies = []

    # 1. Map findings by competency (selecting highest evidence level per competency to prevent duplicate stacking)
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

    # 2. SKILLS MATCH SCORE (40% Weight)
    req_set = [c.lower().strip() for c in required_competencies]
    rec_set = [c.lower().strip() for c in recommended_competencies]

    total_numerator = 0.0
    total_denominator = 0.0

    # Required Competencies (Weight = 1.0)
    for req_comp in req_set:
        weight = 1.0
        total_denominator += weight
        f = finding_by_competency.get(req_comp)
        if f and f.classification in ("STRONG_MATCH", "PARTIAL_MATCH"):
            lvl_mult = {"STRONG_DEMONSTRATED": 1.00, "DEMONSTRATED": 0.70, "EXPLICIT": 0.35}.get(f.evidenceLevel, 0.35)
            acmo_mult = 0.40 + (0.15 * int(f.acmo.action)) + (0.15 * int(f.acmo.context)) + (0.15 * int(f.acmo.method)) + (0.15 * int(f.acmo.outcome))
            total_numerator += weight * lvl_mult * acmo_mult

    # Recommended Competencies (Weight = 0.6)
    for rec_comp in rec_set:
        weight = 0.6
        total_denominator += weight
        f = finding_by_competency.get(rec_comp)
        if f and f.classification in ("STRONG_MATCH", "PARTIAL_MATCH"):
            lvl_mult = {"STRONG_DEMONSTRATED": 1.00, "DEMONSTRATED": 0.70, "EXPLICIT": 0.35}.get(f.evidenceLevel, 0.35)
            acmo_mult = 0.40 + (0.15 * int(f.acmo.action)) + (0.15 * int(f.acmo.context)) + (0.15 * int(f.acmo.method)) + (0.15 * int(f.acmo.outcome))
            total_numerator += weight * lvl_mult * acmo_mult

    skills_score_raw = (total_numerator / max(1.0, total_denominator)) * 100.0 if total_denominator > 0 else 0.0
    skills_score = min(100, max(0, round(skills_score_raw)))

    # 3. EVIDENCED EXPERIENCE & INTERNSHIP SCORE (30% Weight)
    # Calibrated Evidence Hierarchy Base Weights (per chunk):
    # WorkExperience (25.0) > Internships (20.0) > Projects (16.0) > OrganizationsLeadership (12.0)
    exp_sections = {"WorkExperience", "Internships", "Projects", "OrganizationsLeadership"}
    exp_chunks = [c for c in evidence_chunks if c.section in exp_sections]

    if not exp_chunks:
        exp_score = 0
    else:
        SECTION_MAX_WEIGHTS = {
            "WorkExperience": 25.0,
            "Internships": 20.0,
            "Projects": 16.0,
            "OrganizationsLeadership": 12.0
        }

        exp_points = 0.0
        seen_chunk_texts = set()

        for chunk in exp_chunks:
            sec_max = SECTION_MAX_WEIGHTS.get(chunk.section, 12.0)
            norm_text = chunk.text.strip().lower()

            # Duplicate Evidence Rule: Exact duplicate text contributes ZERO additional points
            if norm_text in seen_chunk_texts:
                continue
            seen_chunk_texts.add(norm_text)

            matching_findings = [f for f in audited_findings if f.chunkId == chunk.chunkId and f.auditStatus in ("VERIFIED", "AUDITED", "AUDIT_DEGRADED")]
            
            if matching_findings:
                # Anti-stacking: Take ONLY max finding contribution per chunk
                chunk_finding_points = []
                for mf in matching_findings:
                    acmo_bonus = (0.25 * int(mf.acmo.action)) + (0.25 * int(mf.acmo.context)) + (0.25 * int(mf.acmo.method)) + (0.25 * int(mf.acmo.outcome))
                    lvl_mult = {"STRONG_DEMONSTRATED": 1.00, "DEMONSTRATED": 0.75, "EXPLICIT": 0.40}.get(mf.evidenceLevel, 0.40)
                    chunk_finding_points.append(sec_max * lvl_mult * (0.50 + 0.50 * acmo_bonus))
                exp_points += max(chunk_finding_points) if chunk_finding_points else (sec_max * 0.35)
            else:
                exp_points += (sec_max * 0.25)

        # Fixed Standard Portfolio Denominator (50.0 pts)
        # Prevents line-count denominator inflation; rewards deeper professional work monotonically over internships and capstones
        standard_denominator = 50.0
        exp_score = min(100, max(0, round((exp_points / standard_denominator) * 100.0)))

    # 4. EVIDENCED EDUCATION RELEVANCE SCORE (20% Weight)
    # Calibrated evidence-derived formula without artificial 60.0 baseline floor
    edu_sections = {"Education", "RelevantCoursework"}
    edu_chunks = [c for c in evidence_chunks if c.section in edu_sections]
    
    if not edu_chunks:
        edu_score = 0
    else:
        # Modest section presence points
        base_edu = 10.0

        # Degree keyword presence check
        has_degree = False
        for chunk in edu_chunks:
            text_lower = chunk.text.lower()
            if any(deg in text_lower for deg in ["bachelor", "degree", "bs", "ba", "ms", "master", "doctorate", "phd", "diploma"]):
                has_degree = True
                break

        if has_degree:
            base_edu += 20.0

        # Add SBERT Academic Discipline Benchmark Similarity (0-40 points)
        if sbert_edu_sim_score > 0:
            base_edu += (sbert_edu_sim_score * 0.40)

        # Check for supporting coursework or academic project backing (0-15 points)
        coursework_chunks = [c for c in evidence_chunks if c.section in ("RelevantCoursework", "Projects")]
        if coursework_chunks:
            base_edu += 15.0

        edu_score = min(100, max(0, round(base_edu)))

    # 5. CERTIFICATIONS SCORE (10% Weight) - Zero Evidence Rule Enforced
    cert_sections = {"Certifications", "Trainings", "Achievements"}
    cert_chunks = [c for c in evidence_chunks if c.section in cert_sections]
    
    if not cert_chunks:
        cert_score = 0
    else:
        # Certified findings ONLY
        cert_findings = [f for f in audited_findings if f.chunkId in [c.chunkId for c in cert_chunks] and f.auditStatus in ("VERIFIED", "AUDITED", "AUDIT_DEGRADED")]
        if cert_findings:
            cert_score = min(100, len(cert_findings) * 50)
        else:
            # STRICT RULE: Zero verified certification findings -> cert_score = 0 (No fallback for section presence)
            cert_score = 0

    # 6. AUTHORITATIVE OFFICIAL ATS FORMULA
    # FINAL ATS = 0.40 * Skills Match + 0.30 * Experience + 0.20 * Education + 0.10 * Certifications
    official_ats_exact = (0.40 * skills_score) + (0.30 * exp_score) + (0.20 * edu_score) + (0.10 * cert_score)
    official_ats_score = round(official_ats_exact)
    official_ats_score = min(100, max(0, official_ats_score))

    # Determine ATS Level
    if official_ats_score >= 85: level = "ExcellentMatch"
    elif official_ats_score >= 70: level = "StrongFoundation"
    elif official_ats_score >= 50: level = "GettingThere"
    else: level = "NeedsImprovement"

    # Separate secondary metric for mobile API compatibility (never alters official_ats_score)
    secondary_resume_score = round((skills_score * 0.50) + (edu_score * 0.25) + (cert_score * 0.25))

    ats_score_payload = {
        "overallScore": official_ats_score,
        "level": level,
        "resumeScore": {
            "total": secondary_resume_score,
            "breakdown": {
                "skills": {"rawScore": skills_score, "weight": 0.50, "weightedScore": round(skills_score * 0.50, 1)},
                "education": {"rawScore": edu_score, "weight": 0.25, "weightedScore": round(edu_score * 0.25, 1)},
                "certifications": {"rawScore": cert_score, "weight": 0.25, "weightedScore": round(cert_score * 0.25, 1)}
            }
        },
        "roleRelevance": {
            "total": official_ats_score,
            "breakdown": {
                "skillsMatch": {"rawScore": skills_score, "weight": 0.40, "weightedScore": round(skills_score * 0.40, 1)},
                "experienceMatch": {"rawScore": exp_score, "weight": 0.30, "weightedScore": round(exp_score * 0.30, 1)},
                "educationMatch": {"rawScore": edu_score, "weight": 0.20, "weightedScore": round(edu_score * 0.20, 1)},
                "certificationsMatch": {"rawScore": cert_score, "weight": 0.10, "weightedScore": round(cert_score * 0.10, 1)}
            }
        },
        "breakdown": {
            "atsCompatibilityScore": official_ats_score,
            "resumeQualityScore": secondary_resume_score,
            "experienceScore": exp_score,
            "skillsMatchScore": skills_score,
            "educationRelevanceScore": edu_score,
            "certificationsScore": cert_score
        },
        "traceability": {
            "auditStatus": audit_status_metadata,
            "scoringEngineVersion": "2.2.0-monotonic-experience",
            "formula": "FINAL ATS = 0.40 * Skills + 0.30 * Experience + 0.20 * Education + 0.10 * Certifications"
        }
    }

    return ats_score_payload
