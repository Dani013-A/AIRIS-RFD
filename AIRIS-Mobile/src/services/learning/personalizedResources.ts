import { canonicalResourceUrl } from './catalogValidator';
import { MatchedResourceItem } from '../../types/learning.types';

export const RESOURCE_SPLIT = { certifications: 2, courses: 2, practice: 2, for_you: 5 } as const;
export type ResourceDestination = keyof typeof RESOURCE_SPLIT;
export type ResourcePlacements = Record<ResourceDestination, MatchedResourceItem[]>;
export const emptyPlacements = (): ResourcePlacements => ({ certifications: [], courses: [], practice: [], for_you: [] });

/** Reserve one offline set for all destinations; unavailable discovery is never relabelled. */
export function fallbackPlacements(resources: MatchedResourceItem[]): ResourcePlacements {
  const placements = emptyPlacements();
  const seen = new Set<string>();
  for (const tab of Object.keys(RESOURCE_SPLIT) as ResourceDestination[]) {
    for (const item of resources) {
      const key = canonicalResourceUrl(item.url);
      const title = `${item.provider}:${item.title}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      const eligible = tab === 'for_you' || (tab === 'certifications' && item.type === 'certification') ||
        (tab === 'courses' && item.type === 'course') || (tab === 'practice' && !['certification', 'course'].includes(item.type));
      if (!eligible || !key || seen.has(key) || seen.has(title)) continue;
      seen.add(key); seen.add(title);
      placements[tab].push({ ...item, source: 'hardcoded' });
      if (placements[tab].length === RESOURCE_SPLIT[tab]) break;
    }
  }
  return placements;
}
