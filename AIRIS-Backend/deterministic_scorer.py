import math
import re
from typing import Dict, List, Any, Optional
from output_validator import AuditedFinding
from evidence_chunker import EvidenceChunk

# =====================================================================
# EXPERIENCE & PROJECTS SCORING CONSTANTS (Declarative Hierarchy)
# =====================================================================
# Standard Portfolio Denominator (points corresponding to 100% Experience)
EXPERIENCE_PORTFOLIO_DENOMINATOR = 60.0

# Base maximum points by evidence category (per chunk)
EXPERIENCE_SECTION_BASE_WEIGHTS = {
    "FORMAL_WORK": 25.0,              # Professional full-time employment
    "INTERNSHIP_OJT": 18.0,           # Internship, OJT, practicum, apprentice
    "MAJOR_CAPSTONE_PROJECT": 14.0,   # Capstone, thesis, major platform/system
    "HACKATHON_COMPETITION": 10.0,    # Hackathons, coding competitions, contest wins
    "STANDARD_PROJECT": 12.0,         # Standard academic/portfolio project
    "ORGANIZATION_LEADERSHIP": 8.0    # Student leadership, officer, extracurricular
}

# Action verbs indicating demonstrated contribution
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
    "winner", "won", "champion"
}

# Technical keywords indicating technical implementation substance
TECHNICAL_SUBSTANCE_TERMS = {
    "platform", "system", "database", "api", "apis", "full-stack", "fullstack",
    "backend", "frontend", "mobile", "web", "service", "services", "algorithm",
    "algorithms", "model", "models", "automation", "infrastructure", "pipeline",
    "interface", "server", "servers", "cloud", "network", "networking", "framework",
    "frameworks", "application", "applications", "app", "apps", "software", "hardware",
    "microservice", "microservices", "sql", "nosql", "rest", "graphql", "socket",
    "docker", "kubernetes", "linux", "git", "ci/cd", "security", "protocol", "hackathon"
}

# Diminishing returns schedule for multiple project entries (index 0, 1, 2, 3, 4+)
PROJECT_DIMINISHING_SCHEDULE = [1.00, 0.70, 0.45, 0.25, 0.15]

def _categorize_experience_chunk(chunk: EvidenceChunk) -> str:
    sec = chunk.section
    text_lower = chunk.text.lower()

    # 1. Formal Work Experience vs Internship
    if sec == "WorkExperience":
        if any(term in text_lower for term in ["intern", "internship", "ojt", "on-the-job training", "trainee", "practicum", "apprentice"]):
            return "INTERNSHIP_OJT"
        return "FORMAL_WORK"

    # 2. Dedicated Internships section
    if sec == "Internships" or any(term in text_lower for term in ["internship", "ojt", "practicum"]):
        return "INTERNSHIP_OJT"

    # 3. Hackathons & Competitions (in Projects or Achievements)
    if any(term in text_lower for term in ["hackathon", "competition", "contest", "challenge", "datathon", "codefest", "olympiad"]):
        return "HACKATHON_COMPETITION"

    # 4. Projects: Strict contextual capstone signals
    # Generic terms like "platform", "system", "application", "website", "project" alone MUST NOT trigger MAJOR_CAPSTONE_PROJECT
    if sec == "Projects":
        capstone_signals = [
            "capstone", "thesis", "final-year", "final year", "graduation project",
            "major academic project", "degree project", "lead developer of capstone"
        ]
        if any(term in text_lower for term in capstone_signals):
            return "MAJOR_CAPSTONE_PROJECT"
        return "STANDARD_PROJECT"

    # 5. Organizations & Leadership
    if sec == "OrganizationsLeadership":
        return "ORGANIZATION_LEADERSHIP"

    # 6. Achievements: only if hackathon/competition
    if sec == "Achievements" and any(term in text_lower for term in ["hackathon", "competition", "contest", "winner", "champion", "runner-up", "datathon"]):
        return "HACKATHON_COMPETITION"

    return "STANDARD_PROJECT"

def _calculate_chunk_evidence_quality(
    chunk_text: str,
    word_count: int,
    matching_findings: List[AuditedFinding]
) -> float:
    """
    Evaluates evidence quality of a single chunk deterministically (0.00 to 1.00).
    Rewards description completeness, demonstrated action, technical substance, and outcome evidence.
    Includes controlled target role alignment bonus (max +0.15) if matching_findings is non-empty.
    Prevents keyword salad and excessive verbosity from inflating scores.
    """
    text_lower = chunk_text.lower()

    # Dimension 1: Completeness & Substantive Length (0.05 to 0.25)
    # Title-only (<6 words) gets nominal credit (0.05) to avoid awarding points for empty titles
    if word_count < 6:
        length_score = 0.05
    elif word_count < 12:
        length_score = 0.12
    elif word_count < 22:
        length_score = 0.20
    else:
        length_score = 0.25

    # Dimension 2: Demonstrated Contribution & Action Verbs (0.00 to 0.20)
    matched_actions = sum(1 for verb in CONTRIBUTION_ACTION_VERBS if re.search(r'\b' + re.escape(verb) + r'\b', text_lower))
    if matched_actions >= 2:
        action_score = 0.20
    elif matched_actions == 1:
        action_score = 0.12
    else:
        action_score = 0.00

    # Dimension 3: Technical Implementation Substance (0.00 to 0.20)
    matched_tech = sum(1 for term in TECHNICAL_SUBSTANCE_TERMS if re.search(r'\b' + re.escape(term) + r'\b', text_lower))
    if matched_tech >= 2:
        tech_score = 0.20
    elif matched_tech == 1:
        tech_score = 0.12
    else:
        tech_score = 0.00

    # Dimension 4: Outcome, Result & Purpose Evidence (0.00 to 0.20)
    has_purpose_clause = any(p in text_lower for p in [
        "to ease", "to improve", "to help", "connecting", "connecting donors",
        "enabling", "designed to", "developed to", "resulting in", "aimed at",
        "for users", "for examinees", "for students", "for clients", "for victims",
        "automated", "automating", "winner", "won", "awarded", "champion"
    ])
    has_metrics = bool(re.search(r'(\d+[%kK\+]|\b\d{2,}\b|\bpercent\b)', chunk_text))

    if has_metrics and has_purpose_clause:
        outcome_score = 0.20
    elif has_purpose_clause or has_metrics:
        outcome_score = 0.12
    else:
        outcome_score = 0.00

    # Anti-Keyword-Salad & Verbosity Gate:
    # If the text is short (<10 words) but packed with 4+ actions/tech terms, discount the base quality
    is_keyword_salad = (word_count < 10 and (matched_actions + matched_tech) >= 4)
    if is_keyword_salad:
        base_quality = min(0.35, length_score + action_score + tech_score + outcome_score)
    else:
        base_quality = length_score + action_score + tech_score + outcome_score

    # Minimum floor for valid complete descriptions with >=6 words: 0.25
    if word_count >= 6 and base_quality < 0.25:
        base_quality = 0.25

    # Cap base quality strictly at 0.85
    base_quality = min(0.85, base_quality)

    # Dimension 5: Controlled Target Role Alignment Bonus (Max +0.15)
    # Rewards alignment without allowing double-counting synergy to blow past 1.00
    if matching_findings:
        finding_bonuses = []
        for mf in matching_findings:
            acmo_bonus = (0.025 * int(mf.acmo.action)) + (0.025 * int(mf.acmo.context)) + (0.025 * int(mf.acmo.method)) + (0.025 * int(mf.acmo.outcome))
            lvl_bonus = {"STRONG_DEMONSTRATED": 0.05, "DEMONSTRATED": 0.03, "EXPLICIT": 0.01}.get(mf.evidenceLevel, 0.01)
            finding_bonuses.append(lvl_bonus + acmo_bonus)
        role_alignment_bonus = min(0.15, max(finding_bonuses)) if finding_bonuses else 0.05
        total_multiplier = min(1.00, base_quality + role_alignment_bonus)
    else:
        total_multiplier = min(0.85, base_quality)

    return total_multiplier

def calculate_official_ats_score(
    audited_findings: List[AuditedFinding],
    evidence_chunks: List[EvidenceChunk],
    target_position: str,
    required_competencies: List[str],
    recommended_competencies: Optional[List[str]] = None,
    sbert_edu_sim_score: float = 0.0,
    audit_status_metadata: str = "UNAUDITED",
    role_profile_metadata: Optional[Dict[str, Any]] = None,
    detected_skills: Optional[List[str]] = None
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
    req_denominator = sum(1.0 for _ in req_set)

    # Required Competencies (Weight = 1.0)
    for req_comp in req_set:
        f = finding_by_competency.get(req_comp)
        if f and f.classification in ("STRONG_MATCH", "PARTIAL_MATCH"):
            lvl_mult = {"STRONG_DEMONSTRATED": 1.00, "DEMONSTRATED": 0.70, "EXPLICIT": 0.35}.get(f.evidenceLevel, 0.35)
            acmo_mult = 0.40 + (0.15 * int(f.acmo.action)) + (0.15 * int(f.acmo.context)) + (0.15 * int(f.acmo.method)) + (0.15 * int(f.acmo.outcome))
            total_numerator += 1.0 * lvl_mult * acmo_mult

    # Recommended Competencies (Weight = 0.6)
    # Recommended competencies provide elective credit without inflating the baseline required denominator
    for rec_comp in rec_set:
        f = finding_by_competency.get(rec_comp)
        if f and f.classification in ("STRONG_MATCH", "PARTIAL_MATCH"):
            lvl_mult = {"STRONG_DEMONSTRATED": 1.00, "DEMONSTRATED": 0.70, "EXPLICIT": 0.35}.get(f.evidenceLevel, 0.35)
            acmo_mult = 0.40 + (0.15 * int(f.acmo.action)) + (0.15 * int(f.acmo.context)) + (0.15 * int(f.acmo.method)) + (0.15 * int(f.acmo.outcome))
            total_numerator += 0.6 * lvl_mult * acmo_mult

    total_denominator = req_denominator if req_denominator > 0 else (len(rec_set) * 0.6)
    skills_score_raw = min(100.0, (total_numerator / max(1.0, total_denominator)) * 100.0) if total_denominator > 0 else 0.0
    skills_score = min(100, max(0, round(skills_score_raw)))

    # 3. EVIDENCED EXPERIENCE & INTERNSHIP SCORE (30% Weight)
    # Calibrated Evidence Hierarchy Base Weights (per chunk):
    # Formal Work (25.0) > Internships (18.0) > Major/Capstone Project (14.0) > Standard Project (12.0) > Hackathon/Competition (10.0) > Leadership (8.0)
    exp_chunks = []
    for c in evidence_chunks:
        if c.section in {"WorkExperience", "Internships", "Projects", "OrganizationsLeadership"}:
            exp_chunks.append(c)
        elif c.section == "Achievements":
            # Only include achievements that represent hackathon/competition projects
            c_lower = c.text.lower()
            if any(term in c_lower for term in ["hackathon", "competition", "contest", "winner", "champion", "runner-up", "datathon"]):
                exp_chunks.append(c)

    if not exp_chunks:
        exp_score = 0
    else:
        exp_points = 0.0
        seen_chunk_texts = set()
        project_count = 0

        for chunk in exp_chunks:
            norm_text = chunk.text.strip().lower()

            # Duplicate Evidence Rule: Exact duplicate text contributes ZERO additional points
            if norm_text in seen_chunk_texts:
                continue
            seen_chunk_texts.add(norm_text)

            category = _categorize_experience_chunk(chunk)
            base_weight = EXPERIENCE_SECTION_BASE_WEIGHTS.get(category, 12.0)

            matching_findings = [f for f in audited_findings if f.chunkId == chunk.chunkId and f.auditStatus in ("VERIFIED", "AUDITED", "AUDIT_DEGRADED")]
            quality_multiplier = _calculate_chunk_evidence_quality(chunk.text, chunk.wordCount, matching_findings)

            # Diminishing returns applies ONLY to academic & standard projects
            # Formal work, internships, hackathons, and leadership do not suffer project portfolio diminishing returns
            if category in ("MAJOR_CAPSTONE_PROJECT", "STANDARD_PROJECT"):
                dim_idx = min(project_count, len(PROJECT_DIMINISHING_SCHEDULE) - 1)
                dim_factor = PROJECT_DIMINISHING_SCHEDULE[dim_idx]
                project_count += 1
            else:
                dim_factor = 1.0

            exp_points += (base_weight * quality_multiplier * dim_factor)

        # Fixed Standard Portfolio Denominator (60.0 pts)
        # Prevents line-count denominator inflation; rewards deeper professional work monotonically over internships and capstones
        exp_score = min(100, max(0, round((exp_points / EXPERIENCE_PORTFOLIO_DENOMINATOR) * 100.0)))

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

    # 6. DERIVE QUALITATIVE TARGET ALIGNMENT ROLE-FIT DIAGNOSTICS
    # Remove duplicate numerical score mirroring; expose qualitative evidence-grounded diagnostics
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

    # Priority gaps: required competencies missing direct or partial evidence first, then recommended
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

    # Derive Category C: Relevant Technical Evidence (Outside Target Role Profile)
    # Legitimate technical skills from resume that are not target competencies (Category A & B)
    # Strictly isolated from target Skills Match score (zero target skills credit awarded)
    relevant_technical_skills: List[str] = []
    if detected_skills:
        all_target_lower = set(req_set + rec_set)
        for s in detected_skills:
            s_clean = s.strip()
            if s_clean.lower() not in all_target_lower and s_clean.lower() not in seen_comps:
                relevant_technical_skills.append(s_clean)

    # Construct student-facing constructive alignment summary (encouraging, professional, non-punitive)
    sample_matched = ", ".join(matched_competencies[:2]) if matched_competencies else ""
    sample_trans = ", ".join(transferable_competencies[:2]) if transferable_competencies else ""
    sample_gaps = ", ".join(priority_gaps[:2]) if priority_gaps else ""
    sample_rel = ", ".join(relevant_technical_skills[:2]) if relevant_technical_skills else ""

    if not priority_gaps:
        alignment_summary = f"Demonstrates comprehensive evidence across core competencies for {target_position}."
    elif (matched_competencies or transferable_competencies) and relevant_technical_skills:
        demonstrated = (matched_competencies + transferable_competencies)[:2]
        sample_dem = ", ".join(demonstrated)
        alignment_summary = (
            f"Foundational alignment with demonstrated capabilities in {sample_dem}. "
            f"Shows technical breadth in {sample_rel}, while developing targeted evidence in {sample_gaps} "
            f"will strengthen direct readiness for {target_position}."
        )
    elif matched_competencies or transferable_competencies:
        demonstrated = (matched_competencies + transferable_competencies)[:3]
        sample_dem = ", ".join(demonstrated)
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

    # 7. AUTHORITATIVE OFFICIAL ATS FORMULA
    # FINAL ATS = 0.40 * Skills Match + 0.30 * Experience + 0.20 * Education + 0.10 * Certifications
    official_ats_exact = (0.40 * skills_score) + (0.30 * exp_score) + (0.20 * edu_score) + (0.10 * cert_score)
    official_ats_score = round(official_ats_exact)
    official_ats_score = min(100, max(0, official_ats_score))

    # Determine ATS Level
    if official_ats_score >= 85: level = "ExcellentMatch"
    elif official_ats_score >= 70: level = "StrongFoundation"
    elif official_ats_score >= 50: level = "GettingThere"
    else: level = "NeedsImprovement"

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
        "roleRelevance": {
            "matchedCompetencies": matched_competencies,
            "transferableCompetencies": transferable_competencies,
            "relevantTechnicalSkills": relevant_technical_skills,
            "priorityGaps": priority_gaps,
            "alignmentSummary": alignment_summary
        },
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
            "scoringEngineVersion": "3.0.0-generalized-deterministic",
            "formula": "FINAL ATS = 0.40 * Skills + 0.30 * Experience + 0.20 * Education + 0.10 * Certifications",
            "roleProfileId": (role_profile_metadata or {}).get("roleProfileId", f"static_{target_position.lower().replace(' ', '_')}"),
            "roleProfileVersion": (role_profile_metadata or {}).get("roleProfileVersion", "1.0.0"),
            "profileSource": (role_profile_metadata or {}).get("profileSource", "AUTHORITATIVE_STATIC"),
            "isDegraded": (role_profile_metadata or {}).get("isDegraded", False),
            "domain": (role_profile_metadata or {}).get("domain", "General")
        }
    }

    return ats_score_payload
