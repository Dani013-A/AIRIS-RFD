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

test('the real reviewed baseline fills 2/2/2/5 even with no matching gap vocabulary', () => {
  const result=fallbackPlacements([]);
  expect(Object.fromEntries(Object.entries(result).map(([key,rows])=>[key,rows.length]))).toEqual({certifications:2,courses:2,practice:2,for_you:5});
  expect(new Set(Object.values(result).flat().map(row=>row.url)).size).toBe(11);
  expect(Object.values(result).flat().every(row=>row.origin==='hardcoded')).toBe(true);
});

test('only catalog topic labels from an owned completed interview are used',()=>{
 const {interviewLearningLabels}=require('./personalizedResources');
 const session={userId:'owner',finalReport:{status:'completed',persisted:true,areasToImprove:['Improve communication using private project details.'],recommendedPractice:['Practice teamwork and the star method.']}};
 const labels=interviewLearningLabels(session,'owner');
 expect(labels).toEqual(expect.arrayContaining(['communication','star method']));
 expect(labels.join(' ')).not.toContain('private project');
 expect(interviewLearningLabels(session,'different-owner')).toEqual([]);
 expect(interviewLearningLabels({...session,finalReport:{...session.finalReport,status:'cancelled'}},'owner')).toEqual([]);
});
