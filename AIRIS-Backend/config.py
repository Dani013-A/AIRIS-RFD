import os

# Configuration defaults – can be overridden via environment variables
SBERT_MODEL = os.getenv("SBERT_MODEL", "all-MiniLM-L6-v2")
SBERT_DEVICE = os.getenv("SBERT_DEVICE", "cpu")  # "cpu" is safe default

# Similarity threshold for semantic career resolution (initial placeholder)
SBERT_MATCH_THRESHOLD = float(os.getenv("SBERT_MATCH_THRESHOLD", "0.82"))

# Weighting for the four evaluation criteria (must sum to 1.0)
WEIGHT_SKILLS = 0.40
WEIGHT_EXPERIENCE = 0.30
WEIGHT_EDUCATION = 0.20
WEIGHT_CERTIFICATIONS = 0.10
