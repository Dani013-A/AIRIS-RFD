import os
import time
import requests
import json
import re
import concurrent.futures
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
import google.generativeai as genai

import concurrent.futures

def call_gemini(prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    def _do_call():
        if hasattr(genai, "configure"):
            genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text.strip()

    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    future = executor.submit(_do_call)
    try:
        return future.result(timeout=30.0)
    except concurrent.futures.TimeoutError:
        raise TimeoutError("Gemini API timed out after 30 seconds")

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
    res = requests.post(url, headers=headers, json=data, timeout=30.0)
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
    res = requests.post(url, headers=headers, json=data, timeout=30.0)
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
    res = requests.post(url, headers=headers, json=data, timeout=30.0)
    res.raise_for_status()
    return res.json()["choices"][0]["message"]["content"].strip()

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
    for name, func in providers:
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

def sanitize_and_validate_learning_snapshot(snapshot: Dict[str, Any], target_position: str) -> Dict[str, Any]:
    """
    Strictly validates resource types, rejects non-certifications from certifications list,
    ensures zero null URLs, and enforces coach-like supportive language.
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
                "url": cert.get("url") or f"https://www.google.com/search?q={title.replace(' ', '+')}",
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
                "url": cert.get("url") or f"https://www.google.com/search?q={title.replace(' ', '+')}+certification",
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
        curl = str(course.get("url", "")).strip() or f"https://www.google.com/search?q={ctitle.replace(' ', '+')}"
        if not ctitle or curl in seen_urls:
            continue
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

    return snapshot

def generate_learning_snapshot(
    target_position: str,
    parsed_sections: Dict[str, Any],
    sbert_results: Dict[str, Any],
    program: str = ""
) -> Dict[str, Any]:
    """
    Dynamically generates a career-specific learning snapshot based on candidate context,
    target position, and identified skill gaps.
    """
    evidence = sbert_results.get("evidence", []) if sbert_results else []
    detected_skills = parsed_sections.get("Skills", "") if parsed_sections else ""

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

        if not matched_certs:
            matched_certs.append({
                "title": f"Professional Certification in {target_position}",
                "issuer": "Recognized Certification Body",
                "importance": "recommended",
                "description": f"Recognized credential validating expertise as a {target_position}.",
                "url": f"https://www.google.com/search?q={target_position.replace(' ', '+')}+certification",
                "type": "certification"
            })

        courses = [
            {
                "title": f"Professional Guide to {target_position}",
                "provider": "Online Learning Platform",
                "url": f"https://www.google.com/search?q={target_position.replace(' ', '+')}+courses",
                "type": "course",
                "description": f"Comprehensive online course covering essential skills and methodologies for a {target_position}."
            }
        ]

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
            "strengths": strong_concepts[:4] if strong_concepts else ["Foundational academic preparation"],
            "improvementAreas": improvement_areas,
            "careerContext": {
                "targetPosition": target_position,
                "program": program,
                "detectedSkills": [s.strip() for s in detected_skills.split(",") if s.strip()][:5] if isinstance(detected_skills, str) else [],
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
        return sanitize_and_validate_learning_snapshot(fallback, target_position)

    prompt = f"""
    You are an expert AI Career Coach and Learning Curation Engine for AIRIS.
    Analyze candidate data and generate a highly personalized, dynamic learning snapshot for the candidate's target role.

    CANDIDATE CONTEXT:
    - Target Position: "{target_position}"
    - Field/Program of Study: "{program or 'Not Specified'}"
    - Detected Skills: {detected_skills}
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
          "url": "<Valid URL>",
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
          "url": "<Direct URL>",
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
            return sanitize_and_validate_learning_snapshot(extracted, target_position)
    except Exception as e:
        print("AI Learning Snapshot generation failed, using dynamic deterministic fallback:", e)

    return _create_deterministic_fallback()
