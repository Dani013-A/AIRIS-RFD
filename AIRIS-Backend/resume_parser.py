import re
from typing import Dict, List

SECTION_ALIASES = {
    "ContactInformation": ["contact", "contact information", "contact details", "personal information", "personal details", "contactinfo"],
    "ProfessionalSummary": ["summary", "professional summary", "career summary", "profile", "professional profile", "objective", "about me", "about"],
    "WorkExperience": ["experience", "work experience", "professional experience", "employment", "employment history", "work history", "history", "career history", "relevant experience", "practical experience", "professional background"],
    "Internships": ["internship", "internships", "internship experience", "on the job training", "ojt", "practicum"],
    "Education": ["education", "educational background", "academic background", "academic history", "education & qualifications", "education and qualifications", "academic qualifications", "academic profile"],
    "RelevantCoursework": ["relevant coursework", "coursework", "relevant courses", "academic coursework", "subjects"],
    "Skills": ["skills", "technical skills", "core skills", "competencies", "core competencies", "technical competencies", "areas of expertise", "technical proficiencies", "skills & proficiencies", "skills and proficiencies", "key skills", "specializations", "hard skills", "tools & technologies", "tools and technologies"],
    "Projects": ["projects", "academic projects", "personal projects", "project experience", "relevant projects", "technical projects", "selected projects", "capstone", "capstone project", "undergraduate thesis", "thesis", "key projects", "featured projects", "systems developed"],
    "Certifications": ["certifications", "certificates", "licenses and certifications", "credentials", "professional certifications", "certifications & trainings", "trainings and certifications", "certifications and licenses", "courses & certifications"],
    "OrganizationsLeadership": ["organizations", "leadership", "organizations & leadership", "organizations and leadership", "extracurricular activities", "student organizations", "affiliations", "leadership experience", "volunteering", "volunteer experience", "community involvement"],
    "Achievements": ["achievements", "awards", "honors", "accomplishments", "honors & awards", "honors and awards", "awards & recognition", "awards and recognition"],
    "Languages": ["languages", "language proficiency", "language skills"],
    "Trainings": ["trainings", "training", "seminars", "workshops", "professional development", "trainings & seminars", "seminars & workshops", "seminars and workshops", "workshops & seminars", "trainings and workshops"]
}

def _normalize_heading(text: str) -> str:
    text_clean = text.lower()
    # Collapse spaced letters like "e d u c a t i o n" -> "education"
    text_collapsed = re.sub(r'\b([a-z])\s+([a-z])\s+([a-z])\b', r'\1\2\3', text_clean)
    text_collapsed = re.sub(r'\b([a-z])\s+([a-z])\b', r'\1\2', text_collapsed)
    return re.sub(r'[^a-z0-9]', '', text_collapsed)

NORMALIZED_ALIASES = {}
for section, aliases in SECTION_ALIASES.items():
    for alias in aliases:
        NORMALIZED_ALIASES[_normalize_heading(alias)] = section

def _is_probable_heading(line: str) -> bool:
    stripped = line.strip()
    if not stripped or len(stripped) > 50:
        return False
    if stripped.isupper() and re.match(r'^[A-Z\s\&\-\/\(\)]+$', stripped):
        return True
    return False

def _detect_section_heading(line: str) -> str:
    stripped = line.strip()
    # Support inline colon headings e.g. "SKILLS: Revit" or "EXPERIENCE: Intern"
    header_part = stripped.split(":", 1)[0].strip() if ":" in stripped else stripped
    norm = _normalize_heading(header_part)
    if norm in NORMALIZED_ALIASES:
        return NORMALIZED_ALIASES[norm]

    full_norm = _normalize_heading(stripped)
    if full_norm in NORMALIZED_ALIASES:
        return NORMALIZED_ALIASES[full_norm]

    if _is_probable_heading(header_part):
        for alias_norm, section in NORMALIZED_ALIASES.items():
            if len(alias_norm) > 4 and alias_norm in norm:
                return section
        return "Custom_" + re.sub(r'[^a-zA-Z0-9]', '', header_part)
    return None

def parse_resume(text: str) -> Dict[str, str]:
    if not text:
        return {}
    sections: Dict[str, List[str]] = {}
    current_key = None

    lines = text.splitlines()
    for i, raw_line in enumerate(lines):
        line = raw_line.strip()
        if not line:
            continue

        if i < 15 and (re.search(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', line) or
                       re.search(r'\b(?:\+?\d{1,3}[\s-]?)?(?:\(\d{3}\)|\d{3})[\s-]?\d{3}[\s-]?\d{4}\b', line) or
                       'github.com' in line.lower() or 'linkedin.com' in line.lower()):
            current_key = "ContactInformation"
            sections.setdefault(current_key, []).append(line)
            continue

        heading = _detect_section_heading(line)
        if heading and heading.startswith("Custom_") and i < 5:
            heading = None

        if heading:
            current_key = heading
            sections.setdefault(current_key, [])
            if ":" in line:
                body_after_colon = line.split(":", 1)[1].strip()
                if body_after_colon:
                    sections[current_key].append(body_after_colon)
            continue

        if current_key is None:
            current_key = "Content"

        sections.setdefault(current_key, []).append(line)

    return {k: "\n".join(v) for k, v in sections.items() if v}
