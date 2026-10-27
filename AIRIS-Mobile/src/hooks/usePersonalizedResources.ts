import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { useResumeStore } from '../store/resumeStore';
import { getApiBaseUrl, getAuthenticatedIdToken } from '../services/api/apiClient';
import { matchLearningRecommendations } from '../services/learning/learningCatalogService';
import { fallbackPlacements, ResourcePlacements, RESOURCE_SPLIT, ResourceDestination } from '../services/learning/personalizedResources';

interface ResourceSet { placements: ResourcePlacements; complete: boolean; cached?: boolean; generatedAt: number; }
const requests = new Map<string, Promise<ResourceSet>>();
const results = new Map<string, ResourceSet>();
const TTL = 24 * 3600;

async function loadSet(key: string, context: object): Promise<ResourceSet> {
  const cached = results.get(key);
  if (cached && Date.now() / 1000 - cached.generatedAt < TTL) return { ...cached, cached: true };
  const pending = requests.get(key);
  if (pending) return pending;
  const operation = (async () => {
    const stored = await AsyncStorage.getItem('@airis_learning_set_v1').catch(() => null);
    if (stored) {
      try {
        const value = JSON.parse(stored);
        if (value.key === key && Date.now() / 1000 - value.result.generatedAt < TTL) {
          results.set(key, value.result); return { ...value.result, cached: true };
        }
      } catch { /* A corrupt cache is replaced by a fresh authenticated response. */ }
    }
    const token = await getAuthenticatedIdToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch(`${getApiBaseUrl()}/learning/recommendations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(context), signal: controller.signal,
      });
      if (!response.ok) throw new Error('Learning discovery unavailable');
      const result = await response.json();
      const seen = new Set<string>();
      for (const tab of Object.keys(RESOURCE_SPLIT) as ResourceDestination[]) {
        const rows = result.placements?.[tab];
        if (!Array.isArray(rows) || rows.length > RESOURCE_SPLIT[tab] * 2) throw new Error('Invalid learning response');
        for (const item of rows) {
          if (!item.url?.startsWith('https://') || seen.has(item.url) || !['hardcoded', 'ai_discovered'].includes(item.origin) || item.destination !== tab) throw new Error('Invalid learning resource');
          seen.add(item.url);
          Object.assign(item, { source: item.origin, careerPaths: [], tags: [], skills: item.skills || [], priority: 0,
            category: 'for_you', description: item.description || item.expectedOutcome,  });
        }
      }
      results.set(key, result);
      while (results.size > 4) results.delete(results.keys().next().value!);
      await AsyncStorage.setItem('@airis_learning_set_v1', JSON.stringify({ key, result })).catch(() => {});
      return result as ResourceSet;
    } finally { clearTimeout(timeout); }
  })();
  requests.set(key, operation);
  try { return await operation; } finally { requests.delete(key); }
}

export function usePersonalizedResources() {
  const user = useAuthStore(state => state.currentUser);
  const analysis = useResumeStore(state => state.activeAnalysis);
  const resume = useResumeStore(state => state.activeResume);
  const context = useMemo(() => {
    const snapshot = analysis?.learningSnapshot;
    const labels = [...(snapshot?.skillGaps || []), ...(snapshot?.skillsToLearn || [])]
      .map((gap: any) => typeof gap === 'string' ? gap : gap.skill || gap.title || gap.name || gap.competency || '').filter(Boolean);
    return { analysisId: String(analysis?.analyzedAt || ''), targetPosition: user?.targetPosition || snapshot?.targetPosition || '',
      program: user?.degreeProgram || '', gaps: [...new Set<string>(labels)].slice(0, 30).map(value => value.slice(0, 120)) };
  }, [analysis, user?.targetPosition, user?.degreeProgram]);
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
    loadSet(key, context).then(result => { if (active) setState({ key, result, loading: false, error: false }); })
      .catch(() => { if (active) setState({ key, loading: false, error: true }); });
    return () => { active = false; };
  }, [key]);
  const current = state.key === key ? state : undefined;
  return { placements: current?.result?.placements || fallback,
    status: current?.loading ? 'Finding resources; showing reviewed fallback.' : current?.error ? 'Discovery unavailable; showing reviewed fallback.' :
      current?.result ? `${current.result.cached ? 'Cached resources. ' : ''}${current.result.complete ? '22 unique resources available.' : 'Some resource slots are unavailable; showing validated results.'}` : 'Reviewed fallback resources.' };
}
