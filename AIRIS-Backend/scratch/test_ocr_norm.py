import re
from typing import List, Dict, Any

ACTION_VERB_PREFIXES = (
    "developed", "implemented", "automated", "designed", "deployed",
    "managed", "created", "built", "integrated", "engineered", "led",
    "conducted", "maintained", "configured", "optimized", "collaborated",
    "spearheaded", "assisted", "prepared", "analyzed", "coordinated",
    "provisioned", "performed", "established", "used", "worked", "utilized",
    "leveraged", "applied", "handled", "facilitated", "participated"
)

def test_normalization(text: str) -> str:
    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        # Convert OCR symbol artifacts into bullets
        stripped = re.sub(r'^[|I▪•\-*·°o~]\s+', '• ', stripped)
        # Convert OCR single-letter misread bullets like "e Developed" or "E Implemented"
        stripped = re.sub(r'^[eE]\s+(?=[A-Z][a-z])', '• ', stripped)
        lines.append(stripped)
    return "\n".join(lines)

print("Test script written successfully")
