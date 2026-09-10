/**
 * Clean up the resume text by fixing formatting, abbreviations, and spacing so the parser can read it easily.
 */
export function normalizeResumeText(text: string): string {
  if (!text) return "";

  let cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ");

  cleaned = cleaned.replace(/^[ \t]*[•○▪\-*○▫▪][ \t]*/gm, "• ");

  cleaned = cleaned
    .replace(/\bBachelor of Science in\b/gi, "BS")
    .replace(/\bBachelor of Science\b/gi, "BS")
    .replace(/\bB\.S\.\b/gi, "BS")
    .replace(/\bBS\b/gi, "BS")
    .replace(/\bBachelor's\b/gi, "Bachelor");

  // Step 4: Removed hardcoded section renaming; handled securely by engine aliases.
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  return cleaned;
}

/**
 * Generalized, domain-neutral resume/CV document validity validator.
 * Validates whether extracted text contains candidate identity, section structure, or academic/career details.
 * Rejects screenshots of app UIs, random webpages, posters, memes, forms, receipts, or non-resume documents.
 */
export function isResumeValidDocument(rawText: string, parsedSections?: Record<string, string>): boolean {
  if (!rawText || !rawText.trim()) return false;
  const words = rawText.trim().split(/\s+/).filter(Boolean);
  if (words.length < 25) return false;

  const textLower = rawText.toLowerCase();
  const topLines = rawText.split("\n").map(l => l.trim().toLowerCase()).filter(Boolean).slice(0, 5).join(" ");

  // Rejection signals for non-resume document headers/memos
  const isCoverLetter = topLines.includes("dear hiring manager") || topLines.includes("dear recruiter") || topLines.includes("application for position");
  const isJobPosting = textLower.includes("job responsibilities:") && textLower.includes("how to apply:");
  const isMemo = topLines.includes("subject:") && topLines.includes("date:");

  if (isCoverLetter || isJobPosting || isMemo) return false;

  // Candidate contact info signals
  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(rawText);
  const cleanTextForPhone = rawText.replace(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, "");
  const hasPhone = /(?:\+?63|0)9\d{9}\b|\b(?:\+?63|0)?\d{2,3}[-\s]\d{3,4}[-\s]\d{4}\b/.test(cleanTextForPhone);
  const hasContactLink = /linkedin\.com|github\.com|portfolio/i.test(rawText);
  const hasContactInfo = hasEmail || hasPhone || hasContactLink || (parsedSections && !!parsedSections.ContactInformation?.trim());

  // Resume section headings
  const sectionKeywords = [
    "education", "work experience", "experience", "projects", "skills",
    "certifications", "internships", "organizations", "achievements",
    "languages", "trainings", "relevant coursework", "professional summary",
    "summary", "qualifications", "profile", "academic background"
  ];
  let foundSectionCount = 0;
  for (const kw of sectionKeywords) {
    if (textLower.includes(kw)) {
      foundSectionCount++;
    }
  }

  // Academic / Career terms
  const resumeTerms = [
    "bachelor", "bs", "degree", "university", "college", "graduated", "gpa",
    "internship", "project", "developed", "analyzed", "designed", "managed",
    "assisted", "prepared", "certified", "curriculum vitae", "resume", "cv"
  ];
  let matchedTermCount = 0;
  for (const term of resumeTerms) {
    if (textLower.includes(term)) {
      matchedTermCount++;
    }
  }

  if (foundSectionCount >= 2) return true;
  if (foundSectionCount >= 1 && (hasContactInfo || matchedTermCount >= 2)) return true;
  if (hasContactInfo && matchedTermCount >= 3) return true;
  if ((topLines.includes("resume") || topLines.includes("curriculum vitae") || topLines.includes("cv")) && (hasContactInfo || foundSectionCount >= 1)) return true;

  return false;
}

/**
 * Validates normalized resume text based on size and document structure constraints.
 * Rejects empty, non-resume, or excessively large text.
 */
export function validateResumeText(text: string): void {
  const normalized = normalizeResumeText(text);

  if (!normalized) {
    throw new Error("Resume content is empty.");
  }

  if (normalized.length > 100000) {
    throw new Error(
      `Resume content is too large (${normalized.length} characters). The scanner supports up to 100,000 characters.`
    );
  }

  if (!isResumeValidDocument(normalized)) {
    const invalidErr = new Error("This document doesn't appear to be a resume or CV. Please upload a document containing your academic, professional, or career information.");
    (invalidErr as any).code = "INVALID_RESUME";
    throw invalidErr;
  }
}

export interface NameMatchValidationResult {
  isValid: boolean;
  status: "MATCHED" | "UNABLE_TO_VERIFY" | "CONFLICT";
  reason?: string;
}

const HONORIFICS_AND_SUFFIXES = new Set([
  "mr", "mrs", "ms", "dr", "prof", "engr", "arch",
  "jr", "sr", "iii", "ii", "iv", "v", "phd", "cpa", "md"
]);

const NON_NAME_KEYWORDS = new Set([
  "education", "summary", "experience", "objective", "skills", "curriculum", "vitae",
  "resume", "projects", "certifications", "contact", "profile", "overview", "work",
  "seeking", "position", "developer", "engineer", "analyst", "manager", "internship",
  "student", "university", "college", "department", "school", "aspiring", "professional",
  "javascript", "python", "react", "html", "css", "node", "java", "sql", "git"
]);

export function normalizeNameTokens(nameStr: string): string[] {
  if (!nameStr) return [];
  const normalized = nameStr.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cleaned = normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    .split(" ")
    .filter((token) => token.length >= 2 && !HONORIFICS_AND_SUFFIXES.has(token));
}

export function validateResumeNameMatch(
  accountName: string,
  rawText: string
): NameMatchValidationResult {
  if (!accountName || !accountName.trim() || !rawText || !rawText.trim()) {
    return { isValid: true, status: "UNABLE_TO_VERIFY" };
  }

  const accountTokens = normalizeNameTokens(accountName);
  if (accountTokens.length === 0) {
    return { isValid: true, status: "UNABLE_TO_VERIFY" };
  }

  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 8);

  const candidateLines = lines.filter((line) => {
    const l = line.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (l.includes("@") || l.includes("http") || l.includes("www.") || l.includes("github.com") || l.includes("linkedin.com")) {
      return false;
    }
    if (/^\+?\d[\d\s\-\(\)]{7,}/.test(line)) {
      return false;
    }
    const words = l.split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, "")).filter(Boolean);
    if (words.some((w) => NON_NAME_KEYWORDS.has(w))) {
      return false;
    }
    return true;
  });

  if (candidateLines.length === 0) {
    return { isValid: true, status: "UNABLE_TO_VERIFY" };
  }

  for (const line of candidateLines.slice(0, 3)) {
    const lineTokens = normalizeNameTokens(line);
    if (lineTokens.length < 2) continue;

    const matchingTokens = accountTokens.filter((token) => lineTokens.includes(token));
    const candidateOnlyTokens = lineTokens.filter((token) => !accountTokens.includes(token) && token.length >= 2);
    const accountOnlyTokens = accountTokens.filter((token) => !lineTokens.includes(token) && token.length >= 2);

    // 1. Full coverage match (all account tokens present in candidate line, or vice versa for multi-token lines)
    if (
      matchingTokens.length === accountTokens.length ||
      (matchingTokens.length === lineTokens.length && lineTokens.length >= 2)
    ) {
      return { isValid: true, status: "MATCHED" };
    }

    // 2. High overlap match (2+ matching tokens and no extra conflicting multi-letter name tokens)
    if (matchingTokens.length >= 2 && candidateOnlyTokens.length === 0) {
      return { isValid: true, status: "MATCHED" };
    }

    // 3. Definitive conflict: 0 matching tokens OR conflicting distinct tokens on both sides
    if (matchingTokens.length === 0 || (candidateOnlyTokens.length > 0 && accountOnlyTokens.length > 0)) {
      return {
        isValid: false,
        status: "CONFLICT",
        reason: "The uploaded resume appears to belong to a different individual. Please ensure you upload your own resume.",
      };
    }
  }

  return { isValid: true, status: "UNABLE_TO_VERIFY" };
}
