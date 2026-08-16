import re
from typing import Dict, List

# Enhanced resume parser to extract sections from plain-text resumes.
# Handles explicit headings and "Keyword: value" patterns, plus contact heuristics.

HEADING_MAP: List[tuple[re.Pattern, str]] = [
    (re.compile(r"^contact\s*information$", re.IGNORECASE), "ContactInformation"),
    (re.compile(r"^professional\s*summary$", re.IGNORECASE), "ProfessionalSummary"),
    (re.compile(r"^summary$", re.IGNORECASE), "ProfessionalSummary"),
    (re.compile(r"^education$", re.IGNORECASE), "Education"),
    (re.compile(r"^skills?$", re.IGNORECASE), "Skills"),
    (re.compile(r"^work\s*experience$", re.IGNORECASE), "WorkExperience"),
    (re.compile(r"^experience$", re.IGNORECASE), "WorkExperience"),
    (re.compile(r"^projects?$", re.IGNORECASE), "Projects"),
    (re.compile(r"^certifications?$", re.IGNORECASE), "Certifications"),
]

KEYWORD_MAP: List[tuple[re.Pattern, str]] = [
    (re.compile(r"^contact[:\s]", re.IGNORECASE), "ContactInformation"),
    (re.compile(r"^email[:\s]", re.IGNORECASE), "ContactInformation"),
    (re.compile(r"^phone[:\s]", re.IGNORECASE), "ContactInformation"),
    (re.compile(r"^education[:\s]", re.IGNORECASE), "Education"),
    (re.compile(r"^skills?[:\s]", re.IGNORECASE), "Skills"),
    (re.compile(r"^experience[:\s]", re.IGNORECASE), "WorkExperience"),
    (re.compile(r"^projects?[:\s]", re.IGNORECASE), "Projects"),
    (re.compile(r"^certifications?[:\s]", re.IGNORECASE), "Certifications"),
]

EMAIL_REGEX = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}")
PHONE_REGEX = re.compile(r"\\b(?:\\+?\\d{1,3}[\\s-]?)?(?:\\(\\d{3}\\)|\\d{3})[\\s-]?\d{3}[\\s-]?\d{4}\\b")

def _detect_section_heading(line: str) -> str | None:
    stripped = line.strip()
    for pattern, name in HEADING_MAP:
        if pattern.fullmatch(stripped):
            return name
    return None

def _detect_keyword_section(line: str) -> str | None:
    for pattern, name in KEYWORD_MAP:
        if pattern.match(line):
            return name
    return None

def _is_contact_line(line: str) -> bool:
    return bool(EMAIL_REGEX.search(line) or PHONE_REGEX.search(line))

def parse_resume(text: str) -> Dict[str, str]:
    if not text:
        return {}
    sections: Dict[str, List[str]] = {}
    current_key: str | None = None
    for raw_line in text.splitlines():
        heading = _detect_section_heading(raw_line)
        if heading:
            current_key = heading
            sections.setdefault(current_key, [])
            continue
        keyword = _detect_keyword_section(raw_line)
        if keyword:
            _, _, remainder = raw_line.partition(":")
            current_key = keyword
            sections.setdefault(current_key, []).append(remainder.strip())
            continue
        if current_key is None and _is_contact_line(raw_line):
            current_key = "ContactInformation"
            sections.setdefault(current_key, []).append(raw_line.strip())
            continue
        if current_key is None:
            current_key = "Content"
            sections.setdefault(current_key, [])
        sections[current_key].append(raw_line.rstrip())
    return {k: "\n".join(v).strip() for k, v in sections.items() if v}
