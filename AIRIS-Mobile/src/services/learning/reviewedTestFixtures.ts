import { LearningResource } from "../../types/learning.types";

// Synthetic provenance for isolated matching tests, never published as source verification.
export function withReviewedFixtureMetadata(resources: LearningResource[]): LearningResource[] {
  return resources.map(resource => ({
    ...resource,
    verification: {
      status: "verified",
      checkedAt: new Date().toISOString(),
      sourceUrl: resource.url,
      contentReviewed: true,
      reviewedTitle: resource.title,
      reviewedProvider: resource.provider,
      verificationMethod: "manual",
    },
  }));
}

export function matchingTestCatalog(): LearningResource[] {
  const definitions: Array<[string, string, string[]]> = [
    ["Network Administration", "certification", ["information technology specialist"]],
    ["System Administration", "course", ["information technology specialist"]],
    ["Linux Administration", "documentation", ["information technology specialist"]],
    ["Cloud Infrastructure", "certification", ["information technology specialist"]],
    ["Network Administration", "course", ["information technology specialist"]],
    ["System Administration", "documentation", ["information technology specialist"]],
    ["Machine Learning", "course", ["data scientist"]],
    ["Predictive Modeling", "documentation", ["data scientist"]],
    ["Network Security", "course", ["information security analyst"]],
    ["Incident Response", "documentation", ["information security analyst"]],
  ];
  return withReviewedFixtureMetadata(definitions.map(([skill, type, careerPaths], index) => ({
    id: `synthetic_matching_${index}`, title: `Synthetic ${skill} learning fixture`,
    description: `Synthetic controlled fixture covering ${skill}; not a published resource.`,
    provider: `Synthetic fixture ${index % 3}`, type: type as LearningResource["type"],
    category: "for_you", careerPaths, skills: [skill.toLowerCase()], tags: [skill.toLowerCase()],
    url: `https://learn.microsoft.com/training/modules/synthetic-matching-${index}/`,
    priority: 80, isActive: true, isVerified: true,
  })));
}
