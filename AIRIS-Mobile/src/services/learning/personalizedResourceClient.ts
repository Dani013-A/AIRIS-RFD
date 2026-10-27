import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl, getAuthenticatedIdToken } from '../api/apiClient';
import { fallbackPlacements, reconcileResources, ResourcePlacements } from './personalizedResources';

export interface ResourceSet { placements: ResourcePlacements; complete: boolean; cached?: boolean; generatedAt: number; expiresAt?: number; counts?: Record<string, {hardcoded:number;ai_discovered:number}>; repairedBaseline?: boolean; }
const requests = new Map<string, Promise<ResourceSet>>();
const results = new Map<string, ResourceSet>();
const TTL = 24 * 3600;

export async function loadPersonalizedResources(key: string, context: object): Promise<ResourceSet> {
  const cached = results.get(key);
  if (cached && Date.now() / 1000 < (cached.expiresAt || cached.generatedAt + TTL)) return { ...cached, cached: true };
  const pending = requests.get(key);
  if (pending) return pending;
  const operation = (async () => {
    const stored = await AsyncStorage.getItem('@airis_learning_set_v2').catch(() => null);
    if (stored) {
      try {
        const value = JSON.parse(stored);
        if (value.key === key && Date.now() / 1000 < (value.result.expiresAt || value.result.generatedAt + TTL)) {
          const normalized = { ...value.result, ...reconcileResources(value.result, fallbackPlacements([])), cached: true };
          results.set(key, normalized); return normalized;
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
      if (!result || !Number.isFinite(result.generatedAt) || (result.expiresAt !== undefined && !Number.isFinite(result.expiresAt))) throw new Error('Invalid learning cache metadata');
      const reconciled = reconcileResources(result, fallbackPlacements([]));
      Object.assign(result, reconciled);
      results.set(key, result);
      while (results.size > 4) results.delete(results.keys().next().value!);
      await AsyncStorage.setItem('@airis_learning_set_v2', JSON.stringify({ key, result })).catch(() => {});
      return result as ResourceSet;
    } finally { clearTimeout(timeout); }
  })();
  requests.set(key, operation);
  try { return await operation; } finally { requests.delete(key); }
}
