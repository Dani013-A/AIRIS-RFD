import re
from typing import Dict, List, Any
from pydantic import BaseModel

class EvidenceChunk(BaseModel):
    chunkId: str
    section: str
    text: str
    sourceOrder: int
    wordCount: int

BULLET_PREFIX_REGEX = r'^[\s\-\*•\u25cf\u2022\u25aa\u25fe\u25aa\u2013\u2014]+'
NUMBERED_PREFIX_REGEX = r'^\s*(?:\d+[\.\)]|[a-zA-Z][\.\)]|\[\d+\])\s+'

def _is_bullet_start(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if re.match(BULLET_PREFIX_REGEX, stripped):
        return True
    if re.match(NUMBERED_PREFIX_REGEX, stripped):
        return True
    return False

def _is_header_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    # If a line contains multiple pipes (e.g. "Python | Java | SQL | React"), it is a pipe-delimited skill list, not a single job header line
    if stripped.count(" | ") > 1 or stripped.count("|") > 1:
        return False
    # Pipe or dash separated header (e.g., "Software Developer | ABC Corp" or "Software Engineer — TechCorp (2024-2026)")
    has_dash_separator = any(sep in stripped for sep in [" | ", " — ", " – ", " - "])
    has_date_range = bool(re.search(r'\b(19|20)\d{2}\b', stripped))
    if has_dash_separator or (has_date_range and len(stripped) < 80):
        return True
    # Project / entry titles like "ProjectName: Subtitle" or "ProjectName (Context)"
    if ":" in stripped and not stripped.endswith((".", ";", ",")):
        prefix = stripped.split(":", 1)[0].strip()
        if len(prefix) <= 35 and not any(p in prefix.lower() for p in ["http", "https", "note"]):
            return True
    # Short uppercase or titlecase header line (< 65 chars without ending punctuation)
    if len(stripped) < 65 and not stripped.endswith((".", ";", ",")):
        if stripped.isupper() or stripped.istitle():
            return True
    return False

def _strip_bullet_prefix(text: str) -> str:
    stripped = text.strip()
    clean = re.sub(BULLET_PREFIX_REGEX, '', stripped).strip()
    clean = re.sub(NUMBERED_PREFIX_REGEX, '', clean).strip()
    return clean if clean else stripped

def reassemble_lines(raw_lines: List[str]) -> List[str]:
    """
    Intelligently re-assembles PDF line-wrapped continuation lines into unified
    evidence units while keeping separate bullets, headers, and distinct lines separate.
    """
    items: List[str] = []
    current_item: List[str] = []
    current_is_bullet = False

    for line in raw_lines:
        stripped = line.strip()
        if not stripped:
            if current_item:
                items.append(" ".join(current_item))
                current_item = []
                current_is_bullet = False
            continue

        is_bullet = _is_bullet_start(stripped)
        is_header = _is_header_line(stripped)

        if is_bullet:
            if current_item:
                items.append(" ".join(current_item))
            current_item = [stripped]
            current_is_bullet = True
        elif is_header:
            if current_item:
                items.append(" ".join(current_item))
            current_item = [stripped]
            current_is_bullet = False
        else:
            # Continuation line logic
            if current_item and current_is_bullet:
                # Continuation of a multiline bullet point
                current_item.append(stripped)
            elif current_item and not _is_header_line(current_item[0]) and len(current_item[0]) > 20:
                # Continuation of a paragraph or description
                current_item.append(stripped)
            else:
                if current_item:
                    items.append(" ".join(current_item))
                current_item = [stripped]
                current_is_bullet = False

    if current_item:
        items.append(" ".join(current_item))

    return items

def chunk_resume_evidence(parsed_sections: Dict[str, str]) -> List[EvidenceChunk]:
    """
    Converts parsed section dictionary into indexed, traceable evidence chunks with metadata.
    Preserves section boundaries, source ordering, and individual line/bullet unit boundaries.
    """
    if not parsed_sections:
        return []

    chunks: List[EvidenceChunk] = []
    source_order = 1
    seen = set()

    for section_name, content in parsed_sections.items():
        if section_name in {"raw_text", "rawText"}:
            continue
        clean_content = (content or "").strip()
        if not clean_content:
            continue

        raw_lines = clean_content.splitlines()
        reassembled_items = reassemble_lines(raw_lines)
        section_alias = re.sub(r'[^a-zA-Z0-9]', '', section_name).lower() or "general"

        for item_text in reassembled_items:
            clean_line_text = _strip_bullet_prefix(item_text)
            words = clean_line_text.split()
            word_count = len(words)
            key = (section_name, " ".join(clean_line_text.casefold().split()))
            if word_count == 0 or key in seen:
                continue
            seen.add(key)

            chunk_id = f"chunk_{section_alias}_{source_order:03d}"
            chunks.append(EvidenceChunk(
                chunkId=chunk_id,
                section=section_name,
                text=clean_line_text,
                sourceOrder=source_order,
                wordCount=word_count
            ))
            source_order += 1

    return chunks
