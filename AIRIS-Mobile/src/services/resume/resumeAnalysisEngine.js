"use strict";
/**
 * AIRIS Resume Analysis Engine - Production-Grade
 *
 * Implements deterministic evidence-based scoring, dynamic role profiles,
 * section normalization, quantifiable achievements detection, and context matching.
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESUME_SECTION_NAMES = void 0;
exports.parseResumeSections = parseResumeSections;
exports.detectResumeSections = detectResumeSections;
exports.findMissingSections = findMissingSections;
exports.analyzeResume = analyzeResume;
var resumeNormalizer_1 = require("./resumeNormalizer");
exports.RESUME_SECTION_NAMES = [
    "ContactInformation",
    "ProfessionalSummary",
    "WorkExperience",
    "Internships",
    "Education",
    "RelevantCoursework",
    "Skills",
    "Projects",
    "Certifications",
    "OrganizationsLeadership",
    "Achievements",
    "Languages",
    "Trainings",
];
var ANALYSIS_VERSION = "2.0.0-PROD";
var SECTION_REQUIREMENTS = {
    ContactInformation: "required",
    ProfessionalSummary: "recommended",
    WorkExperience: "recommended",
    Internships: "recommended",
    Education: "required",
    RelevantCoursework: "recommended",
    Skills: "required",
    Projects: "recommended",
    Certifications: "recommended",
    OrganizationsLeadership: "recommended",
    Achievements: "recommended",
    Languages: "optional",
    Trainings: "optional",
};
/**
 * Robust Normalization Aliases
 */
var SECTION_HEADING_ALIASES = {
    ContactInformation: ["contact", "contact information", "contact details", "personal information", "personal details"],
    ProfessionalSummary: ["summary", "professional summary", "professionalsummary", "career summary", "profile", "professional profile", "objective", "about me"],
    WorkExperience: ["experience", "work experience", "workexperience", "professional experience", "employment", "employment history", "work history"],
    Internships: ["internship", "internships", "internship experience", "on the job training", "on-the-job training", "ojt", "practicum"],
    Education: ["education", "educational background", "academic background", "academic history"],
    RelevantCoursework: ["relevant coursework", "coursework", "relevant courses", "academic coursework", "subjects"],
    Skills: ["skills", "technical skills", "core skills", "competencies", "core competencies", "technical competencies", "areas of expertise"],
    Projects: ["projects", "academic projects", "personal projects", "project experience", "relevant projects", "technical projects", "selected projects", "capstone"],
    Certifications: ["certifications", "certificates", "licenses and certifications", "credentials", "professional certifications"],
    OrganizationsLeadership: ["organizations", "leadership", "organizations and leadership", "extracurricular activities", "student organizations", "affiliations"],
    Achievements: ["achievements", "awards", "honors", "accomplishments", "honors and awards"],
    Languages: ["languages", "language proficiency", "language skills"],
    Trainings: ["trainings", "training", "seminars", "workshops", "professional development"],
};
var ROLE_PROFILES = [
    {
        role: "software developer",
        coreSkills: ["algorithms", "data structures", "system design", "debugging", "version control"],
        commonTools: ["javascript", "typescript", "python", "java", "c++", "c#", "git", "github", "docker", "sql"],
        importantCompetencies: ["agile", "testing", "api design", "ci/cd", "object oriented programming"],
        relevantTerminology: ["frontend", "backend", "full stack", "framework", "database", "rest api"]
    },
    {
        role: "data analyst",
        coreSkills: ["data analysis", "data visualization", "statistical analysis", "data cleaning", "reporting"],
        commonTools: ["sql", "python", "pandas", "excel", "power bi", "tableau", "r"],
        importantCompetencies: ["a/b testing", "data wrangling", "dashboards", "business intelligence"],
        relevantTerminology: ["metrics", "kpi", "etl", "dataset", "trends", "querying"]
    },
    {
        role: "cybersecurity analyst",
        coreSkills: ["network security", "vulnerability assessment", "penetration testing", "incident response", "risk management"],
        commonTools: ["wireshark", "nmap", "metasploit", "linux", "firewalls", "siem"],
        importantCompetencies: ["threat modeling", "cryptography", "security auditing", "compliance"],
        relevantTerminology: ["malware", "phishing", "encryption", "tcp/ip", "breach", "mitigation"]
    },
    {
        role: "default",
        coreSkills: ["communication", "problem solving", "teamwork", "time management", "critical thinking"],
        commonTools: ["microsoft office", "excel", "word", "powerpoint", "email"],
        importantCompetencies: ["project management", "leadership", "adaptability", "customer service"],
        relevantTerminology: ["coordinated", "managed", "assisted", "developed", "supported"]
    }
];
function getRoleProfile(targetPosition) {
    var normalizedTarget = targetPosition.toLowerCase().trim();
    for (var _i = 0, ROLE_PROFILES_1 = ROLE_PROFILES; _i < ROLE_PROFILES_1.length; _i++) {
        var profile = ROLE_PROFILES_1[_i];
        if (normalizedTarget.includes(profile.role)) {
            return profile;
        }
    }
    return ROLE_PROFILES.find(function (p) { return p.role === "default"; });
}
function normalizeHeading(text) {
    return text.toLowerCase().replace(/[:\-\–\—]/g, "").replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}
function findSectionNameFromHeading(heading) {
    var normalizedHeading = normalizeHeading(heading);
    for (var _i = 0, RESUME_SECTION_NAMES_1 = exports.RESUME_SECTION_NAMES; _i < RESUME_SECTION_NAMES_1.length; _i++) {
        var sectionName = RESUME_SECTION_NAMES_1[_i];
        if (SECTION_HEADING_ALIASES[sectionName].some(function (alias) { return normalizeHeading(alias) === normalizedHeading; })) {
            return sectionName;
        }
    }
    console.log("Failed to find alias for: '".concat(heading, "' (normalized: '").concat(normalizedHeading, "')"));
    return null;
}
function hasQuantifiableAchievements(text) {
    // Regex to detect percentages, currency, or multipliers (e.g. 20%, $10k, 5x, reduced by 10 hours)
    var regex = /\b(?:increased|reduced|improved|grew|saved|managed|led|analyzed|served)\b[\s\S]{0,40}(\d+%|\$\d+|\d+x|\d+\+? (?:users|records|transactions|hours|clients))/i;
    return regex.test(text);
}
function parseResumeSections(resumeText) {
    var lines = resumeText.split("\n");
    var parsedSections = [];
    var currentSection = null;
    var currentHeading = "";
    var currentContent = [];
    var headingRegex = /^[A-Z][A-Z\s\&\-\/]{2,40}$|^[A-Z][a-zA-Z\s\&\-\/]{2,40}:?\s*$/;
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line)
            continue;
        if (headingRegex.test(line) && line.length <= 50) {
            var sectionName = findSectionNameFromHeading(line);
            if (sectionName) {
                if (currentSection) {
                    parsedSections.push({
                        name: currentSection,
                        headingText: currentHeading,
                        content: currentContent.join("\n").trim(),
                    });
                }
                currentSection = sectionName;
                currentHeading = line;
                currentContent = [];
                continue;
            }
        }
        // Check first lines for contact info.
        if (i < 10 && !currentSection && (line.includes("@") || line.match(/\d{10,11}/))) {
            if (!currentSection) {
                currentSection = "ContactInformation";
                currentHeading = "Contact Information";
            }
        }
        currentContent.push(line);
    }
    if (currentSection) {
        parsedSections.push({
            name: currentSection,
            headingText: currentHeading,
            content: currentContent.join("\n").trim(),
        });
    }
    // If no sections parsed cleanly, flag parsing uncertain
    if (parsedSections.length < 3) {
        parsedSections.push({
            name: "ProfessionalSummary",
            headingText: "Uncertain Extract",
            content: resumeText,
            isUncertain: true
        });
    }
    return parsedSections;
}
function detectResumeSections(parsedSections) {
    return exports.RESUME_SECTION_NAMES.map(function (name) {
        var section = parsedSections.find(function (s) { return s.name === name; });
        return {
            name: name,
            isPresent: !!section && section.content.length > 5,
            isUncertain: section === null || section === void 0 ? void 0 : section.isUncertain
        };
    });
}
function findMissingSections(detectedSections) {
    var missing = [];
    for (var _i = 0, detectedSections_1 = detectedSections; _i < detectedSections_1.length; _i++) {
        var section = detectedSections_1[_i];
        if (!section.isPresent && !section.isUncertain) {
            var requirement = SECTION_REQUIREMENTS[section.name];
            if (requirement === "required") {
                missing.push({
                    name: section.name,
                    requirement: requirement,
                    importance: "high",
                    reason: "Your resume is missing a ".concat(section.name.replace(/([A-Z])/g, " $1").trim(), " section. This is critical for ATS parsing.")
                });
            }
            else if (requirement === "recommended") {
                missing.push({
                    name: section.name,
                    requirement: requirement,
                    importance: "medium",
                    reason: "Adding a ".concat(section.name.replace(/([A-Z])/g, " $1").trim(), " section can strengthen your profile.")
                });
            }
        }
    }
    return missing;
}
function analyzeResume(resumeText, targetPosition) {
    var _a, _b;
    var normalizedText = (0, resumeNormalizer_1.normalizeResumeText)(resumeText);
    var parsedSections = parseResumeSections(normalizedText);
    var detectedSections = detectResumeSections(parsedSections);
    // Evidence verification constraint (Requirement 10)
    var missingSections = findMissingSections(detectedSections);
    var roleProfile = getRoleProfile(targetPosition);
    var suggestions = [];
    var adjustments = [];
    var atsScoreVal = 100; // Base, deduct for issues
    var contentScoreVal = 0; // Build up from 0
    var relevanceScoreVal = 0; // Build up from 0
    // --- ATS SCORE CALCULATION (Requirement 11) ---
    var isParsable = parsedSections.length >= 3;
    if (!isParsable) {
        atsScoreVal -= 40;
        adjustments.push({ ruleId: "ats_unparsable", category: "atsCompatibility", points: -40, maximumPoints: 40, passed: false, reason: "Resume layout could not be parsed reliably. Avoid tables and complex columns." });
    }
    else {
        adjustments.push({ ruleId: "ats_parsable", category: "atsCompatibility", points: 40, maximumPoints: 40, passed: true, reason: "Text is highly machine-readable." });
    }
    var hasContact = (_a = detectedSections.find(function (s) { return s.name === "ContactInformation"; })) === null || _a === void 0 ? void 0 : _a.isPresent;
    if (!hasContact) {
        atsScoreVal -= 20;
        adjustments.push({ ruleId: "ats_no_contact", category: "atsCompatibility", points: -20, maximumPoints: 20, passed: false, reason: "Standard contact information block missing." });
    }
    else {
        adjustments.push({ ruleId: "ats_has_contact", category: "atsCompatibility", points: 20, maximumPoints: 20, passed: true, reason: "Standard contact information block found." });
    }
    // --- CONTENT SCORE CALCULATION (Requirement 4, 8) ---
    var experienceText = parsedSections.filter(function (s) { return s.name === "WorkExperience" || s.name === "Projects"; }).map(function (s) { return s.content; }).join(" ");
    if (experienceText.length > 50) {
        contentScoreVal += 40;
        if (hasQuantifiableAchievements(experienceText)) {
            contentScoreVal += 60;
            adjustments.push({ ruleId: "content_quantified", category: "experience", points: 60, maximumPoints: 60, passed: true, reason: "Quantifiable achievements detected (%, $, etc)." });
        }
        else {
            contentScoreVal += 20;
            adjustments.push({ ruleId: "content_unquantified", category: "experience", points: 20, maximumPoints: 60, passed: false, reason: "Experience lacks measurable outcomes (%, $, users served)." });
            suggestions.push({
                id: "sug_quant",
                section: "WorkExperience",
                type: "improvement",
                priority: "high",
                title: "Add Quantifiable Results",
                description: "Current evidence lacks scale. Add measurable results.",
                example: "Instead of 'Developed a dashboard', write 'Developed a dashboard that reduced reporting time by 20%.'",
                reason: "Recruiters look for measurable impact."
            });
        }
    }
    else {
        adjustments.push({ ruleId: "content_no_exp", category: "experience", points: 0, maximumPoints: 100, passed: false, reason: "No significant experience or projects found." });
    }
    // --- RELEVANCE SCORE CALCULATION (Requirement 6, 7) ---
    var allText = parsedSections.map(function (s) { return s.content; }).join(" ").toLowerCase();
    var skillsText = ((_b = parsedSections.find(function (s) { return s.name === "Skills"; })) === null || _b === void 0 ? void 0 : _b.content.toLowerCase()) || "";
    var matches = 0;
    var toolsToMatch = __spreadArray(__spreadArray([], roleProfile.coreSkills, true), roleProfile.commonTools, true);
    toolsToMatch.forEach(function (tool) {
        var isDemonstrated = experienceText.toLowerCase().includes(tool);
        var isMentioned = skillsText.includes(tool);
        if (isDemonstrated) {
            matches += 2; // Demonstrated is worth more
        }
        else if (isMentioned) {
            matches += 1;
        }
    });
    var relevanceRatio = toolsToMatch.length > 0 ? Math.min(100, (matches / (toolsToMatch.length * 1.5)) * 100) : 50;
    relevanceScoreVal = relevanceRatio;
    if (relevanceRatio >= 70) {
        adjustments.push({ ruleId: "rel_high", category: "skillsMatch", points: relevanceRatio, maximumPoints: 100, passed: true, reason: "Strong alignment with ".concat(roleProfile.role, " profile.") });
    }
    else {
        adjustments.push({ ruleId: "rel_low", category: "skillsMatch", points: relevanceRatio, maximumPoints: 100, passed: false, reason: "Missing core skills for ".concat(roleProfile.role, ".") });
    }
    // --- OVERALL MATHEMATICAL TRACEABILITY (Requirement 12) ---
    var atsWeight = 0.30;
    var contentWeight = 0.40;
    var relevanceWeight = 0.30;
    var overall = Math.round((Math.max(0, atsScoreVal) * atsWeight) + (contentScoreVal * contentWeight) + (relevanceScoreVal * relevanceWeight));
    var level = "NeedsImprovement";
    if (overall >= 85)
        level = "ExcellentMatch";
    else if (overall >= 70)
        level = "StrongFoundation";
    else if (overall >= 50)
        level = "GettingThere";
    var atsScore = {
        overallScore: overall,
        level: level,
        breakdown: {
            atsCompatibilityScore: Math.max(0, atsScoreVal),
            resumeQualityScore: contentScoreVal,
            experienceScore: contentScoreVal,
            skillsMatchScore: relevanceScoreVal,
            educationRelevanceScore: 100,
            certificationsScore: 50
        },
        adjustments: adjustments
    };
    return {
        parsedSections: parsedSections,
        detectedSections: detectedSections,
        missingSections: missingSections,
        atsScore: atsScore,
        suggestions: suggestions,
        isAnalysisComplete: true,
        analyzedAt: new Date().toISOString(),
        analysisVersion: ANALYSIS_VERSION,
    };
}
