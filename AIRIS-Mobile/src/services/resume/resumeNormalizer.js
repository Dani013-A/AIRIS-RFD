"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeResumeText = normalizeResumeText;
exports.validateResumeText = validateResumeText;
/**
 * Clean up the resume text by fixing formatting, abbreviations, and spacing so the parser can read it easily.
 */
function normalizeResumeText(text) {
    if (!text)
        return "";
    // Step 1: Clean up irregular line breaks and extra word spaces.
    var cleaned = text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, " ");
    // Step 2: Convert different bullet point designs into a single uniform style.
    cleaned = cleaned.replace(/^[ \t]*[•○▪\-*○▫▪][ \t]*/gm, "• ");
    // Step 3: Match common degree abbreviations (like B.S. or Bachelor) to a standard label.
    cleaned = cleaned
        .replace(/\bBachelor of Science in\b/gi, "BS")
        .replace(/\bBachelor of Science\b/gi, "BS")
        .replace(/\bB\.S\.\b/gi, "BS")
        .replace(/\bBS\b/gi, "BS")
        .replace(/\bBachelor's\b/gi, "Bachelor");
    // Step 4: Removed hardcoded section renaming; handled securely by engine aliases.
    // Step 5: Remove extra blank lines to make the text compact.
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
