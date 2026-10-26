"""Source-grounded structural findings; these do not calculate scores."""
import re

SECTIONS = ["ContactInformation", "ProfessionalSummary", "Education", "Skills", "WorkExperience", "Projects", "Internships", "RelevantCoursework", "Certifications", "OrganizationsLeadership", "Achievements", "Languages", "Trainings", "Publications", "References"]


def structural_findings(parsed, raw_text):
    detected = [{"name": key, "isPresent": key in parsed, "hasContent": bool(str(parsed.get(key, "")).strip())} for key in SECTIONS]
    missing, tips = [], []
    for key in ("ContactInformation", "Education", "Skills"):
        if key in parsed:
            continue
        reason = f"A separate {key} section was not detected; review the extracted text before adding or moving existing information."
        missing.append({"name": key, "requirement": "recommended", "importance": "high", "reason": reason})
        tips.append({"id": f"section_{key}", "section": key, "type": "structure", "priority": "high", "title": f"Review {key} section detection", "why": reason, "action": "If this information is already present, use a clear heading and check extraction. Otherwise add only accurate information.", "reason": reason, "ruleId": "section_not_detected", "sourceSection": "raw_text", "evidenceQuote": None, "confidence": "uncertain", "necessity": "recommended"})
    for key in ("WorkExperience", "Internships", "Projects"):
        content = str(parsed.get(key, "")).strip()
        if content and not re.search(r"\b(?:19|20)\d{2}\b", content):
            tips.append({"id": f"dates_{key}", "section": key, "type": "formatting", "priority": "medium", "title": f"Review dates in {key}", "why": "No year was detected in this extracted section.", "action": "If dates are absent in the original document, add accurate dates for the entries you can substantiate.", "reason": "Dates help readers understand chronology; extraction may omit formatting.", "ruleId": "section_year_not_detected", "sourceSection": key, "evidenceQuote": content[:400], "confidence": "extracted_text", "necessity": "recommended"})
    return detected, missing, tips[:5]
