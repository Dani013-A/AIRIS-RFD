import json
import uuid
from typing import Dict, Any, List
from ai_service import generate_text_with_fallback

def is_resume_valid(parsed_sections: Dict[str, str]) -> bool:
    """Enhanced heuristic to determine if a document appears to be a resume.
    Tolerant of various layout structures, sizes, and section naming conventions.
    """
    if not parsed_sections:
        return False

    # Combine all section keys and values for analysis
    combined_text = " ".join([f"{k} {v}" for k, v in parsed_sections.items()]).strip()
    if not combined_text or len(combined_text.split()) < 3:
        return True

    # Check contact info anywhere in text or section headers
    import re
    email_pattern = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", re.IGNORECASE)
    phone_pattern = re.compile(r"(?:\+?\d{1,3})?[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}")

    has_contact = bool(email_pattern.search(combined_text) or phone_pattern.search(combined_text))

    # Core career keywords
    keywords = ["education", "experience", "skills", "projects", "work", "university", "college", "degree", "intern", "developer", "engineer"]
    matched_keywords = sum(1 for kw in keywords if kw in combined_text.lower())

    # Document is valid if it contains contact info or multiple resume indicators
    return has_contact or matched_keywords >= 2 or len(combined_text.split()) >= 100



def validate_and_enhance_analysis(
    raw_text: str,
    parsed_sections: Dict[str, str],
    target_position: str,
    sbert_results: Dict[str, Any],
    local_analysis: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Validate parsed resume sections and enrich the response with AI-generated suggestions 
    based ONLY on authoritative frontend deterministic evaluation rules.
    """
    # Extract SBERT scores
    skills_score = sbert_results.get("skillsMatchScore", 0)
    experience_score = sbert_results.get("experienceScore", 0)

    # If the frontend provided its accurate deterministic analysis, we use it as the absolute ground truth.
    if local_analysis and "atsScore" in local_analysis:
        default_response = local_analysis
        
        # Inject the semantic scores into the frontend's deterministic breakdown
        breakdown = default_response["atsScore"].get("breakdown", {})
        breakdown["skillsMatchScore"] = skills_score
        breakdown["experienceScore"] = experience_score
        
        ats_compat = breakdown.get("atsCompatibilityScore", 0)
        quality = breakdown.get("resumeQualityScore", 0)
        
        # Final authoritative weighting: ATS Format (30%), Quality/Content (20%), Skills Match (30%), Experience Match (20%)
        overall_score = int(
            (ats_compat * 0.30) +
            (quality * 0.20) +
            (skills_score * 0.30) +
            (experience_score * 0.20)
        )
        
        if overall_score >= 85: level = "ExcellentMatch"
        elif overall_score >= 70: level = "StrongFoundation"
        elif overall_score >= 50: level = "GettingThere"
        else: level = "NeedsImprovement"
        
        default_response["atsScore"]["overallScore"] = overall_score
        default_response["atsScore"]["level"] = level
        default_response["atsScore"]["breakdown"] = breakdown
        
        # Collect strictly evidence-based failed rules from the deterministic engine
        failed_rules = [
            adj.get("reason", "") for adj in default_response["atsScore"].get("adjustments", []) 
            if not adj.get("passed", True)
        ]
        missing_sections = [
            sec.get("name", "") for sec in default_response.get("missingSections", [])
        ]
        
        evidence_context = f"""
        FAILED DETECTED RULES: {', '.join(failed_rules) if failed_rules else 'None'}
        MISSING REQUIRED SECTIONS: {', '.join(missing_sections) if missing_sections else 'None'}
        SBERT SKILLS MATCH SCORE: {skills_score}/100
        SBERT EXPERIENCE MATCH SCORE: {experience_score}/100
        """
    else:
        # Fallback if frontend analysis is missing (should not happen in normal flow)
        overall_score = int((skills_score * 0.50) + (experience_score * 0.50))
        level = "GettingThere"
        evidence_context = f"SBERT SKILLS: {skills_score}/100, EXPERIENCE: {experience_score}/100."
        default_response = {
            "atsScore": {
                "overallScore": overall_score,
                "level": level,
                "breakdown": {
                    "skillsMatchScore": skills_score,
                    "experienceScore": experience_score,
                    "atsCompatibilityScore": 50,
                    "resumeQualityScore": 50,
                },
            },
            "suggestions": [],
            "recommendations": [],
        }

    # Prompt Gemini (or fallback) for highly specific, evidence-based suggestions
    prompt = f"""
    You are an expert recruiter evaluating a resume for the target role "{target_position}".
    You must base your suggestions STRICTLY on the following concrete evidence. Do not invent missing skills or missing sections.
    
    EVIDENCE METRICS:
    {evidence_context}
    
    RESUME TEXT EXTRACT:
    {raw_text[:2000]}...
    
    Task:
    Provide 1 or 2 specific, semantic critiques of the resume bullets in the extract. 
    Focus on impact, clarity, and relevance to a {target_position}. 
    Quote a specific weak bullet from the text, explain why it's weak, and provide a better rewritten example.
    
    Return a concise JSON payload with exactly this structure:
    {{
      "suggestions": [
        {{
           "priority": "high",
           "type": "content",
           "title": "Short title (e.g. Strengthen Impact)",
           "description": "What is wrong, why it matters. Quote the weak bullet.",
           "example": "Provide the rewritten, stronger bullet.",
           "reason": "AI Semantic Review"
        }}
      ]
    }}
    
    Return ONLY the JSON object, no markdown, no other text.
    """

    try:
        response_text = generate_text_with_fallback(prompt)
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            if lines[0].startswith("```json") or lines[0].startswith("```"):
                response_text = "\n".join(lines[1:-1]).strip()
        parsed_json = json.loads(response_text)
        
        # Append AI semantic suggestions to the deterministic ones, rather than destroying them
        ai_suggestions = parsed_json.get("suggestions", [])
        if "suggestions" not in default_response:
            default_response["suggestions"] = []
            
        # Limit AI to 2 suggestions to prevent overwhelming the user
        default_response["suggestions"].extend(ai_suggestions[:2])
        
        return default_response
    except Exception as e:
        print("AI validation enhancement failed, using baseline defaults:", e)
        return default_response

