import { LearningCategory } from "../types/learning.types";

/**
 * Primary user-intent categories for the AIRIS Knowledge Hub.
 * Focused on student learning goals rather than technical resource file types.
 */
export const DEFAULT_LEARNING_CATEGORIES: LearningCategory[] = [
  {
    id: "interviews",
    name: "Interviews",
    description: "Behavioral interview mastery, the STAR method, answer frameworks, and mock interview examples.",
    icon: "chatbubble-ellipses-outline",
    colorToken: "#CA5D25",
    order: 1,
    isActive: true,
    supportedResourceTypes: ["video", "guide", "article", "practice"],
    tags: ["interviews", "behavioral", "star-method", "questions", "confidence"],
  },
  {
    id: "resume",
    name: "Resume Writing",
    description: "Source-reviewed resume guidance, clear writing, and illustrative resume layouts.",
    icon: "document-text-outline",
    colorToken: "#CA5D25",
    order: 2,
    isActive: true,
    supportedResourceTypes: ["guide", "video", "example", "documentation"],
    tags: ["resume", "cv", "formatting", "bullets", "ats-templates"],
  },
  {
    id: "communication",
    name: "Communication",
    description: "Professional workplace communication, presentation delivery, active listening, and public speaking.",
    icon: "people-outline",
    colorToken: "#CA5D25",
    order: 3,
    isActive: true,
    supportedResourceTypes: ["video", "article", "guide", "practice"],
    tags: ["communication", "public-speaking", "presentation", "workplace", "listening"],
  },
  {
    id: "for_you",
    name: "For You",
    description: "Personalized learning roadmap tailored to your target career and identified skill gaps.",
    icon: "sparkles-outline",
    colorToken: "#CA5D25",
    order: 4,
    isActive: true,
    supportedResourceTypes: ["course", "certification", "seminar", "documentation", "video", "practice"],
    tags: ["personalized", "career-growth", "skill-gaps", "recommended"],
  },
];
