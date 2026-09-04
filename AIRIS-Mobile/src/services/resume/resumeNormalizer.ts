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
 * Validates normalized resume text based on size constraints.
 * Rejects empty, clearly incomplete, or excessively large text.
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
