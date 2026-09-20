export type NameMatchClassification =
  | "MATCH"
  | "ACCEPTABLE_VARIATION"
  | "CLEAR_MISMATCH"
  | "UNABLE_TO_DETERMINE";

export interface NameMatchResult {
  classification: NameMatchClassification;
  confidence: number;
  extractedName?: string;
}

/**
 * Normalizes a human name string for tokenized comparison.
 */
function normalizeNameTokens(nameStr: string): string[] {
  if (!nameStr) return [];
  return nameStr
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 0 && t !== "mr" && t !== "ms" && t !== "mrs" && t !== "dr" && t !== "ing" && t !== "jr" && t !== "sr" && t !== "iii");
}

/**
 * Extracts candidate full name from parsed resume header text if present.
 */
export function extractCandidateNameFromResume(resumeText: string): string | undefined {
  if (!resumeText) return undefined;

  const lines = resumeText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const rawLine = lines[i];
    const line = rawLine.replace(/[\u200b\u200c\u200d\ufeff]/g, "").trim();
    // Skip lines with emails, phone numbers, or URLs
    if (line.includes("@") || line.includes("http") || line.includes("www.") || line.includes("github.com") || line.includes("linkedin.com") || /^\+?\d[\d\s\-()]+$/.test(line)) {
      continue;
    }
    // Skip section header keywords
    if (/^(education|skills|experience|projects|summary|objective|certifications|contact|curriculum|resume|profile)/i.test(line)) {
      continue;
    }

    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 5 && /^[A-Za-z\s\-\'\.\,]+$/.test(line)) {
      return line;
    }
  }

  return undefined;
}

/**
 * Classifies name comparison between user account name and extracted resume name.
 */
export function classifyNameMatch(accountName: string, resumeTextOrName: string): NameMatchResult {
  if (!accountName || !resumeTextOrName) {
    return { classification: "UNABLE_TO_DETERMINE", confidence: 0 };
  }

  let extractedName = resumeTextOrName;
  if (resumeTextOrName.includes("\n") || resumeTextOrName.length > 80) {
    const extracted = extractCandidateNameFromResume(resumeTextOrName);
    if (!extracted) {
      return { classification: "UNABLE_TO_DETERMINE", confidence: 0 };
    }
    extractedName = extracted;
  }

  const accountTokens = normalizeNameTokens(accountName);
  const resumeTokens = normalizeNameTokens(extractedName);

  if (accountTokens.length === 0 || resumeTokens.length === 0) {
    return { classification: "UNABLE_TO_DETERMINE", confidence: 0, extractedName };
  }

  const accountSet = new Set(accountTokens);
  const resumeSet = new Set(resumeTokens);

  // Exact match
  if (accountTokens.join(" ") === resumeTokens.join(" ")) {
    return { classification: "MATCH", confidence: 1.0, extractedName };
  }

  // Count token overlaps
  let overlapCount = 0;
  for (const token of accountTokens) {
    if (resumeSet.has(token)) {
      overlapCount++;
    } else {
      // Check middle initial match (e.g. "a" matches "aaron")
      for (const rToken of resumeTokens) {
        if (token.length === 1 && rToken.startsWith(token)) {
          overlapCount += 0.8;
          break;
        } else if (rToken.length === 1 && token.startsWith(rToken)) {
          overlapCount += 0.8;
          break;
        }
      }
    }
  }

  const maxTokens = Math.max(accountTokens.length, resumeTokens.length);
  const matchRatio = overlapCount / maxTokens;

  if (matchRatio >= 0.7) {
    return { classification: "ACCEPTABLE_VARIATION", confidence: matchRatio, extractedName };
  }

  // Check last name match specifically
  const accountLastName = accountTokens[accountTokens.length - 1];
  const resumeLastName = resumeTokens[resumeTokens.length - 1];

  if (accountLastName === resumeLastName && overlapCount >= 1) {
    return { classification: "ACCEPTABLE_VARIATION", confidence: 0.6, extractedName };
  }

  if (overlapCount === 0 && accountTokens.length >= 2 && resumeTokens.length >= 2) {
    return { classification: "CLEAR_MISMATCH", confidence: 0.9, extractedName };
  }

  return { classification: "UNABLE_TO_DETERMINE", confidence: matchRatio, extractedName };
}
