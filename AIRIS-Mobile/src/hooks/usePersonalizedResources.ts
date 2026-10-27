import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useResumeStore } from '../store/resumeStore';
import { useInterviewStore } from '../store/interviewStore';
import { loadPersonalizedResources, ResourceSet } from '../services/learning/personalizedResourceClient';
import { matchLearningRecommendations } from '../services/learning/learningCatalogService';
import { fallbackPlacements, interviewLearningLabels } from '../services/learning/personalizedResources';

export function usePersonalizedResources() {
  const user = useAuthStore(state => state.currentUser);
  const analysis = useResumeStore(state => state.activeAnalysis);
  const resume = useResumeStore(state => state.activeResume);
  const interview = useInterviewStore(state => state.session);
  const context = useMemo(() => {
    const snapshot = analysis?.learningSnapshot;
    const labels = [...(snapshot?.skillGaps || []), ...(snapshot?.skillsToLearn || []), ...(snapshot?.careerContext?.missingSkills || []), ...interviewLearningLabels(interview, user?.uid)]
      .map((gap: any) => typeof gap === 'string' ? gap : gap?.skill || gap?.title || gap?.name || gap?.competency || '').filter((label): label is string => typeof label === 'string' && !!label.trim());
    return { analysisId: String(analysis?.analyzedAt || ''), targetPosition: user?.targetPosition || snapshot?.targetPosition || '',
      program: user?.degreeProgram || snapshot?.degreeProgram || '', gaps: [...new Set<string>(labels)].slice(0, 30).map(value => value.slice(0, 120)) };
  }, [analysis, user?.targetPosition, user?.degreeProgram, user?.uid, interview]);
  const key = JSON.stringify([user?.uid, context]);
  const fallback = useMemo(() => fallbackPlacements(matchLearningRecommendations({
    targetPosition: context.targetPosition, degreeProgram: context.program, skillGaps: analysis?.learningSnapshot?.skillGaps,
    learningSnapshot: analysis?.learningSnapshot, rawResumeText: resume?.rawText, categoryId: 'for_you', resourceType: 'all',
  })), [key, analysis, resume]);
  const [state, setState] = useState<{ key: string; result?: ResourceSet; loading: boolean; error: boolean }>({ key: '', loading: false, error: false });
  useEffect(() => {
    let active = true;
    if (!user?.uid || !context.analysisId || !context.targetPosition) return;
    setState({ key, loading: true, error: false });
    loadPersonalizedResources(key, context).then(result => { if (active) setState({ key, result, loading: false, error: false }); })
      .catch(() => { if (active) setState({ key, loading: false, error: true }); });
    return () => { active = false; };
  }, [key]);
  const current = state.key === key ? state : undefined;
  const visible = current?.result?.placements || fallback;
  const rows = Object.values(visible).flat();
  const reviewedCount = rows.filter(row => row.origin === 'hardcoded').length;
  const discoveredCount = rows.filter(row => row.origin === 'ai_discovered').length;
  return { placements: visible,
    status: current?.loading ? `Finding resources; showing ${reviewedCount} reviewed resources.` : current?.error ? `Discovery unavailable; showing ${reviewedCount} reviewed resources.` :
      current?.result ? `${current.result.cached ? 'Cached resources. ' : ''}${current.result.complete ? '22 unique resources available.' : `Partial results: ${reviewedCount} reviewed + ${discoveredCount} discovered of 22.`}` : `${reviewedCount} reviewed career-foundation resources.` };
}
