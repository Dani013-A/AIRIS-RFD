import React, { useEffect, useRef, useState } from "react";
import { View, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { Text } from "../../components/ui/AppText";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useInterviewStore } from "../../store/interviewStore";
import { generateInterviewReport } from "../../services/api/interviewApi";
import { PrimaryButton, SecondaryButton } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import { withTimeout } from "../../utils/promiseTimeout";
import { assertCompletedInterviewReport, InterviewCompletionError } from '../../services/api/interviewCompletion';
import { rememberInterviewCompletion, forgetInterviewCompletion } from '../../services/firebase/pendingInterviewCompletion';
import AirisOrientation from "../../utils/AirisOrientation";

export default function InterviewSummaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, setFinalReport, clearSession } = useInterviewStore();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const uid = useAuthStore(state => state.currentUser?.uid);
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : session && session.userId === uid ? session.sessionId : '';
  const generatingRef = useRef(false);
  const mountedRef = useRef(true);
  const operationRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [canRetry, setCanRetry] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ uid: string; sessionId: string; report: any } | null>(null);
  const report = saved && saved.uid === uid && saved.sessionId === sessionId ? saved.report : null;

  useEffect(() => {
    mountedRef.current = true;
    AirisOrientation.lockPortrait();
    void generateReport();
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      generatingRef.current = false;
    };
  }, [uid, sessionId]);

  const generateReport = async () => {
    if (generatingRef.current) return;
    setReportError(null);
    setCanRetry(true);
    setLoading(true);
    if (!uid || !/^[a-f0-9]{32}$/.test(sessionId)) {
      setReportError('The signed-in interview session is unavailable. Return to the dashboard to recover it.');
      setCanRetry(false);
      setLoading(false);
      return;
    }
    generatingRef.current = true;
    const operation = ++operationRef.current;
    const current = () => mountedRef.current && operationRef.current === operation && useAuthStore.getState().currentUser?.uid === uid;
    try {
      // Keep only an owner-scoped identifier across restarts; answers remain server-owned.
      await withTimeout(rememberInterviewCompletion(uid, sessionId), 5000, 'Recovery storage timed out');
      const response = await withTimeout(generateInterviewReport({ sessionId }), 45000,
        "We couldn't confirm that your results were saved. Please check the status or retry.");
      if (!current()) return;
      assertCompletedInterviewReport(response, sessionId);
      if (useInterviewStore.getState().session?.sessionId === sessionId) setFinalReport(response);
      setSaved({ uid, sessionId, report: response });
      await withTimeout(forgetInterviewCompletion(uid, sessionId), 5000, 'Recovery cleanup timed out').catch(() => {
        console.warn('INTERVIEW_RECOVERY_MARKER_CLEAR_FAILED');
      });
    } catch (error) {
      if (current()) {
        setCanRetry(!(error instanceof InterviewCompletionError) || error.retryable);
        setReportError(error instanceof InterviewCompletionError ? error.message : "We couldn't confirm that your results were saved. Retry safely using the same interview, or return to the dashboard and resume saving later.");
      }
    } finally {
      if (current()) { generatingRef.current = false; setLoading(false); }
    }
  };

  const handleReturnToDashboard = () => {
    clearSession();
    router.replace("/(student)/(tabs)/dashboard" as any);
  };

  const handlePracticeAgain = () => {
    clearSession();
    router.replace("/(student)/(tabs)/interview" as any);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#1F3A5F] items-center justify-center px-6">
        <ActivityIndicator size="large" color="#79D5C8" />
        <Text className="text-white font-extrabold text-xl mt-6">Saving interview results...</Text>
        <Text className="text-[#BFD6EA] text-sm text-center mt-2 font-medium px-4 leading-5">
          Confirming your completed report with the server.
        </Text>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F8FB] items-center justify-center px-6" edges={["top", "bottom"]}>
        <Text className="text-[#1F3A5F] text-lg font-bold text-center mb-2">Results not confirmed</Text>
        <Text className="text-[#4F6B82] text-sm text-center leading-5 mb-6 px-4">
          {reportError || "We couldn't put together your result. Your answers are safe — try again or go back to the dashboard."}
        </Text>
        <View className="w-full gap-3">
          {canRetry && uid && sessionId ? <PrimaryButton title="Try again" onPress={generateReport} /> : null}
          {!canRetry && uid && sessionId ? <SecondaryButton title="Dismiss recovery notice" onPress={async () => {
            try { await withTimeout(forgetInterviewCompletion(uid, sessionId), 5000, 'Recovery cleanup timed out'); handleReturnToDashboard(); }
            catch { setReportError('Unable to dismiss the recovery notice. Please try again.'); }
          }} /> : null}
          <SecondaryButton title="Return to dashboard" onPress={handleReturnToDashboard} />
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB]" edges={["top", "bottom"]}>
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-[#EAF2F7] bg-white z-10">
         <TouchableOpacity onPress={handleReturnToDashboard} className="flex-row items-center">
            <Ionicons name="arrow-back" size={24} color="#1F3A5F" />
            <Text className="text-[#1F3A5F] font-bold ml-2">Dashboard</Text>
         </TouchableOpacity>
         <Text className="text-sm font-extrabold text-[#1F3A5F]">Interview Summary</Text>
         <View className="w-16" />
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* OVERALL SCORE */}
        <View className="bg-white rounded-3xl p-6 items-center mb-6 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <Text className="text-xs font-bold text-[#4F6B82] uppercase tracking-wider mb-4">Your interview score</Text>
          {typeof report.overallPerformance === "number" ? (
            <>
              <View className="h-32 w-32 rounded-full border-8 border-[#79D5C8] items-center justify-center bg-[#F1FAF8] mb-4 px-2">
                <Text className="text-4xl font-black text-[#1E5D53]" numberOfLines={1} adjustsFontSizeToFit>{report.overallPerformance}</Text>
              </View>
              <Text className="text-base font-extrabold text-[#1F3A5F]">
                {report.overallPerformance >= 80 ? "Strong Potential" : report.overallPerformance >= 60 ? "Solid Baseline" : "Needs Practice"}
              </Text>
            </>
          ) : (
            <Text className="text-base font-extrabold text-[#1F3A5F] text-center">
              Interview complete — review your feedback below.
            </Text>
          )}
        </View>

        {/* STRENGTHS */}
        {Array.isArray(report.strengths) && report.strengths.length > 0 && (
          <View className="mb-6">
            <Text className="text-sm font-extrabold text-[#1F3A5F] uppercase tracking-wider mb-3">Key Strengths</Text>
            <View className="bg-white rounded-2xl p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
               {report.strengths.filter((value: unknown) => typeof value === "string").map((str: string, idx: number) => (
                 <View key={idx} className="flex-row items-start mb-3 last:mb-0">
                   <Ionicons name="checkmark-circle" size={20} color="#79D5C8" style={{ marginRight: 10, marginTop: -2 }} />
                   <Text className="flex-1 text-[#4F6B82] font-medium leading-5">{str}</Text>
                 </View>
               ))}
            </View>
          </View>
        )}

        {/* AREAS TO IMPROVE */}
        {Array.isArray(report.areasToImprove) && report.areasToImprove.length > 0 && (
          <View className="mb-6">
            <Text className="text-sm font-extrabold text-[#1F3A5F] uppercase tracking-wider mb-3">Areas to Improve</Text>
            <View className="bg-white rounded-2xl p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
               {report.areasToImprove.filter((value: unknown) => typeof value === "string").map((str: string, idx: number) => (
                 <View key={idx} className="flex-row items-start mb-3 last:mb-0">
                   <Ionicons name="alert-circle" size={20} color="#F4A47A" style={{ marginRight: 10, marginTop: -2 }} />
                   <Text className="flex-1 text-[#4F6B82] font-medium leading-5">{str}</Text>
                 </View>
               ))}
            </View>
          </View>
        )}

        {/* WEAKEST ANSWER */}
        {report.weakestAnswer && typeof report.weakestAnswer.question === "string" && (
          <View className="mb-6">
            <Text className="text-sm font-extrabold text-[#1F3A5F] uppercase tracking-wider mb-3">Hardest Question</Text>
            <View className="bg-[#FEF2F2] rounded-2xl p-5 border border-[#FCA5A5]">
               <View className="flex-row items-center mb-1">
                 <Ionicons name="close-circle" size={14} color="#D32F2F" style={{ marginRight: 6 }} />
                 <Text className="text-xs font-bold text-[#D32F2F] uppercase">The Question</Text>
               </View>
               <Text className="text-sm font-bold text-[#1F3A5F] mb-4">"{report.weakestAnswer.question}"</Text>

               <View className="flex-row items-center mb-1">
                 <Ionicons name="alert-circle" size={14} color="#D32F2F" style={{ marginRight: 6 }} />
                 <Text className="text-xs font-bold text-[#D32F2F] uppercase">What to fix</Text>
               </View>
               <Text className="text-sm font-medium text-[#4F6B82] leading-5 mb-4">{typeof report.weakestAnswer.whyItWasWeak === "string" ? report.weakestAnswer.whyItWasWeak : "Not available in this report."}</Text>

               <Text className="text-xs font-bold text-[#1E5D53] mb-1 uppercase">How to improve</Text>
               <Text className="text-sm font-medium text-[#1E5D53] leading-5 bg-[#F1FAF8] p-3 rounded-xl border border-[#D7F1ED]">
                 {typeof report.weakestAnswer.howToImprove === "string" ? report.weakestAnswer.howToImprove : "Not available in this report."}
               </Text>
            </View>
          </View>
        )}

      </ScrollView>

      <View className="px-6 pt-4 bg-white border-t border-[#EAF2F7]" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <View className="gap-3">
          <PrimaryButton
            title="Return to Dashboard"
            variant="orange"
            onPress={handleReturnToDashboard}
          />
          <SecondaryButton
            title="Practice Again"
            onPress={handlePracticeAgain}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
