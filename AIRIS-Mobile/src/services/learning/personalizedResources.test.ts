import { fallbackPlacements } from './personalizedResources';
import type { MatchedResourceItem } from '../../types/learning.types';
test('offline fallback reserves unique resources across all destinations without invented discovery', () => {
  const resources = ['certification', 'course', 'module'].flatMap(type => Array.from({length: 12}, (_, i) => ({
    description: "Synthetic learning material", id: `${type}-${i}`, title: `${type} ${i}`, provider: 'University', url: `https://www.open.edu/${type}/${i}`,
    type, isVerified: true, isActive: true, skills: [], tags: [], careerPaths: [], category: 'for_you', relevanceScore: 5, priority: 1,
  }))) as MatchedResourceItem[];
  const result = fallbackPlacements([...resources, ...resources]);
  expect(Object.fromEntries(Object.entries(result).map(([tab, rows]) => [tab,rows.length]))).toEqual({certifications:2,courses:2,practice:2,for_you:5});
  const rows = Object.values(result).flat();
  expect(new Set(rows.map(r=>r.url)).size).toBe(11);
  expect(rows.every(r=>r.source==='hardcoded')).toBe(true);
});
