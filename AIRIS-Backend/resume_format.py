"""Deterministic AIRIS resume-format assessment; independent of scoring and AI validity."""

import re
from pathlib import Path

SPECIFICATION_VERSION = "airis-resume-v1"
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_EXTRACTED_CHARACTERS = 100_000
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".rtf", ".txt", ".png", ".jpg", ".jpeg", ".webp", ".heic"}
_MIME_TYPES = {
    ".pdf": {"application/pdf"},
    ".docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip"},
    ".rtf": {"application/rtf", "text/rtf"},
    ".txt": {"text/plain"},
    ".png": {"image/png"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".webp": {"image/webp"},
    ".heic": {"image/heic", "image/heif"},
}
_PLACEHOLDERS = (
    r"\byour name\b", r"your\.email@example\.com", r"\+63 9xx", r"\binstitution name\b",
    r"\bdegree program\b", r"\btarget position\b", r"\[list ", r"\[describe ",
    r"\[project title\]", r"\[internship, work, or relevant activity\]",
    r"\bgraduating degree program student\b",
)
_CONTACT = re.compile(r"[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\d\s().-]{8,}\d)|(?:linkedin|github)\.com/", re.I)
_NAME_EXCLUSIONS = {"professional summary", "summary", "education", "skills", "projects", "experience", "contact", "contact information"}


def _result(outcome, codes=(), missing=(), unrecognized=(), unrecovered=()):
    messages = {
        "UNREADABLE": "Unable to extract readable text from this document.",
        "PLACEHOLDER_ONLY": "The document still contains the AIRIS template examples rather than candidate information.",
        "MISSING_NAME": "A candidate name could not be recovered near the beginning of the resume.",
        "MISSING_CONTACT": "A usable email, phone number, or profile link could not be recovered.",
        "MISSING_EDUCATION": "An Education section with candidate information could not be recovered.",
        "MISSING_SKILLS": "A Skills section with candidate information could not be recovered.",
        "MISSING_EXPERIENCE_EVIDENCE": "No populated project, experience, internship, or leadership section was recovered.",
        "NON_PDF": "This readable file is accepted, but the AIRIS standard is a text-based PDF.",
        "SCANNED_PDF": "This PDF required OCR; extraction may omit or reorder text.",
        "COMPLEX_LAYOUT": "Columns, tables, or header/footer content may be extracted out of order.",
        "UNRECOGNIZED_SECTIONS": "Some section headings were not recognized by AIRIS.",
        "EXTENSION_MISMATCH": "The file extension does not match its declared type or content.",
        "FILE_TOO_LARGE": "The file exceeds the 15 MiB processing limit.",
        "TEXT_TOO_LARGE": "The extracted text exceeds the 100,000-character processing limit.",
        "PAGE_LIMIT": "The resume exceeds the three-page limit.",
        "UNSUPPORTED_TYPE": "This file type is not supported.",
        "INVALID_DOCUMENT": "The document could not be opened or is protected.",
        "INSUFFICIENT_CONTENT": "There is not enough actual candidate information to analyze reliably.",
    }
    codes = list(dict.fromkeys(codes))
    return {
        "outcome": outcome,
        "specificationVersion": SPECIFICATION_VERSION,
        "reasonCodes": codes,
        "reasons": [messages[code] for code in codes],
        "missingSections": list(missing),
        "unrecognizedSections": list(unrecognized),
        "unrecoveredInformation": list(unrecovered),
        "remediation": (
            "Download the AIRIS Standard Resume Template, replace every example with your own information, "
            "and export a selectable-text PDF before retrying."
        ) if outcome != "SUPPORTED" else "No format changes required.",
        "canProceed": outcome != "BLOCKED",
        "templateId": "airis_standard",
    }


def blocked(code):
    return _result("BLOCKED", [code])


def validate_file_type(filename: str, content_type: str, content: bytes):
    extension = Path(filename).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        return blocked("UNSUPPORTED_TYPE")
    mime = (content_type or "").split(";", 1)[0].strip().lower()
    if mime and mime not in {"application/octet-stream", "binary/octet-stream"} and mime not in _MIME_TYPES[extension]:
        return blocked("EXTENSION_MISMATCH")
    signatures = {
        ".pdf": content.startswith(b"%PDF-"),
        ".docx": content.startswith(b"PK\x03\x04"),
        ".rtf": content.startswith(b"{\\rtf"),
        ".png": content.startswith(b"\x89PNG\r\n\x1a\n"),
        ".jpg": content.startswith(b"\xff\xd8\xff"),
        ".jpeg": content.startswith(b"\xff\xd8\xff"),
        ".webp": content.startswith(b"RIFF") and content[8:12] == b"WEBP",
        ".heic": content[4:8] == b"ftyp" and b"hei" in content[8:16],
        ".txt": b"\x00" not in content[:4096],
    }
    if extension == ".txt" and not signatures[extension]:
        return blocked("UNREADABLE")
    if not signatures[extension]:
        return blocked("EXTENSION_MISMATCH")
    return None


def inspect_document_layout(filename: str, content: bytes):
    """Return extraction-risk flags, or a blocked assessment for invalid containers."""
    extension = Path(filename).suffix.lower()
    if extension == ".pdf":
        try:
            import fitz
            document = fitz.open(stream=content, filetype="pdf")
            if document.is_encrypted or not document.page_count:
                return {}, blocked("INVALID_DOCUMENT")
            scanned = False
            columns = False
            for page in document:
                blocks = [b for b in page.get_text("blocks") if len(b) >= 5 and str(b[4]).strip()]
                if len(page.get_text().strip()) < 30 and page.get_images():
                    scanned = True
                # Side-by-side substantial text blocks with overlapping vertical spans.
                for index, left in enumerate(blocks):
                    for right in blocks[index + 1:]:
                        if (len(str(left[4]).strip()) > 35 and len(str(right[4]).strip()) > 35
                                and left[2] < right[0] and min(left[3], right[3]) - max(left[1], right[1]) > 12):
                            columns = True
            return {"scanned": scanned, "complex_layout": columns}, None
        except Exception:
            return {}, blocked("INVALID_DOCUMENT")
    if extension == ".docx":
        try:
            from io import BytesIO
            from zipfile import ZipFile
            from docx import Document
            with ZipFile(BytesIO(content)) as archive:
                if len(archive.infolist()) > 1000 or sum(info.file_size for info in archive.infolist()) > 50 * 1024 * 1024:
                    return {}, blocked("FILE_TOO_LARGE")
            document = Document(BytesIO(content))
            has_header_footer = any(
                any(p.text.strip() for p in part.paragraphs)
                for section in document.sections for part in (section.header, section.footer)
            )
            return {"complex_layout": bool(document.tables) or has_header_footer}, None
        except Exception:
            return {}, blocked("INVALID_DOCUMENT")
    return {}, None


def assess_resume_format(raw_text: str, sections: dict, filename: str, *, scanned=False, complex_layout=False):
    if not raw_text or len(raw_text.strip()) < 30:
        return blocked("UNREADABLE")
    if len(raw_text) > MAX_EXTRACTED_CHARACTERS:
        return blocked("TEXT_TOO_LARGE")

    def meaningful(value):
        clean = "\n".join(
            line for line in (value or "").splitlines()
            if not any(re.search(phrase, line, re.I) for phrase in _PLACEHOLDERS)
        )
        clean = re.sub(r"\[[^\]]{1,120}\]", "", clean)
        clean = re.sub(r"\b(?:Month Year|City, Philippines|Expected Graduation)\b", "", clean, flags=re.I)
        clean = re.sub(r"[^\w\s]", " ", clean, flags=re.UNICODE)
        return len(re.findall(r"[^\W\d_]{2,}", clean, flags=re.UNICODE)) >= 2

    content_sections = {key: value for key, value in sections.items() if key != "raw_text" and meaningful(value)}
    from resume_parser import NORMALIZED_ALIASES, _normalize_heading
    first_lines = []
    for line in raw_text.splitlines()[:8]:
        candidate = line.strip()
        if not candidate:
            continue
        normalized = _normalize_heading(candidate)
        if normalized in NORMALIZED_ALIASES:
            if NORMALIZED_ALIASES[normalized] == "ContactInformation":
                continue
            break
        first_lines.append(candidate.split("|", 1)[0].strip())
    name = any(
        2 <= len(line.split()) <= 6 and len(line) <= 80
        and line.lower() not in _NAME_EXCLUSIONS
        and not _CONTACT.search(line)
        and not any(re.search(phrase, line, re.I) for phrase in _PLACEHOLDERS)
        and not line.startswith(("#", "["))
        and not re.search(r"\b(?:city|philippines|phone|email|location)\b", line, re.I)
        for line in first_lines
    )
    contact = bool(_CONTACT.search(raw_text)) and not bool(re.search(r"your\.email@example\.com", raw_text, re.I) and len(_CONTACT.findall(raw_text)) == 1)
    evidence_keys = ("Projects", "WorkExperience", "Internships", "OrganizationsLeadership")
    core_present = [key for key in ("Education", "Skills") if key in content_sections]
    evidence_present = any(key in content_sections for key in evidence_keys)
    placeholder_count = sum(bool(re.search(phrase, raw_text, re.I)) for phrase in _PLACEHOLDERS)
    if placeholder_count >= 5 or (placeholder_count >= 3 and len(core_present) < 2 and not evidence_present):
        return blocked("PLACEHOLDER_ONLY")
    if not core_present and not evidence_present:
        return blocked("INSUFFICIENT_CONTENT")

    missing = [key for key in ("Education", "Skills") if key not in content_sections]
    if not evidence_present:
        missing.append("Projects or Experience")
    unrecovered = []
    codes = []
    if not name:
        codes.append("MISSING_NAME")
        unrecovered.append("candidate name")
    if not contact:
        codes.append("MISSING_CONTACT")
        unrecovered.append("contact details")
    for section in missing:
        codes.append("MISSING_EXPERIENCE_EVIDENCE" if section == "Projects or Experience" else f"MISSING_{section.upper()}")
        unrecovered.append(section.lower())
    unrecognized = [key.removeprefix("Custom_") for key in sections if key.startswith("Custom_")]
    for line in raw_text.splitlines():
        heading = line.strip()
        if (heading.isupper() and 2 <= len(heading) <= 50 and len(heading.split()) <= 4
                and _normalize_heading(heading) not in NORMALIZED_ALIASES
                and heading not in unrecognized and not any(char.isdigit() for char in heading)):
            unrecognized.append(heading)
    if unrecognized:
        codes.append("UNRECOGNIZED_SECTIONS")
    if Path(filename).suffix.lower() != ".pdf":
        codes.append("NON_PDF")
    if scanned:
        codes.append("SCANNED_PDF")
    if complex_layout:
        codes.append("COMPLEX_LAYOUT")
    return _result("WARNING" if codes else "SUPPORTED", codes, missing, unrecognized, unrecovered)
