import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../components/ui/AppText';
import { PrimaryButton, SecondaryButton } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { fetchSavedInterviewSession } from '../../services/firebase/interviewService';
import { withTimeout } from '../../utils/promiseTimeout';
import type { InterviewSession } from '../../store/interviewStore';

function recordedScore(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? `${value}/100` : 'Unavailable';
}

function recordedDate(value: any): string {
  try {
    const date = value?.toDate ? value.toDate() : new Date(value?.seconds != null ? value.seconds * 1000 : value);
    return value != null && Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Unavailable';
  } catch { return 'Unavailable'; }
}

function Feedback({ title, values }: { title: string; values: unknown }) {
  const entries = Array.isArray(values) ? values.filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim())) : [];
  return <View className="mb-5">
    <Text className="text-base font-bold text-[#1F3A5F] mb-2">{title}</Text>
    {entries.length ? entries.map((entry, index) => <Text key={index} className="text-[#4F6B82] leading-6 mb-2">{entry}</Text>) :
      <Text className="text-[#4F6B82]">Not available in this saved interview.</Text>}
  </View>;
}

export default function SavedInterviewSummaryScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const uid = useAuthStore(state => state.currentUser?.uid);
  const id = typeof sessionId === 'string' ? sessionId : '';
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ uid?: string; id: string; record: InterviewSession | null; error?: string } | null>(null);

  useEffect(() => {
    let current = true;
    setResult(null);
    if (!uid || !id) {
      setResult({ uid, id, record: null, error: !uid ? 'Please sign in to view your interview.' : 'The interview reference is missing.' });
      return;
    }
    withTimeout(fetchSavedInterviewSession(uid, id), 15000, 'Saved interview read timed out').then(record => {
      if (current) setResult({ uid, id, record, error: record ? undefined : 'This saved interview is unavailable.' });
    }).catch(() => {
      if (current) setResult({ uid, id, record: null, error: 'Unable to load this interview. Check your connection and try again.' });
    });
    return () => { current = false; };
  }, [uid, id, attempt]);

  const resolved = result?.uid === uid && result?.id === id ? result : null;
  const record = resolved?.record;
  const report = record?.finalReport ?? record ?? {};
  const metrics = report.categoryBreakdown ?? {};
  const legacyMetrics = report.metrics ?? {};
  const practice = [report.recommendedPractice, report.recommendations].find(value => Array.isArray(value) && value.length);
  const recommendations = practice ?? [report.weakestAnswer?.howToImprove];
  return <SafeAreaView className="flex-1 bg-[#F4F8FB]" edges={['top', 'bottom']}>
    <View className="px-6 py-4 border-b border-[#BFD6EA] bg-white">
      <Text className="text-xl font-bold text-[#1F3A5F]">Saved interview summary</Text>
    </View>
    {!resolved ? <ActivityIndicator accessibilityLabel="Loading saved interview" className="mt-10" color="#1F3A5F" /> :
      !record ? <View className="px-6 py-8 gap-4">
        <Text className="text-[#4F6B82]">{resolved.error}</Text>
        {uid && id ? <PrimaryButton title="Try again" onPress={() => setAttempt(value => value + 1)} /> : null}
      </View> : <ScrollView className="px-6 pt-5" contentContainerStyle={{ paddingBottom: 24 }}>
        <Text className="text-base font-bold text-[#1F3A5F]">Overall interview score</Text>
        <Text className="text-3xl font-bold text-[#1E5D53] mb-4">{recordedScore(report.overallPerformance ?? (record as any).overallPerformance ?? (record as any).overallScore ?? (record as any).score)}</Text>
        <Text className="text-[#4F6B82] mb-2">Completed: {recordedDate(record.completedAt)}</Text>
        <Text className="text-[#4F6B82] mb-4">Interview type: {typeof record.interviewType === 'string' && record.interviewType ? record.interviewType : 'Unavailable'}</Text>
        {[
          ['Semantic correctness', metrics.SemanticCorrectness ?? legacyMetrics.semanticCorrectness],
          ['Holistic evaluation', metrics.AIHolisticEvaluation ?? legacyMetrics.aiHolisticEvaluation],
          ['Communication clarity', metrics.CommunicationClarity ?? legacyMetrics.communicationClarity],
        ].map(([label, value]) => <View key={String(label)} className="flex-row justify-between mb-3 gap-4"><Text className="flex-1 text-[#4F6B82]">{label}</Text><Text className="font-bold text-[#1F3A5F]">{recordedScore(value)}</Text></View>)}
        <View className="mt-4">
          <Feedback title="Strengths" values={report.strengths} />
          <Feedback title="Weaknesses or gaps" values={report.weaknesses ?? report.identifiedGaps ?? report.gaps ?? (report.weakestAnswer?.whyItWasWeak ? [report.weakestAnswer.whyItWasWeak] : [])} />
          <Feedback title="Areas for improvement" values={report.areasToImprove} />
          <Feedback title="Recommendations" values={recommendations} />
        </View>
      </ScrollView>}
    <View className="px-6 py-4"><SecondaryButton title="Return to dashboard" onPress={() => router.replace('/(student)/(tabs)/dashboard' as any)} /></View>
  </SafeAreaView>;
}
