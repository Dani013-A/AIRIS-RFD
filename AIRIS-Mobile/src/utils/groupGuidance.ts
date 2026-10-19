/**
 * Presentation-layer grouping for competency guidance cards.
 *
 * Groups items ONLY when they genuinely share the same underlying
 * information: same normalized verbatim evidence chunk and same headline.
 * Within a group, the description / recommendation is shown once when
 * identical across skills, otherwise per skill. Nothing is merged across
 * different evidence or different recommendations. Deterministic: stable
 * sort by first-skill name, original order otherwise preserved.
 */

export interface GuidanceInput {
  competency: string;
  headline: string;
  description: string;
  actionRecommendation: string;
  matchedChunk?: string | null;
}

export interface GuidanceGroup {
  skills: string[];
  evidence: string | null;
  sharedMeaning: string | null;
  meaningBySkill: { skill: string; text: string }[] | null;
  sharedAction: string | null;
  actionBySkill: { skill: string; text: string }[] | null;
}

function normalizeEvidence(chunk: string | null | undefined): string | null {
  if (typeof chunk !== "string") return null;
  const cleaned = chunk.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned : null;
}

export function groupGuidanceItems(items: GuidanceInput[]): GuidanceGroup[] {
  const order = new Map<string, number>();
  const buckets = new Map<string, GuidanceInput[]>();

  for (const item of items) {
    const evidence = normalizeEvidence(item.matchedChunk);
    const key = `${item.headline}::${evidence ?? ""}`;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.set(key, order.size);
    }
    buckets.get(key)!.push(item);
  }

  const groups: GuidanceGroup[] = [];
  for (const [, bucket] of buckets) {
    const skills = bucket.map((b) => b.competency);
    const evidence = normalizeEvidence(bucket[0].matchedChunk);
    const meanings = bucket.map((b) => b.description);
    const actions = bucket.map((b) => b.actionRecommendation);
    const allMeaningsEqual = meanings.every((m) => m === meanings[0]);
    const allActionsEqual = actions.every((a) => a === actions[0]);
    groups.push({
      skills,
      evidence,
      sharedMeaning: allMeaningsEqual ? meanings[0] : null,
      meaningBySkill: allMeaningsEqual
        ? null
        : bucket.map((b) => ({ skill: b.competency, text: b.description })),
      sharedAction: allActionsEqual ? actions[0] : null,
      actionBySkill: allActionsEqual
        ? null
        : bucket.map((b) => ({ skill: b.competency, text: b.actionRecommendation })),
    });
  }

  // Deterministic order: sort by first skill name (case-insensitive).
  groups.sort((a, b) =>
    a.skills[0].toLowerCase().localeCompare(b.skills[0].toLowerCase())
  );
  return groups;
}
