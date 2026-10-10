import re
from typing import Dict, List

SECTION_ALIASES = {
    "ContactInformation": [
        "contact", "contact information", "contact details", "personal information", "personal details",
        "contactinfo", "contact info", "get in touch"
    ],
    "ProfessionalSummary": [
        "summary", "professional summary", "career summary", "profile", "professional profile",
        "objective", "career objective", "professional objective", "about me", "about",
        "personal statement", "executive summary", "profile summary", "qualifications summary",
        "career focus", "career profile", "personal profile", "statement of purpose"
    ],
    "WorkExperience": [
        "experience", "work experience", "professional experience", "relevant experience", "employment",
        "employment history", "work history", "history", "career history", "practical experience",
        "professional background", "relevant work experience", "work & experience", "work and experience",
        "professional work experience", "employment background", "industry experience", "technical experience",
        "field experience", "additional experience", "other experience", "research experience", "teaching experience"
    ],
    "Internships": [
        "internship", "internships", "internship experience", "on the job training", "ojt",
        "practicum", "apprentice", "apprenticeship"
    ],
    "Education": [
        "education", "educational background", "academic background", "academic history",
        "academic formation", "education & qualifications", "education and qualifications",
        "academic qualifications", "academic profile", "educational qualifications", "academic credentials",
        "degrees", "degrees and certifications", "education and training"
    ],
    "RelevantCoursework": [
        "relevant coursework", "coursework", "relevant courses", "academic coursework", "subjects",
        "selected coursework", "key coursework", "major coursework", "related courses", "related coursework"
    ],
    "Skills": [
        "skills", "technical skills", "core skills", "competencies", "core competencies", "capabilities",
        "technical competencies", "areas of expertise", "technical proficiencies",
        "skills & proficiencies", "skills and proficiencies", "key skills", "specializations",
        "hard skills", "tools & technologies", "tools and technologies", "tech stack",
        "technologies", "skills & tools", "skills & competencies", "programming languages",
        "frameworks & libraries", "databases & cloud", "developer tools",
        "core strengths", "strengths", "key strengths", "technical strengths",
        "skills and abilities", "skills & abilities", "skills and qualifications", "skills & qualifications",
        "skills and competencies", "skills & competencies", "skills and expertise", "skills & expertise",
        "technical expertise", "technical background", "professional skills", "it skills",
        "software skills", "computer skills", "technical knowledge", "skills & interests", "skills and interests"
    ],
    "Projects": [
        "projects", "academic projects", "personal projects", "project experience", "relevant projects",
        "technical projects", "selected projects", "capstone", "capstone project", "undergraduate thesis",
        "thesis", "key projects", "featured projects", "systems developed", "course projects", "class projects",
        "software projects", "web projects", "development projects", "practical projects", "independent projects",
        "notable projects", "applications developed", "portfolio"
    ],
    "Certifications": [
        "certifications", "certificates", "licenses and certifications", "credentials", "professional certifications",
        "certifications & trainings", "trainings and certifications", "certifications and licenses",
        "courses & certifications", "licenses & certifications", "certificates & licenses", "licenses",
        "professional licenses", "certifications and courses", "certified skills"
    ],
    "OrganizationsLeadership": [
        "organizations", "leadership", "organizations & leadership", "organizations and leadership",
        "extracurricular activities", "student organizations", "affiliations", "leadership experience",
        "volunteering", "volunteer experience", "community involvement", "leadership & activities",
        "leadership and activities", "activities & leadership", "activities and leadership",
        "leadership & involvement", "leadership and involvement", "campus involvement", "campus activities",
        "co-curricular activities", "cocurricular activities", "activities", "student activities",
        "community service", "volunteer work"
    ],
    "Achievements": [
        "achievements", "awards", "honors", "accomplishments", "honors & awards", "honors and awards",
        "awards & recognition", "awards and recognition", "awards & honors", "awards and honors",
        "academic honors", "academic awards", "distinctions", "recognitions", "awards & recognitions",
        "scholarships", "scholarships & awards", "scholarships and awards"
    ],
    "Languages": [
        "languages", "language proficiency", "language skills", "languages spoken", "foreign languages"
    ],
    "Trainings": [
        "trainings", "training", "seminars", "workshops", "professional development",
        "trainings & seminars", "seminars & workshops", "seminars and workshops",
        "workshops & seminars", "trainings and workshops"
    ],
    "Publications": [
        "publications", "research publications", "papers", "published works", "presentations", "conference presentations"
    ],
    "References": [
        "references", "character references", "academic references", "professional references"
    ]
}

SKILL_SUBCATEGORY_PREFIXES = [
    "programming languages", "programming", "languages", "frameworks", "libraries", "frameworks & libraries",
    "frameworks & tools", "frameworks/tools", "frameworks & platforms", "frameworks/platforms",
    "databases", "databases & cloud", "databases/cloud", "data & tools", "data/tools",
    "cloud", "tools", "developer tools", "tools & platforms", "tools & technologies",
    "ai/ml", "ai & ml", "ai", "ml", "aiml", "artificial intelligence", "machine learning",
    "devops", "platforms", "technologies", "methodologies", "core competencies", "languages & technologies"
]

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

def _detect_section_heading(line: str, current_key: str = None) -> str:
    stripped = line.replace('\u200b', '').replace('\ufeff', '').strip()
    has_colon = ":" in stripped
    header_part = stripped.split(":", 1)[0].strip() if has_colon else stripped
    body_part = stripped.split(":", 1)[1].strip() if has_colon else ""
    header_lower = header_part.lower()

    # If already inside Skills section, subcategories like "Languages:", "Frameworks:", "AI/ML:" stay in Skills
    if current_key == "Skills":
        clean_sub = re.sub(r'[^a-z0-9\s\&]', '', header_lower).strip()
        if any(clean_sub == sub or clean_sub.startswith(sub) for sub in SKILL_SUBCATEGORY_PREFIXES):
            return "Skills"
        clean_sub_slash = re.sub(r'[^a-z0-9\s\&\/]', '', header_lower).strip()
        if any(clean_sub_slash == sub or clean_sub_slash.startswith(sub) for sub in SKILL_SUBCATEGORY_PREFIXES):
            return "Skills"

    norm = _normalize_heading(header_part)
    if norm in NORMALIZED_ALIASES:
        return NORMALIZED_ALIASES[norm]

    full_norm = _normalize_heading(stripped)
    if full_norm in NORMALIZED_ALIASES:
        return NORMALIZED_ALIASES[full_norm]

    # If there is content after the colon, this is an entry item, NOT a top-level section heading!
    if has_colon and len(body_part) > 0:
        return None

    # If already inside experience, projects, or education, do not let item titles create Custom_ sections!
    if current_key in ("Projects", "WorkExperience", "Internships", "Education"):
        return None

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

    text = text.replace('\u200b', '').replace('\ufeff', '')
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

        heading = _detect_section_heading(line, current_key)
        if heading and heading.startswith("Custom_") and i < 5:
            heading = None

        if heading:
            # If subcategory detected while already in Skills, treat line as Skills content
            if heading == "Skills" and current_key == "Skills":
                sections.setdefault("Skills", []).append(line)
                continue

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

    result = {k: "\n".join(v) for k, v in sections.items() if v}
    # Always preserve the complete authoritative raw text for grounding validation
    result["raw_text"] = text
    return result
