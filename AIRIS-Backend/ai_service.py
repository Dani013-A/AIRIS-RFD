import os
import time
import requests
import json
import re
import concurrent.futures
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
import google.generativeai as genai

import concurrent.futures

import atexit

# Bounded, application-level ThreadPoolExecutor for Gemini SDK operations requiring explicit timeout control
_gemini_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=4,
    thread_name_prefix="gemini_worker"
)
atexit.register(_gemini_executor.shutdown, wait=False)

def call_gemini(prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    def _do_call():
        if hasattr(genai, "configure"):
            genai.configure(api_key=api_key)
        gemini_model_name = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
        model = genai.GenerativeModel(gemini_model_name)
        response = model.generate_content(prompt)
        return response.text.strip()

    future = _gemini_executor.submit(_do_call)
    try:
        return future.result(timeout=15.0)
    except concurrent.futures.TimeoutError:
        raise TimeoutError("Gemini API timed out after 15 seconds")

def call_groq(prompt: str) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set")
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "openai/gpt-oss-120b",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2
    }
    res = requests.post(url, headers=headers, json=data, timeout=15.0)
    res.raise_for_status()
    return res.json()["choices"][0]["message"]["content"].strip()

def call_openrouter(prompt: str) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not set")
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "google/gemini-2.5-flash",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2
    }
    res = requests.post(url, headers=headers, json=data, timeout=15.0)
    res.raise_for_status()
    return res.json()["choices"][0]["message"]["content"].strip()

def call_mistral(prompt: str) -> str:
    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        raise ValueError("MISTRAL_API_KEY not set")
    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "mistral-small-latest",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2
    }
    res = requests.post(url, headers=headers, json=data, timeout=15.0)
    res.raise_for_status()
    return res.json()["choices"][0]["message"]["content"].strip()

_provider_cooldown: Dict[str, float] = {}

def generate_text_with_fallback(prompt: str) -> str:
    """
    Attempts to complete a prompt using available providers.
    If no API keys are set, immediately raises RuntimeError to use local SBERT baseline.
    """
    has_mistral = bool(os.getenv("MISTRAL_API_KEY"))
    has_gemini = bool(os.getenv("GEMINI_API_KEY"))
    has_groq = bool(os.getenv("GROQ_API_KEY"))
    has_openrouter = bool(os.getenv("OPENROUTER_API_KEY"))

    if not (has_mistral or has_gemini or has_groq or has_openrouter):
        raise RuntimeError("No AI API keys set. Using local SBERT baseline.")

    providers = []
    if has_groq:
        providers.append(("Groq", call_groq))
    if has_mistral:
        providers.append(("Mistral", call_mistral))
    if has_gemini:
        providers.append(("Gemini", call_gemini))
    if has_openrouter:
        providers.append(("OpenRouter", call_openrouter))

    errors = []
    now = time.time()
    for name, func in providers:
        if name in _provider_cooldown and now < _provider_cooldown[name]:
            continue
        try:
            print(f"Executing provider: {name} ...")
            start_time = time.time()
            res = func(prompt)
            elapsed = time.time() - start_time
            print(f"Provider {name} finished in {elapsed:.2f} seconds.")
            if res:
                return res
        except Exception as e:
            elapsed = time.time() - start_time
            err_msg = f"{name} error after {elapsed:.2f}s: {str(e)}"
            print(err_msg)
            errors.append(err_msg)
            # Circuit breaker: cooldown for 30s on rate-limit, quota, 5xx server errors, or timeouts
            err_lower = err_msg.lower()
            if any(k in err_lower for k in ("429", "402", "quota", "timeout", "timed out", "500", "502", "503", "504", "unavailable")):
                _provider_cooldown[name] = now + 30.0

    raise RuntimeError(f"All AI API providers failed: {'; '.join(errors)}")

import json
import re

def _extract_json(text: str) -> dict | list:
    """Safely extracts JSON from a string that might contain markdown fences."""
    try:
        match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
        if match:
            return json.loads(match.group(1))
        return json.loads(text)
    except Exception:
        return []

def validate_evidence_batch(evidence_batch: list) -> list:
    """
    Takes a list of dicts: [{"concept": "Python", "evidence": "I used AutoCAD"}]
    Returns a list of dicts with classifications.
    If LLM fails, returns an empty list.
    """
    if not evidence_batch:
        return []

    prompt = f"""
    You are an expert technical recruiter performing a strict audit of candidate resumes.
    SBERT found semantic overlap between the target concept and the candidate's text chunk, but SBERT is often easily fooled by loosely related terms (e.g. AutoCAD != Data Visualization, Project Management != SQL).

    TASK: Validating Candidate Evidence
    For each item in the batch below, strictly evaluate if the candidate's text chunk provides DIRECT, MEANINGFUL evidence that they possess the specific target competency.

    RULES:
    1. STRONG_MATCH: The text contains explicit, direct evidence of the exact skill or a highly equivalent direct synonym in the same domain.
    2. PARTIAL_MATCH: The text demonstrates some genuinely transferable aspect or tangential experience, but does NOT directly demonstrate the core competency.
    3. NO_RELEVANT_EVIDENCE: The text is from a different domain entirely, or the semantic overlap is purely coincidental. (e.g., Engineering analysis ≠ Statistical analysis. Technical reports ≠ Data visualization). Do not infer skills that are not supported.

    BATCH TO EVALUATE:
    {json.dumps(evidence_batch, indent=2)}

    OUTPUT FORMAT:
    Respond STRICTLY with a JSON array in the exact same order, containing your classifications. Do not output anything outside the JSON.
    [
      {{
        "concept": "<concept>",
        "classification": "<STRONG_MATCH|PARTIAL_MATCH|NO_RELEVANT_EVIDENCE>",
        "reasoning": "<short sentence explaining why>"
      }}
    ]
    """

    try:
        raw_response = generate_text_with_fallback(prompt)
        extracted_json = _extract_json(raw_response)

        if isinstance(extracted_json, list):
            return extracted_json
        return []
    except Exception as e:
        print(f"Evidence validation failed: {e}")
        return []

_cached_snapshot = None
_cached_time = 0
CACHE_TTL = 3600  # 1 hour

def invalidate_market_cache():
    global _cached_snapshot, _cached_time
    _cached_snapshot = None
    _cached_time = 0

def get_job_market_intelligence() -> str:
    global _cached_snapshot, _cached_time
    current_time = time.time()

    if _cached_snapshot and (current_time - _cached_time < CACHE_TTL):
        return json.dumps(_cached_snapshot)

    try:
        from market_intelligence import get_firestore_client
        db = get_firestore_client()
        if db:
            docs = db.collection("market_intelligence").where("active", "==", True).limit(1).get()
            if docs:
                _cached_snapshot = docs[0].to_dict()
                _cached_time = current_time
                return json.dumps(_cached_snapshot)
    except Exception:
        pass

    try:
        cache_path = os.path.join(os.path.dirname(__file__), "market_intelligence_cache.json")
        with open(cache_path, "r") as f:
            return f.read()
    except Exception as e:
        print(f"Failed to load local market intelligence fallback: {e}")
        return "{}"

def evaluate_intrinsic_resume_strength(parsed_text: str) -> dict:
    """
    Evaluates the intrinsic strength/value of the resume itself, completely separate from Role Relevance.
    Passes cached job-market intelligence to the LLM to determine the actual demand value of the candidate's skills.
    """
    if not parsed_text:
        return {"skills": 0, "education": 0, "certifications": 0}

    cache_data = get_job_market_intelligence()

    prompt = f"""
    You are an expert technical recruiter and labor market analyst evaluating the INTRINSIC VALUE of a candidate's resume.

    TASK:
    Evaluate the raw strength of the resume across three dimensions on a 0-100 scale.
    Do NOT evaluate how well they match a specific target role.
    Evaluate how STRONG and VALUABLE the resume is based on its own merits and actual evidence.

    1. Skills Value (0-100)
    - Evaluate explicit skill presence, demonstrated use, projects/work supporting the skill, and proficiency evidence.
    - Below is the current Job Market Intelligence Cache. Identify which skills the candidate possesses and use the cached `demandScore` to inform how valuable their skillset is in the current job market.
    - Highly demanded skills strongly support a high score.
    - A skill explicitly listed but never demonstrated should receive less strength than a proven skill.

    JOB MARKET INTELLIGENCE CACHE:
    {cache_data}

    2. Education Value (0-100)
    - Evaluate degree/program, field of study, relevance, and coursework/achievements.
    - Do NOT create a large score bonus simply because a university is prestigious.

    3. Certification Value (0-100)
    - Evaluate certification relevance, recognized issuer, technical value, and recency.
    - If there are zero certifications, the score is 0.

    RESUME TEXT:
    {parsed_text}

    OUTPUT FORMAT:
    Respond STRICTLY with a JSON object. Do not output anything outside the JSON.
    {{
      "skills": <int 0-100>,
      "education": <int 0-100>,
      "certifications": <int 0-100>,
      "reasoning": "<brief sentence justifying the scores based on evidence and market intelligence>"
    }}
    """

    try:
        raw_response = generate_text_with_fallback(prompt)
        extracted_json = _extract_json(raw_response)

        if isinstance(extracted_json, dict) and "skills" in extracted_json:
            return {
                "skills": int(extracted_json.get("skills", 0)),
                "education": int(extracted_json.get("education", 0)),
                "certifications": int(extracted_json.get("certifications", 0))
            }
        return {"skills": 0, "education": 0, "certifications": 0}
    except Exception as e:
        print(f"Intrinsic evaluation failed: {e}")
        return {"skills": 0, "education": 0, "certifications": 0}

import datetime

VERIFIED_CERTIFICATION_CATALOG = [
    {
        "keywords": ["aws", "cloud practitioner"],
        "title": "AWS Certified Cloud Practitioner",
        "issuer": "Amazon Web Services (AWS)",
        "url": "https://aws.amazon.com/certification/certified-cloud-practitioner/",
        "type": "certification"
    },
    {
        "keywords": ["aws developer", "aws certified developer"],
        "title": "AWS Certified Developer - Associate",
        "issuer": "Amazon Web Services (AWS)",
        "url": "https://aws.amazon.com/certification/certified-developer-associate/",
        "type": "certification"
    },
    {
        "keywords": ["azure data", "azure data fundamentals"],
        "title": "Microsoft Certified: Azure Data Fundamentals",
        "issuer": "Microsoft",
        "url": "https://learn.microsoft.com/credentials/certifications/azure-data-fundamentals/",
        "type": "certification"
    },
    {
        "keywords": ["power bi", "pl-300", "data analyst associate"],
        "title": "Microsoft Certified: Power BI Data Analyst Associate (PL-300)",
        "issuer": "Microsoft",
        "url": "https://learn.microsoft.com/credentials/certifications/data-analyst-associate/",
        "type": "certification"
    },
    {
        "keywords": ["google data analytics", "data analytics cert"],
        "title": "Google Data Analytics Professional Certificate",
        "issuer": "Google",
        "url": "https://www.coursera.org/professional-certificates/google-data-analytics",
        "type": "certification"
    },
    {
        "keywords": ["comptia security+", "security+"],
        "title": "CompTIA Security+",
        "issuer": "CompTIA",
        "url": "https://www.comptia.org/certifications/security",
        "type": "certification"
    },
    {
        "keywords": ["google ux", "ux design cert"],
        "title": "Google UX Design Professional Certificate",
        "issuer": "Google",
        "url": "https://www.coursera.org/professional-certificates/google-ux-design",
        "type": "certification"
    },
    {
        "keywords": ["meta front-end", "react cert"],
        "title": "Meta Front-End Developer Professional Certificate",
        "issuer": "Meta",
        "url": "https://www.coursera.org/professional-certificates/meta-front-end-developer",
        "type": "certification"
    },
    {
        "keywords": ["ceh", "certified ethical hacker"],
        "title": "Certified Ethical Hacker (CEH)",
        "issuer": "EC-Council",
        "url": "https://www.eccouncil.org/train-certify/certified-ethical-hacker-ceh/",
        "type": "certification"
    },
    {
        "keywords": ["pmp", "project management professional"],
        "title": "Project Management Professional (PMP)",
        "issuer": "Project Management Institute (PMI)",
        "url": "https://www.pmi.org/certifications/project-management-pmp",
        "type": "certification"
    },
    {
        "keywords": ["cpa", "certified public accountant"],
        "title": "Certified Public Accountant (CPA)",
        "issuer": "Professional Regulation Commission (PRC)",
        "url": "https://www.prc.gov.ph/",
        "type": "certification"
    },
    {
        "keywords": ["revit", "autodesk revit"],
        "title": "Autodesk Certified Professional in Revit for Architectural Design",
        "issuer": "Autodesk",
        "url": "https://www.autodesk.com/certification/all-certifications/revit-architecture-professional",
        "type": "certification"
    }
]

CANONICAL_SKILL_MAP: Dict[str, str] = {
    "react.js": "React",
    "reactjs": "React",
    "react js": "React",
    "react": "React",
    "react native": "React Native",
    "react-native": "React Native",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "node js": "Node.js",
    "node": "Node.js",
    "express.js": "Express.js",
    "expressjs": "Express.js",
    "express js": "Express.js",
    "express": "Express.js",
    "vue.js": "Vue.js",
    "vuejs": "Vue.js",
    "vue js": "Vue.js",
    "vue": "Vue.js",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "next js": "Next.js",
    "next": "Next.js",
    "javascript": "JavaScript",
    "js": "JavaScript",
    "ecmascript": "JavaScript",
    "es6": "JavaScript",
    "typescript": "TypeScript",
    "ts": "TypeScript",
    "c++": "C++",
    "cpp": "C++",
    "c plus plus": "C++",
    "c#": "C#",
    "csharp": "C#",
    "c sharp": "C#",
    "c": "C",
    "c language": "C",
    "c programming": "C",
    "vb.net": "VB.NET",
    "vb net": "VB.NET",
    "visual basic .net": "VB.NET",
    "visual basic": "VB.NET",
    "asp.net": "ASP.NET",
    "asp.net core": "ASP.NET",
    "aspnet": "ASP.NET",
    ".net": ".NET",
    "net": ".NET",
    "dotnet": ".NET",
    "dot net": ".NET",
    "rest api": "REST API",
    "restful api": "REST API",
    "restful apis": "REST API",
    "rest apis": "REST API",
    "aws": "AWS",
    "amazon web services": "AWS",
    "aws ec2": "AWS EC2",
    "ec2": "AWS EC2",
    "aws rds": "AWS RDS",
    "rds": "AWS RDS",
    "gcp": "GCP",
    "google cloud": "GCP",
    "google cloud platform": "GCP",
    "sql": "SQL",
    "structured query language": "SQL",
    "mysql": "MySQL",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "sqlite": "SQLite",
    "mongodb": "MongoDB",
    "redis": "Redis",
    "pytorch": "PyTorch",
    "tensorflow": "TensorFlow",
    "scikit-learn": "Scikit-Learn",
    "sklearn": "Scikit-Learn",
    "numpy": "NumPy",
    "pandas": "Pandas",
    "html": "HTML",
    "html5": "HTML",
    "css": "CSS",
    "css3": "CSS",
    "excel": "Excel",
    "ms excel": "Excel",
    "microsoft excel": "Excel",
    "advanced excel": "Advanced Excel",
    "autocad": "AutoCAD",
    "auto cad": "AutoCAD",
    "quickbooks": "QuickBooks",
    "quick books": "QuickBooks",
    "staad.pro": "STAAD.Pro",
    "staad pro": "STAAD.Pro",
    "staad-pro": "STAAD.Pro",
    "sentence transformers": "Sentence Transformers",
    "sentence-transformers": "Sentence Transformers",
    "sbert": "SBERT",
    "fastapi": "FastAPI",
    "postman": "Postman",
    "github": "GitHub",
    "gitlab": "GitLab",
    "openrouter": "OpenRouter",
    "git": "Git",
    "figma": "Figma",
    "unity": "Unity",
    "android studio": "Android Studio",
    "power bi": "Power BI",
    "powerbi": "Power BI",
    "sap": "SAP",
    "erp": "ERP",
    "revit": "Revit",
    "autodesk revit": "Revit",
    "sketchup": "SketchUp",
    "spss": "SPSS",
    "git version control": "Git",
    "git version control & github workflow": "Git",
    "git version control & github": "Git",
    "aws or cloud infrastructure": "AWS",
    "typescript (es6+)": "TypeScript",
    "restful api design & integration with express/fastapi": "REST API",
}

CANONICAL_SKILL_ALIASES = {k: [k] for k in CANONICAL_SKILL_MAP}
for k, v in CANONICAL_SKILL_MAP.items():
    canon_l = v.lower()
    CANONICAL_SKILL_ALIASES.setdefault(canon_l, [])
    if k not in CANONICAL_SKILL_ALIASES[canon_l]:
        CANONICAL_SKILL_ALIASES[canon_l].append(k)

def is_skill_grounded_in_text(skill_name: str, raw_text: str) -> bool:
    """
    Robust deterministic evidence verification.
    Distinguishes legitimate normalization (e.g. React.js -> React, NodeJS -> Node.js,
    TypeScript / TS -> TypeScript, C++ / C plus plus -> C++) from semantic inference.
    Tolerates OCR whitespace artifacts, line breaks, and punctuation differences.
    Strictly forbids inference (React != Angular, SQL != PostgreSQL, GitHub != GitHub Actions or CI/CD).
    """
    if not skill_name or not raw_text:
        return False

    raw_norm = raw_text.lower()
    raw_norm = raw_norm.replace('“', '"').replace('”', '"').replace('’', "'").replace('–', '-').replace('—', '-')

    skill_clean = skill_name.strip()
    if not skill_clean or (len(skill_clean) < 2 and skill_clean.lower() not in ("c", "r")):
        return False
    skill_lower = skill_clean.lower()

    # Expand search terms with canonical aliases if available
    search_terms = [skill_lower]
    canon_target = CANONICAL_SKILL_MAP.get(skill_lower)
    if canon_target and canon_target.lower() not in search_terms:
        search_terms.append(canon_target.lower())
    for alias, canon in CANONICAL_SKILL_MAP.items():
        if canon.lower() == skill_lower or (canon_target and canon.lower() == canon_target.lower()):
            if alias not in search_terms:
                search_terms.append(alias)

    for term in search_terms:
        clean_t = term.strip()
        if not clean_t:
            continue

        if clean_t == "c":
            pat = r'(?:\b|(?<=[\s,;:(•|\n\r]))c(?![+#])(?:\b|(?=[\s,;:.)•|\n\r]))'
            if re.search(pat, raw_norm, re.IGNORECASE):
                return True
        elif clean_t in ("react", "react.js", "reactjs"):
            pat = r'\breact(?:\.js|js)?(?!\s*-?\s*native\b)\b'
            if re.search(pat, raw_norm, re.IGNORECASE):
                return True
        elif clean_t in (".net", "net"):
            pat = r'(?<!asp)(?<!asp\.)(?<!vb)(?<!vb\.)(?:\.net|\bnet)\b'
            if re.search(pat, raw_norm, re.IGNORECASE):
                return True
        elif clean_t in ("dotnet", "dot net"):
            pat = r'\bdot\s*net\b'
            if re.search(pat, raw_norm, re.IGNORECASE):
                return True
        elif re.match(r'^[a-zA-Z0-9\s]+$', clean_t):
            # Purely alphanumeric: enforce word boundaries so e.g. "java" does not match "javascript"
            words = clean_t.split()
            escaped_words = [re.escape(w) for w in words]
            pat = r'\b' + r'\s+'.join(escaped_words) + r'\b'
            if re.search(pat, raw_norm, re.IGNORECASE):
                return True
        else:
            # Term contains symbols like C++, C#, .NET, Node.js, STAAD.Pro
            escaped = re.escape(clean_t)
            # Allow optional whitespace around punctuation for OCR tolerance (e.g. "node . js", "c ++")
            escaped = re.sub(r'\\([.\-+])', r'\\s*\\\1\\s*', escaped)
            left_b = r'(?:\b|(?<=[^a-zA-Z0-9]))' if re.match(r'^\w', clean_t) else r'(?:^|(?<=[\s,;:(•|\n\r]))'
            right_b = r'(?:\b|(?=[^a-zA-Z0-9]))' if re.match(r'.*\w$', clean_t) else r'(?:$|(?=[\s,;:.)•|\n\r]))'
            pat = left_b + escaped + right_b
            if re.search(pat, raw_norm, re.IGNORECASE):
                return True

    return False

def _format_skill_display_name(skill_str: str) -> str:
    s = skill_str.strip()
    if not s:
        return ""
    lower = s.lower()
    if lower in CANONICAL_SKILL_MAP:
        return CANONICAL_SKILL_MAP[lower]
    if len(s) <= 4 and s.isupper():
        return s
    if any(c.isupper() for c in s[1:]):
        return s
    if any(c in s for c in [".", "+", "#", "-", "/"]):
        return s
    return " ".join(word.capitalize() for word in s.split())

GENERIC_CATEGORY_LABELS = {
    "frameworks", "languages", "programming languages", "tools", "developer tools",
    "databases", "cloud", "databases cloud", "databases/cloud", "ai/ml", "ai ml", "aiml",
    "core competencies", "technologies", "tech stack", "frameworks tools", "libraries",
    "skills", "technical skills", "methodologies", "platforms"
}

def _sanitize_and_split_candidate_tokens(raw_token: str, known_catalog_lower: set = None) -> List[str]:
    if not raw_token:
        return []
    # Strip any leading category header: e.g. "Frameworks & Tools: React" -> "React"
    raw_token = re.sub(r'^[A-Za-z0-9\s/&\-\(\)]+:\s*', '', raw_token.strip())
    # Strip non-alphanumeric punctuation from borders, preserving terminal +, # for C++, C#
    t = re.sub(r'^[^\w#\+]+|[^\w#\+\.]+$', '', raw_token.strip())
    # Strip trailing periods
    t = re.sub(r'\.+$', '', t).strip()

    if t.lower() in GENERIC_CATEGORY_LABELS:
        return []

    # Strip leading action verbs, conjunctions, prepositions
    prefix_pattern = r'^(?:(?:and|or|with|using|via|in|for|built\s+(?:with|using)|developed\s+(?:with|using)|implemented\s+(?:using|with)|created\s+(?:with|using)|integrated|automated|deployed|managed|designed|engineered|utilized|leveraged|proficient\s+in|skilled\s+in|experience\s+with|experienced\s+(?:with|in)|hands-on\s+with)\s+)+'
    t = re.sub(prefix_pattern, '', t, flags=re.IGNORECASE).strip()

    # Strip trailing conjunctions, prepositions, or generic category qualifiers
    suffix_pattern = r'\s+(?:and|or|with|using|etc|and\s+more|LLM\s+APIs?|APIs?|databases?|database\s+design|frameworks?|libraries|library|tools?|technologies|technology|solutions|pipelines?|systems?)$'
    t = re.sub(suffix_pattern, '', t, flags=re.IGNORECASE).strip()

    # Final cleanup of outer non-word characters (except #, +)
    t = re.sub(r'^[^\w#\+]+|[^\w#\+]+$', '', t).strip()
    if not t or len(t) < 2:
        return []

    # Split on internal delimiters like " and ", " / ", " & "
    sub_parts = re.split(r'\s+(?:and|\/|&)\s+', t, flags=re.IGNORECASE)
    results = []
    for sp in sub_parts:
        sp_clean = re.sub(r'^[^\w#\+]+|[^\w#\+]+$', '', sp).strip()
        if not sp_clean or len(sp_clean) < 2:
            continue
        # If token is a concatenation of two distinct known catalog technologies (e.g. "Python FastAPI")
        if known_catalog_lower:
            words = sp_clean.split()
            if len(words) == 2 and sp_clean.lower() not in known_catalog_lower:
                if words[0].lower() in known_catalog_lower and words[1].lower() in known_catalog_lower:
                    results.append(words[0])
                    results.append(words[1])
                    continue
        results.append(sp_clean)
    return results

def extract_authoritative_resume_skills(
    raw_text: str = "",
    parsed_sections: Dict[str, Any] = None
) -> List[str]:
    """
    Authoritative, domain-neutral candidate skill discovery and deterministic evidence gate.
    The taxonomy serves only as discovery assistance and canonicalization, NOT as a whitelist.
    AIRIS detects legitimate unseen competencies (e.g., Terraform, STAAD.Pro, Solidity, Elixir,
    Psychometrics, IFRS) when evidenced in candidate resume content.
    """
    parsed_sections = parsed_sections or {}
    if raw_text and len(raw_text.strip()) > 20:
        full_text = raw_text
    elif "raw_text" in parsed_sections and parsed_sections["raw_text"]:
        full_text = str(parsed_sections["raw_text"])
    elif "Content" in parsed_sections and parsed_sections["Content"]:
        full_text = str(parsed_sections["Content"])
    else:
        full_text = "\n\n".join(str(v) for v in parsed_sections.values() if v)

    if not full_text or len(full_text.strip()) < 10:
        return []

    candidate_proposals = set()

    # 3. Domain-neutral candidate discovery assistance across academic domains
    DOMAIN_DISCOVERY_CATALOG = [
        # Computing / IT / Software
        "Python", "Java", "C++", "C#", "JavaScript", "TypeScript", "SQL", "Kotlin", "VB.NET", ".NET", "Swift", "Go", "Rust", "PHP", "Dart",
        "React", "React Native", "Expo", "Next.js", "Vue.js", "Angular", "Node.js", "Express.js", "FastAPI", "Django", "Laravel", "Spring Boot",
        "SBERT", "Sentence Transformers", "Gemini", "Groq", "OpenRouter", "OCR", "Whisper", "PyTorch", "TensorFlow", "Pandas", "NumPy", "Scikit-Learn",
        "Firebase", "MySQL", "PostgreSQL", "Oracle", "SQLite", "MongoDB", "Redis", "AWS", "AWS EC2", "AWS RDS", "GCP", "Docker", "Kubernetes",
        "Git", "GitHub", "GitLab", "Postman", "Figma", "Android Studio", "Unity", "Unreal Engine", "REST API", "GraphQL", "CI/CD", "Jenkins",
        "Linux", "Terraform", "Ansible", "Solidity", "Elixir",
        # Engineering & Architecture
        "AutoCAD", "STAAD.Pro", "Revit", "SketchUp", "BIM", "SolidWorks", "MATLAB", "3D Modeling",
        "Structural Analysis", "Quantity Estimation", "Construction Planning", "Site Safety", "HVAC", "IoT",
        "Embedded Systems", "Microelectronics", "Power Systems", "Control Systems", "Quality Control", "Six Sigma", "Lean Manufacturing",
        # Business, Accountancy & Management
        "Financial Reporting", "Bookkeeping", "Tax Compliance", "Auditing", "Internal Audit", "Internal Controls",
        "Financial Analysis", "Cost Accounting", "IFRS", "GAAP", "QuickBooks", "SAP", "ERP", "Advanced Excel", "Excel",
        "Bank Reconciliation", "Financial Modeling", "Payroll Management", "Credit Analysis", "Investment Analysis",
        "Supply Chain Management", "Logistics Coordination", "Procurement", "Inventory Management",
        "Digital Marketing", "Social Media Marketing", "Market Research", "SEO", "Google Analytics", "Content Creation",
        "Talent Acquisition", "Human Resource Management", "Performance Management",
        # Psychology & Education
        "Psychological Assessment", "Psychometrics", "Test Construction", "SPSS", "Counseling Techniques",
        "Behavioral Analysis", "Clinical Psychology", "Instructional Design", "Curriculum Development", "ADDIE Model"
    ]
    for cat_item in DOMAIN_DISCOVERY_CATALOG:
        candidate_proposals.add(cat_item)

    known_catalog_lower = {s.lower() for s in DOMAIN_DISCOVERY_CATALOG}
    for alias in CANONICAL_SKILL_ALIASES:
        known_catalog_lower.add(alias.lower())

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
                for clean_item in _sanitize_and_split_candidate_tokens(item, known_catalog_lower):
                    if 2 <= len(clean_item) <= 40:
                        candidate_proposals.add(clean_item)

    # 2. Extract bullet points / line lists from full text (enables unseen skills discovery even without explicit sections)
    ACTION_VERB_PREFIXES = (
        "developed", "implemented", "automated", "designed", "deployed",
        "managed", "created", "built", "integrated", "engineered", "led",
        "conducted", "maintained", "configured", "optimized", "collaborated",
        "spearheaded", "assisted", "prepared", "analyzed", "coordinated",
        "provisioned", "performed", "established"
    )

    for line in full_text.splitlines():
        line_s = line.strip()
        if not line_s:
            continue
        if any(line_s.startswith(bullet) for bullet in ["•", "-", "*", "·", "▪", "▫", ">"]):
            stripped_bullet = re.sub(r'^[•\-\*·▪▫>\s]+', '', line_s).strip()
            if ":" in stripped_bullet and len(stripped_bullet.split(":", 1)[0]) < 25:
                stripped_bullet = stripped_bullet.split(":", 1)[1].strip()

            first_word = stripped_bullet.split()[0].lower() if stripped_bullet.split() else ""
            first_word = re.sub(r'[^\w]', '', first_word)
            if first_word in ACTION_VERB_PREFIXES:
                # Experience bullet: extract via tech introductory phrases only
                matches = re.findall(r'(?i)\b(?:using|built\s+(?:with|using)|developed\s+(?:with|using)|implemented\s+(?:using|with)|integrated|technologies?:?|tools?:?)\s+([^;\.\n]+)', stripped_bullet)
                for m in matches:
                    m_clean = re.sub(r'(?i)\s+(?:for|to|as|while|so\s+that)\s+.*$', '', m).strip()
                    for token in re.split(r'[,;•|]+|\s+and\s+', m_clean):
                        for clean_part in _sanitize_and_split_candidate_tokens(token, known_catalog_lower):
                            if 2 <= len(clean_part) <= 35:
                                candidate_proposals.add(clean_part)
            else:
                # True skill list bullet
                for part in re.split(r'[,;•|]+|\s+[\/\\]\s+', stripped_bullet):
                    for clean_part in _sanitize_and_split_candidate_tokens(part, known_catalog_lower):
                        if 2 <= len(clean_part) <= 35:
                            candidate_proposals.add(clean_part)

    # 4. Narrative pattern discovery in projects/experience
    for key in ["Projects", "WorkExperience", "Content"]:
        sec_text = parsed_sections.get(key, "")
        if sec_text and isinstance(sec_text, str):
            matches = re.findall(r'(?i)\b(?:proficient in|experience with|implemented using|developed using|developed with|built with|built using|skilled in|hands-on with|technologies?:?|tools?:?)\s+([A-Za-z0-9\s#\+\.\-\/]+?)(?:[;\n]|\.\s|$)', sec_text)
            for m in matches:
                m_clean = re.sub(r'(?i)\s+(?:for|to|as|while|so\s+that)\s+.*$', '', m).strip()
                for token in re.split(r'[,;•|]+|\s+and\s+', m_clean):
                    for clean_part in _sanitize_and_split_candidate_tokens(token, known_catalog_lower):
                        if 2 <= len(clean_part) <= 30:
                            candidate_proposals.add(clean_part)

    # 5. Deterministic Evidence Gate
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
                accepted_skills.append(display_name)

    return accepted_skills

def sanitize_and_validate_learning_snapshot(
    snapshot: Dict[str, Any],
    target_position: str,
    raw_text: str = ""
) -> Dict[str, Any]:
    """
    Strictly validates resource types, rejects non-certifications from certifications list,
    ensures zero null URLs, enforces coach-like supportive language, and guarantees
    that careerContext and candidate strengths are strictly grounded in resume evidence.
    """
    if not isinstance(snapshot, dict):
        snapshot = {}

    cleaned_certs = []
    misplaced_courses = []

    raw_certs = snapshot.get("certifications", [])
    if not isinstance(raw_certs, list):
        raw_certs = []

    for cert in raw_certs:
        if not isinstance(cert, dict):
            continue
        title = str(cert.get("title", "")).strip()
        desc = str(cert.get("description", "")).strip()
        issuer = str(cert.get("issuer", "")).strip()
        item_type = str(cert.get("type", "")).lower()

        if not title:
            continue

        title_lower = title.lower()

        # Check if item is actually documentation / course / tutorial
        is_not_cert = (
            item_type in ["documentation", "course", "tutorial", "video", "article"] or
            "documentation" in title_lower or
            "tutorial" in title_lower or
            "pandas" in title_lower or
            "dataframe" in title_lower or
            "guide" in title_lower and "certification" not in title_lower
        )

        if is_not_cert:
            misplaced_courses.append({
                "title": title,
                "provider": issuer or "Online Guide",
                "url": cert.get("url") if (cert.get("url") and "google.com/search" not in cert.get("url")) else "",
                "type": "course" if item_type != "documentation" else "documentation",
                "description": desc or f"Learning resource for {title}"
            })
            continue

        # Match against verified catalog for clean URL and issuer
        matched = None
        for cat_item in VERIFIED_CERTIFICATION_CATALOG:
            for kw in cat_item["keywords"]:
                if kw in title_lower:
                    matched = cat_item
                    break
            if matched:
                break

        if matched:
            cleaned_certs.append({
                "title": matched["title"],
                "issuer": matched["issuer"],
                "importance": cert.get("importance", "recommended"),
                "description": desc or matched["title"],
                "url": matched["url"],
                "type": "certification"
            })
        else:
            # Keep if valid title & issuer
            cleaned_certs.append({
                "title": title,
                "issuer": issuer or "Recognized Certification Body",
                "importance": cert.get("importance", "recommended"),
                "description": desc or f"Industry certification for {target_position}",
                "url": cert.get("url") if (cert.get("url") and "google.com/search" not in cert.get("url")) else "",
                "type": "certification"
            })

    snapshot["certifications"] = cleaned_certs

    # Clean courses
    raw_courses = snapshot.get("recommendedCourses", [])
    if not isinstance(raw_courses, list):
        raw_courses = []
    raw_courses.extend(misplaced_courses)

    cleaned_courses = []
    seen_urls = set()
    for course in raw_courses:
        if not isinstance(course, dict):
            continue
        ctitle = str(course.get("title", "")).strip()
        curl = str(course.get("url", "")).strip()
        if "google.com/search" in curl:
            curl = ""
        if not ctitle:
            continue
        if curl and curl in seen_urls:
            continue
        if curl:
            seen_urls.add(curl)
        cleaned_courses.append({
            "title": ctitle,
            "provider": str(course.get("provider", "Educational Platform")).strip(),
            "url": curl,
            "type": str(course.get("type", "course")),
            "description": str(course.get("description", "")).strip() or f"Recommended learning resource for {target_position}"
        })

    snapshot["recommendedCourses"] = cleaned_courses
    snapshot["seminars"] = snapshot.get("seminars", []) if isinstance(snapshot.get("seminars"), list) else []

    # Enforce grounding on careerContext and strengths if raw_text is provided
    if raw_text:
        if isinstance(snapshot.get("careerContext"), dict):
            det = snapshot["careerContext"].get("detectedSkills", [])
            if isinstance(det, list):
                snapshot["careerContext"]["detectedSkills"] = [
                    s for s in det if is_skill_grounded_in_text(s, raw_text)
                ]

        raw_strengths = snapshot.get("strengths", [])
        if isinstance(raw_strengths, list):
            valid_strengths = []
            for s in raw_strengths:
                s_str = str(s).strip()
                # Accept if grounded skill or valid high-level narrative summary
                if is_skill_grounded_in_text(s_str, raw_text) or len(s_str.split()) > 3:
                    valid_strengths.append(s_str)
            snapshot["strengths"] = valid_strengths or ["Foundational academic preparation"]

    return snapshot

def generate_learning_snapshot(
    target_position: str,
    parsed_sections: Dict[str, Any],
    sbert_results: Dict[str, Any],
    program: str = "",
    raw_text: str = ""
) -> Dict[str, Any]:
    """
    Dynamically generates a career-specific learning snapshot based on candidate context,
    target position, and identified skill gaps.
    Guarantees that careerContext['detectedSkills'] contains only authoritative candidate skills.
    """
    evidence = sbert_results.get("evidence", []) if sbert_results else []

    # Extract authoritative candidate skills from the complete source text
    grounded_skills = extract_authoritative_resume_skills(raw_text=raw_text, parsed_sections=parsed_sections)

    strong_concepts = [e["concept"] for e in evidence if e.get("status") == "STRONG_MATCH"]
    partial_concepts = [e["concept"] for e in evidence if e.get("status") == "PARTIAL_MATCH"]
    missing_concepts = [e["concept"] for e in evidence if e.get("status") == "NO_RELEVANT_EVIDENCE"]

    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    def _create_deterministic_fallback():
        gaps = []
        for c in missing_concepts:
            gaps.append({
                "skill": c,
                "importance": "high",
                "reason": f"Core requirement missing from resume for target role: {target_position}."
            })
        for c in partial_concepts:
            gaps.append({
                "skill": c,
                "importance": "medium",
                "reason": f"Partial evidence found; needs practical project demonstration for {target_position}."
            })
        if not gaps:
            gaps.append({
                "skill": f"Advanced {target_position} Projects",
                "importance": "medium",
                "reason": f"Strengthen portfolio with production-level {target_position} implementations."
            })

        improvement_areas = []
        for idx, gap in enumerate(gaps[:3], 1):
            improvement_areas.append({
                "priority": idx,
                "area": gap["skill"],
                "title": f"Strengthen {gap['skill']} evidence",
                "reason": f"Your resume currently lacks strong evidence of {gap['skill']} experience.",
                "action": f"Build a practical project or portfolio item demonstrating {gap['skill']} in a {target_position} workflow.",
                "evidence": f"Limited or missing evidence for {gap['skill']}",
                "relatedSkills": [gap["skill"]]
            })

        skills_to_learn = []
        for gap in gaps[:4]:
            skills_to_learn.append({
                "title": f"Master {gap['skill']}",
                "priority": gap["importance"],
                "description": f"Focus on practical applications and hands-on exercises for {gap['skill']} aligned with {target_position} roles."
            })

        topics = [
            {
                "topic": f"Core Competencies for {target_position}",
                "category": "Domain Mastery",
                "summary": f"In-depth study of foundational principles, industry tools, and key workflows in {target_position}."
            },
            {
                "topic": f"Practical Application & Portfolio",
                "category": "Project Work",
                "summary": f"Build real-world projects that showcase problem-solving abilities tailored to {target_position} requirements."
            }
        ]

        # Match certifications from catalog for fallback
        matched_certs = []
        target_lower = target_position.lower()
        for cat_item in VERIFIED_CERTIFICATION_CATALOG:
            for kw in cat_item["keywords"]:
                if kw in target_lower:
                    matched_certs.append({
                        "title": cat_item["title"],
                        "issuer": cat_item["issuer"],
                        "importance": "recommended",
                        "description": f"Recognized credential validating expertise as a {target_position}.",
                        "url": cat_item["url"],
                        "type": "certification"
                    })
                    break

        courses = []
        interview_prep = [
            {
                "questionType": "Technical & Domain",
                "topic": f"{target_position} Fundamentals",
                "keyFocus": f"Review key technical questions, scenario-based problem solving, and architecture for {target_position}."
            },
            {
                "questionType": "Behavioral",
                "topic": "STAR Method Project Presentation",
                "keyFocus": f"Prepare structured responses detailing challenges, actions, and measurable outcomes in {target_position} work."
            }
        ]

        fallback = {
            "snapshotVersion": "1.0.0",
            "generatedAt": timestamp,
            "targetPosition": target_position,
            "degreeProgram": program,
            "resumeVersion": 1,
            "careerSummary": f"Tailored improvement strategy for aspiring {target_position} professionals.",
            "strengths": [s for s in grounded_skills if any(sc.lower() in s.lower() or s.lower() in sc.lower() for sc in strong_concepts)][:4] or (grounded_skills[:4] if grounded_skills else ["Foundational academic preparation"]),
            "improvementAreas": improvement_areas,
            "careerContext": {
                "targetPosition": target_position,
                "program": program,
                "detectedSkills": grounded_skills,
                "missingSkills": missing_concepts
            },
            "skillGaps": gaps,
            "skillsToLearn": skills_to_learn,
            "topicsAndConcepts": topics,
            "recommendedCourses": courses,
            "certifications": matched_certs,
            "seminars": [],
            "interviewPrep": interview_prep
        }
        return sanitize_and_validate_learning_snapshot(fallback, target_position, raw_text=raw_text)

    prompt = f"""
    You are an expert AI Career Coach and Learning Curation Engine for AIRIS.
    Analyze candidate data and generate a highly personalized, dynamic learning snapshot for the candidate's target role.

    CANDIDATE CONTEXT:
    - Target Position: "{target_position}"
    - Field/Program of Study: "{program or 'Not Specified'}"
    - Detected Skills: {grounded_skills}
    - Strong Concept Matches: {', '.join(strong_concepts) if strong_concepts else 'None'}
    - Partial Concept Matches: {', '.join(partial_concepts) if partial_concepts else 'None'}
    - Missing Concept Gaps: {', '.join(missing_concepts) if missing_concepts else 'None'}

    CRITICAL RULES:
    1. Certifications MUST ONLY be actual credentials issued by recognized organizations (e.g. AWS, Microsoft, CompTIA, Google, Cisco, PMP, CPA, PMI, Autodesk, etc.).
    2. Documentation, tutorials, courses, and YouTube guides ARE NOT CERTIFICATIONS. Place them in `recommendedCourses`.
    3. `improvementAreas` must provide supportive, actionable, evidence-based guidance.
    4. Tone must be professional and coach-like (e.g. "Your resume lacks strong evidence of X", "Focus on X next").

    REQUIRED OUTPUT FORMAT (Return ONLY valid JSON):
    {{
      "snapshotVersion": "1.0.0",
      "generatedAt": "{timestamp}",
      "targetPosition": "{target_position}",
      "degreeProgram": "{program}",
      "careerSummary": "<1-2 sentence coaching summary>",
      "strengths": ["<strength1>", "<strength2>"],
      "improvementAreas": [
        {{
          "priority": 1,
          "area": "<Skill/Domain Area>",
          "title": "Strengthen <Skill> evidence",
          "reason": "Your resume currently lacks strong evidence of <Skill>.",
          "action": "Build a hands-on project demonstrating <Skill>.",
          "evidence": "<short phrase describing gap>",
          "relatedSkills": ["<Skill>"]
        }}
      ],
      "careerContext": {{
        "targetPosition": "{target_position}",
        "program": "{program}",
        "detectedSkills": ["skill1"],
        "missingSkills": ["missing1"]
      }},
      "skillGaps": [
        {{
          "skill": "<skill name>",
          "importance": "high|medium|low",
          "reason": "<why this skill is essential for target role>"
        }}
      ],
      "skillsToLearn": [
        {{
          "title": "<Skill Title>",
          "priority": "high|medium|low",
          "description": "<actionable advice>"
        }}
      ],
      "topicsAndConcepts": [
        {{
          "topic": "<Topic Title>",
          "category": "<Domain/Category>",
          "summary": "<short description>"
        }}
      ],
      "recommendedCourses": [
        {{
          "title": "<Course/Resource Title>",
          "provider": "<Provider Name>",
          "type": "course|tutorial|video|documentation",
          "description": "<short description>"
        }}
      ],
      "certifications": [
        {{
          "title": "<Actual Certification Name>",
          "issuer": "<Issuing Body e.g. AWS, Microsoft, CompTIA>",
          "importance": "essential|recommended|optional",
          "description": "<why valuable for target role>",
          "type": "certification"
        }}
      ],
      "seminars": [],
      "interviewPrep": [
        {{
          "questionType": "Technical|Behavioral|Domain",
          "topic": "<Preparation Topic>",
          "keyFocus": "<key focus area>"
        }}
      ]
    }}
    """
    try:
        raw_res = generate_text_with_fallback(prompt)
        extracted = _extract_json(raw_res)
        if isinstance(extracted, dict) and ("skillGaps" in extracted or "improvementAreas" in extracted):
            extracted["snapshotVersion"] = "1.0.0"
            extracted["generatedAt"] = timestamp
            extracted["targetPosition"] = target_position
            extracted["degreeProgram"] = program
            if not isinstance(extracted.get("careerContext"), dict):
                extracted["careerContext"] = {}
            extracted["careerContext"]["targetPosition"] = target_position
            extracted["careerContext"]["program"] = program
            extracted["careerContext"]["detectedSkills"] = grounded_skills
            extracted["careerContext"]["missingSkills"] = missing_concepts
            return sanitize_and_validate_learning_snapshot(extracted, target_position, raw_text=raw_text)
    except Exception as e:
        print("AI Learning Snapshot generation failed, using dynamic deterministic fallback:", e)

    return _create_deterministic_fallback()


def evaluate_career_compatibility(academic_program: str, target_career: str, resume_skills: list = None) -> dict:
    """
    Deterministic Career Target Compatibility Assessment.
    Evaluates alignment between academic degree, target career, and resume evidence.
    Classifications: ALIGNED (80-100), PIVOT (50-79), DISTANT (<50).
    """
    prog_lower = (academic_program or "").lower().strip()
    target_lower = (target_career or "").lower().strip()
    skills_lower = [s.lower().strip() for s in (resume_skills or [])]

    if not target_lower:
        return {
            "classification": "ALIGNED",
            "score": 100,
            "academicProgram": academic_program,
            "targetCareer": target_career,
            "targetDomain": "General Track",
            "reason": "No target career specified.",
            "relevantCompetencies": [],
            "missingPrerequisites": [],
            "requiresExplicitConfirmation": False
        }

    domain_mappings = {
        "software_engineering": {
            "roles": ["software engineer", "software developer", "backend developer", "frontend developer", "full stack", "programmer", "coder", "application developer"],
            "programs": ["information technology", "computer science", "information systems", "software engineering", "computer engineering", "it", "cs"],
            "adjacent_programs": ["secondary education"],
            "prereqs": ["Object-Oriented Programming", "Software Architecture", "Data Structures & Algorithms"]
        },
        "data_analytics": {
            "roles": ["data analyst", "data analytics", "business intelligence", "bi analyst", "bi developer", "data scientist", "data engineer"],
            "programs": ["information technology", "computer science", "information systems", "accountancy", "accounting", "mathematics", "statistics"],
            "adjacent_programs": ["business administration"],
            "prereqs": ["Relational Database Querying (SQL)", "Statistical Analysis", "Data Visualization Standards"]
        },
        "cybersecurity": {
            "roles": ["cybersecurity", "security analyst", "soc analyst", "information security", "penetration tester", "security engineer"],
            "programs": ["information technology", "computer science", "computer engineering", "cybersecurity"],
            "adjacent_programs": [],
            "prereqs": ["Computer Networks & Protocols", "Operating System Security", "Vulnerability Management"]
        },
        "ui_ux": {
            "roles": ["ui/ux", "ux designer", "ui designer", "product designer", "interaction designer", "visual designer"],
            "programs": ["architecture", "fine arts", "multimedia"],
            "adjacent_programs": ["information technology", "computer science", "information systems", "marketing"],
            "prereqs": ["Human-Computer Interaction (HCI)", "User Research Methods", "Wireframing & Prototyping"]
        },
        "accountancy": {
            "roles": ["accountant", "auditor", "certified public accountant", "cpa", "financial accountant", "bookkeeper", "tax consultant"],
            "programs": ["accountancy", "accounting", "finance", "management accounting", "business administration"],
            "adjacent_programs": [],
            "prereqs": ["Financial Reporting Standards (IFRS/GAAP)", "Taxation Law & Auditing Principles", "Cost Accounting"]
        },
        "civil_engineering": {
            "roles": ["civil engineer", "structural engineer", "site engineer", "construction engineer", "environmental engineer", "civil engineering", "quantity surveyor"],
            "programs": ["civil engineering", "civil"],
            "adjacent_programs": ["architecture", "environmental science"],
            "prereqs": ["Engineering Mechanics & Statics", "Structural Analysis & Steel Design", "Concrete Code Standards"]
        },
        "architecture": {
            "roles": ["architect", "architectural designer", "bim specialist", "draftsman", "architecture"],
            "programs": ["architecture", "building design"],
            "adjacent_programs": ["civil engineering"],
            "prereqs": ["Architectural Design History & Theory", "Building Code & Safety Standards", "3D Spatial Modeling"]
        },
        "education_instructional_design": {
            "roles": ["instructional designer", "educator", "teacher", "e-learning specialist", "curriculum developer", "learning designer"],
            "programs": ["secondary education", "elementary education", "education", "teacher education"],
            "adjacent_programs": ["psychology", "information technology"],
            "prereqs": ["Educational Psychology & Learning Theories", "Instructional Design Models (ADDIE/SAM)", "Curriculum Evaluation"]
        },
        "psychology": {
            "roles": ["psychologist", "psychometrician", "human behavior specialist", "counselor", "psychology"],
            "programs": ["psychology", "behavioral science"],
            "adjacent_programs": ["education"],
            "prereqs": ["Psychological Assessment & Testing", "Developmental Psychology", "Abnormal Psychology & Ethics"]
        },
        "natural_sciences": {
            "roles": ["chemist", "biologist", "physicist", "lab technician", "chemical analyst", "research scientist"],
            "programs": ["chemistry", "biology", "applied physics", "biochemistry"],
            "adjacent_programs": [],
            "prereqs": ["Organic & Inorganic Chemistry", "Laboratory Safety & Instrumentation", "Quantitative Chemical Analysis"]
        }
    }

    matched_domain_id = None
    matched_domain = None
    for dom_id, dom_data in domain_mappings.items():
        if any(role in target_lower for role in dom_data["roles"]):
            matched_domain_id = dom_id
            matched_domain = dom_data
            break

    if not matched_domain:
        matched_domain_id = "general"
        matched_domain = {
            "roles": [target_lower],
            "programs": [],
            "adjacent_programs": [],
            "prereqs": ["Core Domain Knowledge", "Specialized Professional Training"]
        }

    is_primary_program = any(p in prog_lower for p in matched_domain["programs"])
    is_adjacent_program = any(p in prog_lower for p in matched_domain["adjacent_programs"])

    # Resume evidence overlap
    demonstrated_skills = []
    for s in skills_lower:
        if any(w in s for w in matched_domain["roles"]) or any(pr.lower() in s for pr in matched_domain["prereqs"]):
            demonstrated_skills.append(s)

    if is_primary_program:
        classification = "ALIGNED"
        score = 95
        reason = f"Strong academic background alignment between {academic_program} and {target_career}."
        missing_prereqs = []
    elif is_adjacent_program or len(demonstrated_skills) >= 2:
        classification = "PIVOT"
        score = 70
        reason = f"{target_career} is a related career pivot from your {academic_program} background. Additional background competencies may be required."
        missing_prereqs = matched_domain["prereqs"][:2]
    else:
        classification = "DISTANT"
        score = 25
        reason = f"{target_career} has low direct academic alignment with {academic_program} and requires substantial domain-specific education and prerequisite training."
        missing_prereqs = matched_domain["prereqs"]

    return {
        "classification": classification,
        "score": score,
        "academicProgram": academic_program,
        "targetCareer": target_career,
        "targetDomain": matched_domain_id,
        "reason": reason,
        "relevantCompetencies": demonstrated_skills if demonstrated_skills else matched_domain["prereqs"][:2],
        "missingPrerequisites": missing_prereqs,
        "requiresExplicitConfirmation": classification == "DISTANT"
    }
