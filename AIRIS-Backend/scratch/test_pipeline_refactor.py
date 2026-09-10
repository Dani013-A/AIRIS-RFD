import os
import re
from typing import List, Dict, Any, Set
from dotenv import load_dotenv
load_dotenv('.env')

from file_utils import extract_text_from_pdf, normalize_ocr_text
from resume_parser import parse_resume
from ai_service import is_skill_grounded_in_text, _format_skill_display_name, CANONICAL_SKILL_MAP, CANONICAL_SKILL_ALIASES
import pytesseract
from PIL import Image

ACTION_VERB_PREFIXES = (
    "developed", "implemented", "automated", "designed", "deployed",
    "managed", "created", "built", "integrated", "engineered", "led",
    "conducted", "maintained", "configured", "optimized", "collaborated",
    "spearheaded", "assisted", "prepared", "analyzed", "coordinated",
    "provisioned", "performed", "established", "used", "worked", "utilized",
    "leveraged", "applied", "handled", "facilitated", "participated"
)

TECH_INTRO_REGEX = re.compile(
    r'(?i)\b(?:using|utilizing|utilized|leveraging|leveraged|built\s+(?:with|using)|developed\s+(?:with|using)|'
    r'implemented\s+(?:using|with)|designed\s+(?:using|with)|integrated|worked\s+with|used|deployed\s+to|'
    r'proficient\s+in|skilled\s+in|experience\s+with|hands-on\s+with|technologies?:?|tools?:?)\s+([^;\.\n]+)'
)

TRAILING_CONTEXT_REGEX = re.compile(
    r'(?i)\s+(?:for|to|as|while|so\s+that|connecting|including|such\s+as)\s+.*$'
)

GENERIC_DISCARD_PHRASES = {
    "developer", "database developer", "software developer", "engineer",
    "software engineer", "intern", "student", "expected graduation",
    "bachelor of science", "technological institute", "university",
    "manila", "philippines"
}

def clean_ocr(text: str) -> str:
    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        stripped = re.sub(r'^[|I▪•\-*·°o~]\s+', '• ', stripped)
        stripped = re.sub(r'^[eE]\s+(?=[A-Z][a-z])', '• ', stripped)
        lines.append(stripped)
    return "\n".join(lines)

def sanitize_candidate(token: str) -> List[str]:
    if not token:
        return []
    t = re.sub(r'^[^\w#\+]+|[^\w#\+\.]+$', '', token.strip())
    t = re.sub(r'\.+$', '', t).strip()

    # Strip leading action verbs / prepositions
    prefix_pattern = r'^(?:(?:and|or|with|using|via|in|for|by|to|as|built\s+(?:with|using)|developed\s+(?:with|using)|implemented\s+(?:using|with)|created\s+(?:with|using)|designed\s+(?:using|with)|integrated|automated|deployed|managed|engineered|worked\s+with|worked|used|utilized|leveraged|proficient\s+in|skilled\s+in|experience\s+with|experienced\s+(?:with|in)|hands-on\s+with)\s+)+'
    t = re.sub(prefix_pattern, '', t, flags=re.IGNORECASE).strip()

    # Strip trailing purpose / context / generic category qualifiers
    suffix_pattern = r'\s+(?:for\s+.*|to\s+.*|as\s+.*|while\s+.*|so\s+that\s+.*|connecting\s+.*|including\s+.*|such\s+as\s+.*|and|or|with|using|etc|and\s+more|LLM\s+APIs?|APIs?|databases?|database\s+structures?|database\s+design|frameworks?|libraries|library|tools?|technologies|technology|solutions|pipelines?|systems?)$'
    t = re.sub(suffix_pattern, '', t, flags=re.IGNORECASE).strip()
    t = re.sub(r'^[^\w#\+]+|[^\w#\+]+$', '', t).strip()

    if not t or len(t) < 2 or len(t) > 35:
        return []

    if t.lower() in GENERIC_DISCARD_PHRASES:
        return []

    sub_parts = re.split(r'\s+(?:and|\/|&)\s+', t, flags=re.IGNORECASE)
    res = []
    for sp in sub_parts:
        c = re.sub(r'^[^\w#\+]+|[^\w#\+]+$', '', sp).strip()
        if 2 <= len(c) <= 35 and c.lower() not in GENERIC_DISCARD_PHRASES:
            res.append(c)
    return res

def test_extract_authoritative(full_text: str, parsed_sections: Dict[str, Any]) -> List[str]:
    candidate_proposals = set()

    # 1. Structured skill sections
    skill_section_keys = [
        "Skills", "Technical Skills", "Technologies", "Tech Stack",
        "Tools & Technologies", "Frameworks & Libraries", "Certifications", "Languages"
    ]
    for key in skill_section_keys:
        sec_val = parsed_sections.get(key, "")
        if not sec_val or not isinstance(sec_val, str):
            continue
        for line in sec_val.splitlines():
            line_str = line.strip()
            if not line_str:
                continue
            if ":" in line_str:
                line_str = line_str.split(":", 1)[1].strip()
            items = re.split(r'[,;•|\n]+|\s+[\/\\]\s+', line_str)
            for item in items:
                for clean_item in sanitize_candidate(item):
                    candidate_proposals.add(clean_item)

    # 2. Bullet / line lists from full text
    for line in full_text.splitlines():
        line_s = line.strip()
        if not line_s:
            continue
        is_bullet = any(line_s.startswith(bullet) for bullet in ["•", "-", "*", "·", "▪", "▫", ">"])
        stripped_bullet = re.sub(r'^[•\-\*·▪▫°o~>\s]+', '', line_s).strip()
        if ":" in stripped_bullet and len(stripped_bullet.split(":", 1)[0]) < 25:
            stripped_bullet = stripped_bullet.split(":", 1)[1].strip()

        first_word = stripped_bullet.split()[0].lower() if stripped_bullet.split() else ""
        first_word = re.sub(r'[^\w]', '', first_word)
        is_action_bullet = is_bullet or (first_word in ACTION_VERB_PREFIXES and len(line_s.split()) >= 3)

        if is_action_bullet:
            matches = TECH_INTRO_REGEX.findall(stripped_bullet)
            for m in matches:
                m_clean = TRAILING_CONTEXT_REGEX.sub('', m).strip()
                for token in re.split(r'[,;•|]+|\s+and\s+', m_clean):
                    for clean_part in sanitize_candidate(token):
                        candidate_proposals.add(clean_part)
        elif is_bullet:
            for part in re.split(r'[,;•|]+|\s+[\/\\]\s+', stripped_bullet):
                for clean_part in sanitize_candidate(part):
                    candidate_proposals.add(clean_part)

    # 3. Deterministic Evidence Gate
    accepted_skills = []
    seen_canonical = set()

    for candidate in sorted(candidate_proposals, key=lambda x: -len(x)):
        clean_cand = candidate.strip()
        if not clean_cand or len(clean_cand) < 2:
            continue
        if is_skill_grounded_in_text(clean_cand, full_text):
            display_name = _format_skill_display_name(clean_cand)
            key = display_name.lower()
            if key not in seen_canonical:
                seen_canonical.add(key)
                is_subsumed = False
                for accepted in accepted_skills:
                    if key == accepted.lower():
                        is_subsumed = True
                        break
                if not is_subsumed:
                    accepted_skills.append(display_name)

    return sorted(accepted_skills)

# Run on PDF
with open('/Users/danieltan/Desktop/Sample Resume/IT Resume.pdf', 'rb') as f:
    pdf_text = clean_ocr(extract_text_from_pdf(f.read()))
pdf_sec = parse_resume(pdf_text)
pdf_res = test_extract_authoritative(pdf_text, pdf_sec)

# Run on PNG via Tesseract
img = Image.open('/Users/danieltan/Desktop/Sample Resume/IT Resume PIC.png')
png_text = clean_ocr(pytesseract.image_to_string(img))
png_sec = parse_resume(png_text)
png_res = test_extract_authoritative(png_text, png_sec)

print(f"PDF count: {len(pdf_res)}")
print("PDF skills:", pdf_res)

print(f"\nPNG count: {len(png_res)}")
print("PNG skills:", png_res)

pdf_s = set(pdf_res)
png_s = set(png_res)

print("\nCommon ({}):".format(len(pdf_s.intersection(png_s))))
print(sorted(pdf_s.intersection(png_s)))

print("\nPDF only:", sorted(pdf_s - png_s))
print("\nPNG only:", sorted(png_s - pdf_s))
