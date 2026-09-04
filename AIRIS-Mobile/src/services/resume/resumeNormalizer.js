"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeResumeText = normalizeResumeText;
exports.validateResumeText = validateResumeText;
exports.validateResumeNameMatch = validateResumeNameMatch;

var HONORIFICS_AND_SUFFIXES = new Set([
  "mr", "mrs", "ms", "dr", "prof", "engr", "arch",
  "jr", "sr", "iii", "ii", "iv", "v", "phd", "cpa", "md"
]);

var NON_NAME_KEYWORDS = new Set([
  "education", "summary", "experience", "objective", "skills", "curriculum", "vitae",
  "resume", "projects", "certifications", "contact", "profile", "overview", "work",
  "seeking", "position", "developer", "engineer", "analyst", "manager", "internship",
  "student", "university", "college", "department", "school", "aspiring", "professional",
  "javascript", "python", "react", "html", "css", "node", "java", "sql", "git"
]);

function normalizeNameTokens(nameStr) {
  if (!nameStr) return [];
  var normalized = typeof nameStr.normalize === "function" ? nameStr.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : nameStr;
  var cleaned = normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    .split(" ")
    .filter(function (token) { return token.length >= 2 && !HONORIFICS_AND_SUFFIXES.has(token); });
}

function validateResumeNameMatch(accountName, rawText) {
  if (!accountName || !accountName.trim() || !rawText || !rawText.trim()) {
    return { isValid: true, status: "UNABLE_TO_VERIFY" };
  }

  var accountTokens = normalizeNameTokens(accountName);
  if (accountTokens.length === 0) {
    return { isValid: true, status: "UNABLE_TO_VERIFY" };
  }

  var lines = rawText
    .split("\n")
    .map(function (l) { return l.trim(); })
    .filter(function (l) { return l.length > 0; })
    .slice(0, 8);

  var candidateLines = lines.filter(function (line) {
    var l = line.toLowerCase();
    if (typeof l.normalize === "function") l = l.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (l.indexOf("@") !== -1 || l.indexOf("http") !== -1 || l.indexOf("www.") !== -1 || l.indexOf("github.com") !== -1 || l.indexOf("linkedin.com") !== -1) {
      return false;
    }
    if (/^\+?\d[\d\s\-\(\)]{7,}/.test(line)) {
      return false;
    }
    var words = l.split(/\s+/);
    if (words.some(function (w) {
      var wClean = w.replace(/[^a-z0-9]/g, "");
      return wClean && NON_NAME_KEYWORDS.has(wClean);
    })) {
      return false;
    }
    return true;
  });

  if (candidateLines.length === 0) {
    return { isValid: true, status: "UNABLE_TO_VERIFY" };
  }

  for (var i = 0; i < Math.min(candidateLines.length, 3); i++) {
    var line = candidateLines[i];
    var lineTokens = normalizeNameTokens(line);
    if (lineTokens.length < 2) continue;

    var matchingTokens = accountTokens.filter(function (token) { return lineTokens.indexOf(token) !== -1; });
    var candidateOnlyTokens = lineTokens.filter(function (token) { return accountTokens.indexOf(token) === -1 && token.length >= 2; });
    var accountOnlyTokens = accountTokens.filter(function (token) { return lineTokens.indexOf(token) === -1 && token.length >= 2; });

    if (
      matchingTokens.length === accountTokens.length ||
      (matchingTokens.length === lineTokens.length && lineTokens.length >= 2)
    ) {
      return { isValid: true, status: "MATCHED" };
    }

    if (matchingTokens.length >= 2 && candidateOnlyTokens.length === 0) {
      return { isValid: true, status: "MATCHED" };
    }

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
/**
 * Clean up the resume text by fixing formatting, abbreviations, and spacing so the parser can read it easily.
 */
function normalizeResumeText(text) {
    if (!text)
        return "";
    var cleaned = text
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
function validateResumeText(text) {
    var normalized = normalizeResumeText(text);
    if (!normalized) {
        throw new Error("Resume content is empty.");
    }
    if (normalized.length > 100000) {
        throw new Error("Resume content is too large (".concat(normalized.length, " characters). The scanner supports up to 100,000 characters."));
    }
}
