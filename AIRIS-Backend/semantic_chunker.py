import re
from typing import Dict, List, Any

def chunk_resume_sections(parsed_sections: Dict[str, str]) -> List[Dict[str, Any]]:
    """
    Takes a dictionary of parsed resume sections and breaks them down into
    semantic chunks (bullet points, short paragraphs).
    Returns a list of dicts containing the chunk text and its source section.
    """
    chunks = []
    
    for section_name, content in parsed_sections.items():
        if not content or not content.strip():
            continue
            
        # Don't chunk contact info or summary too aggressively
        if section_name in ["ContactInformation", "ProfessionalSummary"]:
            chunks.append({
                "section": section_name,
                "text": content.strip()
            })
            continue
            
        # For experience, projects, skills, split by common bullet characters or double newlines
        # Common bullet points: -, *, •, >, ➢, etc.
        lines = content.splitlines()
        current_chunk = []
        
        for line in lines:
            line_stripped = line.strip()
            if not line_stripped:
                if current_chunk:
                    chunks.append({
                        "section": section_name,
                        "text": " ".join(current_chunk).strip()
                    })
                    current_chunk = []
                continue
                
            # If it starts with a bullet point
            if re.match(r'^[-*•>➢]\s+', line_stripped):
                if current_chunk:
                    chunks.append({
                        "section": section_name,
                        "text": " ".join(current_chunk).strip()
                    })
                current_chunk = [re.sub(r'^[-*•>➢]\s+', '', line_stripped)]
            # If it looks like a date range or title (e.g. "Software Engineer | 2020 - 2022")
            elif re.search(r'(19|20)\d{2}\s*[-–to]+', line_stripped) or '|' in line_stripped:
                if current_chunk:
                    chunks.append({
                        "section": section_name,
                        "text": " ".join(current_chunk).strip()
                    })
                current_chunk = [line_stripped]
            else:
                # If skills section, we might want to split by commas if it's a long comma separated list
                if section_name == "Skills" and "," in line_stripped and len(line_stripped.split(",")) > 3:
                    if current_chunk:
                        chunks.append({
                            "section": section_name,
                            "text": " ".join(current_chunk).strip()
                        })
                        current_chunk = []
                    
                    skill_parts = [s.strip() for s in line_stripped.split(",") if s.strip()]
                    for sp in skill_parts:
                        chunks.append({"section": section_name, "text": sp})
                    continue
                    
                current_chunk.append(line_stripped)
                
        if current_chunk:
            chunks.append({
                "section": section_name,
                "text": " ".join(current_chunk).strip()
            })
            
    # Filter out empty or very short chunks (e.g., just a single char)
    valid_chunks = []
    for c in chunks:
        if len(c["text"]) > 1:
            valid_chunks.append(c)
            
    return valid_chunks
