import type { StructuredResumeData } from "../../types/resume.types";
import { parseResumeSections } from "./resumeAnalysisEngine";
import { normalizeResumeText, validateResumeText } from "./resumeNormalizer";


/**
 * Reads the cleaned resume text and organizes it into sections like education, experience, and skills.
 */
export function parseAndBuildStructuredData(rawText: string): StructuredResumeData {
  const normalizedText = normalizeResumeText(rawText);
  validateResumeText(normalizedText);

  const parsedSections = parseResumeSections(normalizedText);

  const contactInfo = parsedSections.find((s) => s.name === "ContactInformation");
  const summaryInfo = parsedSections.find((s) => s.name === "ProfessionalSummary");
  const educationSections = parsedSections.filter((s) => s.name === "Education");
  const skillsSection = parsedSections.find((s) => s.name === "Skills");
  const experienceSections = parsedSections.filter((s) => s.name === "WorkExperience");
  const projectSections = parsedSections.filter((s) => s.name === "Projects");
  const certSections = parsedSections.filter((s) => s.name === "Certifications");
  const orgSections = parsedSections.filter((s) => s.name === "OrganizationsLeadership");
  const achievementSections = parsedSections.filter((s) => s.name === "Achievements");
  const langSections = parsedSections.filter((s) => s.name === "Languages");
  const trainingSections = parsedSections.filter((s) => s.name === "Trainings");

  // Find the student's email, phone, and name from the contact information section.
  let email = "";
  let phone = "";
  let detectedName: string | undefined;

  if (contactInfo) {
    const emailMatch = contactInfo.content.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
    const phoneMatch = contactInfo.content.match(/(?:\+?63|0)?9\d{9}\b|(?:\+?63|0)?\d{2,3}[-\s]?\d{3}[-\s]?\d{4}\b/);
    
    if (emailMatch) email = emailMatch[0];
    if (phoneMatch) phone = phoneMatch[0];

    // Assume the first line is the student's name if it doesn't contain numbers or keywords like "email" or "phone".
    const lines = contactInfo.content.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const firstLine = lines[0];
      if (
        !firstLine.includes("@") &&
        !/\d/.test(firstLine) &&
        !/phone|email|linkedin|github/i.test(firstLine) &&
        firstLine.length < 50
      ) {
        detectedName = firstLine;
      }
    }
  }

  // Split the skills list using commas, colons, or line breaks while preserving multi-word skills.
  let skillsList: string[] = [];
  if (skillsSection) {
    skillsList = skillsSection.content
      .split(/[,;•\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 40);
  }

  return {
    contactInformation: contactInfo
      ? {
          email,
          phone,
          name: detectedName,
        }
      : undefined,
    professionalSummary: summaryInfo?.content || undefined,
    education: educationSections.length > 0
      ? educationSections.map((e) => ({
          school: e.headingText || "",
          degree: e.content || "",
        }))
      : undefined,
    skills: skillsList.length > 0 ? skillsList : undefined,
    workExperience: experienceSections.length > 0
      ? experienceSections.map((exp) => ({
          company: exp.headingText || "",
          role: "",
          description: exp.content || "",
        }))
      : undefined,
    projects: projectSections.length > 0
      ? projectSections.map((p) => ({
          name: p.headingText || "",
          description: p.content || "",
        }))
      : undefined,
    certifications: certSections.length > 0
      ? certSections.map((c) => ({
          name: c.content || "",
        }))
      : undefined,
    organizations: orgSections.length > 0
      ? orgSections.map((o) => ({
          name: o.headingText || "",
          role: "",
          description: o.content || "",
        }))
      : undefined,
    achievements: achievementSections.length > 0
      ? achievementSections.map((a) => ({
          title: a.content || "",
        }))
      : undefined,
    languages: langSections.length > 0
      ? langSections.map((l) => l.content || "").filter(Boolean)
      : undefined,
    trainings: trainingSections.length > 0
      ? trainingSections.map((t) => ({
          title: t.content || "",
        }))
      : undefined,
  };
}
