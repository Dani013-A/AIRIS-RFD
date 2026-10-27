import type { InterviewSession } from '../../store/interviewStore';
import { canonicalResourceUrl, isValidUrl, validateLearningResource } from './catalogValidator';
import reviewed from '../../data/reviewedLearningResources.json';
import { LearningResource, MatchedResourceItem } from '../../types/learning.types';

export const RESOURCE_SPLIT = { certifications: 2, courses: 2, practice: 2, for_you: 5 } as const;
export type ResourceDestination = keyof typeof RESOURCE_SPLIT;
export type ResourcePlacements = Record<ResourceDestination, MatchedResourceItem[]>;
export const emptyPlacements = (): ResourcePlacements => ({ certifications: [], courses: [], practice: [], for_you: [] });
const destinations = Object.keys(RESOURCE_SPLIT) as ResourceDestination[];

function identities(item: Partial<MatchedResourceItem>): string[] {
  const url = canonicalResourceUrl(item.url || '');
  const provider = (item.provider || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const owner = ({ microsoftlearn: 'microsoft', amazonwebservices: 'aws', mitopencourseware: 'mit' } as Record<string,string>)[provider] || provider;
  return [...(item.providerId ? [`provider:${owner}:${item.providerId}`] : []), `id:${owner}:${item.id}`, url.replace('://www.', '://').replace(/\/en-us\//, '/'), `${owner}:${(item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`];
}

function fits(item: LearningResource, tab: ResourceDestination): boolean {
  return tab === 'for_you' || (tab === 'certifications' && item.type === 'certification') ||
    (tab === 'courses' && item.type === 'course') || (tab === 'practice' && !['certification', 'course'].includes(item.type));
}

/** Valid foundations survive missing exact-gap matches; they are not represented as demonstrated gaps. */
export function fallbackPlacements(resources: MatchedResourceItem[]): ResourcePlacements {
  const baseline = (reviewed as LearningResource[]).filter(item => item.baselinePurpose && validateLearningResource(item)).map(item => ({
    ...item, relevanceScore: 0, source: 'hardcoded', origin: 'hardcoded' as const,
    gapRationale: item.baselinePurpose, recommendationReason: item.baselinePurpose,
  }));
  const placements = emptyPlacements();
  const seen = new Set<string>();
  for (const tab of destinations) {
    for (const item of [...resources, ...baseline]) {
      const keys = identities(item);
      if (!isValidUrl(item.url) || !fits(item, tab) || (item.baselineDestination && item.baselineDestination !== tab) || keys.some(key => seen.has(key))) continue;
      keys.forEach(key => seen.add(key));
      placements[tab].push({ ...item, source: 'hardcoded', origin: 'hardcoded' });
      if (placements[tab].length === RESOURCE_SPLIT[tab]) break;
    }
  }
  return placements;
}

/** Reconcile partial API sets centrally, reserving the valid offline baseline before remote additions. */
export function reconcileResources(value: unknown, fallback: ResourcePlacements) {
  if (!value || typeof value !== 'object' || !('placements' in value)) throw new Error('Invalid learning response');
  const raw = (value as { placements: Record<string, unknown> }).placements;
  if (!raw || typeof raw !== 'object') throw new Error('Invalid learning placements');
  const placements = emptyPlacements();
  const seen = new Set<string>();
  let repairedBaseline = false;
  for (const origin of ['hardcoded', 'ai_discovered'] as const) {
    for (const tab of destinations) {
      if (!Array.isArray(raw[tab])) throw new Error('Missing learning destination');
      const candidates = (raw[tab] as MatchedResourceItem[]).filter(item => item?.origin === origin && !(origin === 'ai_discovered' && ['curated','hardcoded'].includes(item.source || '')));
      if (origin === 'hardcoded') candidates.push(...fallback[tab]);
      let count = 0;
      for (const item of candidates) {
        if (!item || !item.id || !item.title || !item.provider || !isValidUrl(item.url) || !fits(item, tab)) continue;
        const keys = identities(item);
        if (keys.some(key => seen.has(key))) continue;
        keys.forEach(key => seen.add(key));
        placements[tab].push({ ...item, source: origin });
        if (origin === 'hardcoded' && !(raw[tab] as MatchedResourceItem[]).some(row => row.id === item.id && row.origin === origin)) repairedBaseline = true;
        count++;
        if (count === RESOURCE_SPLIT[tab]) break;
      }
    }
  }
  const counts = Object.fromEntries(destinations.map(tab => [tab, {
    hardcoded: placements[tab].filter(item => item.origin === 'hardcoded').length,
    ai_discovered: placements[tab].filter(item => item.origin === 'ai_discovered').length,
  }]));
  const complete = destinations.every(tab => counts[tab].hardcoded === RESOURCE_SPLIT[tab] && counts[tab].ai_discovered === RESOURCE_SPLIT[tab]);
  return { placements, counts, complete, repairedBaseline };
}

/** Only catalog topic labels from a completed, owned report leave the device; no transcript or free-form feedback is sent. */
export function interviewLearningLabels(session: InterviewSession | null, uid?: string): string[] {
  const report = session?.finalReport;
  if (!uid || session?.userId !== uid || report?.status !== 'completed' || report?.persisted !== true) return [];
  const feedback = [...(Array.isArray(report.areasToImprove) ? report.areasToImprove : []), ...(Array.isArray(report.recommendedPractice) ? report.recommendedPractice : [])]
    .filter(value => typeof value === 'string').join(' ').toLowerCase();
  const labels = [...new Set((reviewed as LearningResource[]).flatMap(resource => resource.skills))];
  return labels.filter(label => feedback.includes(label.toLowerCase())).slice(0, 10);
}
