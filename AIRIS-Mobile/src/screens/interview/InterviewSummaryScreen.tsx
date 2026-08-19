import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useInterviewStore } from "../../store/interviewStore";
import { generateInterviewReport } from "../../services/api/interviewApi";
import { PrimaryButton } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import { saveInterviewSession } from "../../services/firebase/interviewService";
import { saveUserActivity } from "../../services/firebase/activityService";

export default function InterviewSummaryScreen() {
  const router = useRouter();
  const { session, setFinalReport, clearSession } = useInterviewStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    if (!session) return;
    
    // If we already have it, don't generate again
    if (session.finalReport) {
      setLoading(false);
      return;
    }

    try {
      const response = await generateInterviewReport({
        targetRole: session.targetRole,
        program: session.program,
        parsedResume: {}, // In a full implementation, pass the active resume sections here if needed by the report prompt, though history + evaluations should be enough. Let's pass empty or cached if needed. The prompt uses them but history is most important.
        history: session.history,
        evaluations: session.evaluations,
      });
      setFinalReport(response);
      
      // Save to Firestore so it persists across reloads and for the dashboard
      const currentUser = useAuthStore.getState().currentUser;
      if (currentUser) {
        // use the updated session state directly from Zustand to ensure finalReport is included
        const updatedSession = useInterviewStore.getState().session;
        if (updatedSession) {
          await saveInterviewSession(currentUser.uid, updatedSession);
          await saveUserActivity(currentUser.uid, updatedSession.sessionId, {
            title: `Completed ${updatedSession.targetRole} Interview`,
            type: "Mock Interview",
            score: updatedSession.finalReport.overallPerformance
          });
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to generate interview report.");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToDashboard = () => {
    clearSession();
    router.replace("/(student)/(tabs)/dashboard" as any);
  };

  if (loading || !session?.finalReport) {
    return (
      <SafeAreaView className="flex-1 bg-[#1F3A5F] items-center justify-center px-6">
        <ActivityIndicator size="large" color="#79D5C8" />
        <Text className="text-white font-extrabold text-xl mt-6">Analyzing Performance...</Text>
        <Text className="text-[#BFD6EA] text-sm text-center mt-2 font-medium px-4 leading-5">
          Evaluating your answers against the core competencies for {session?.targetRole || 'the role'}.
        </Text>
      </SafeAreaView>
    );
  }

  const report = session.finalReport;

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
          <Text className="text-xs font-bold text-[#4F6B82] uppercase tracking-wider mb-4">Overall Performance</Text>
          <View className="h-32 w-32 rounded-full border-8 border-[#79D5C8] items-center justify-center bg-[#F1FAF8] mb-4">
             <Text className="text-5xl font-black text-[#1E5D53]">{report.overallPerformance}</Text>
          </View>
          <Text className="text-base font-extrabold text-[#1F3A5F]">
            {report.overallPerformance >= 80 ? "Strong Potential" : report.overallPerformance >= 60 ? "Solid Baseline" : "Needs Practice"}
          </Text>
        </View>

        {/* STRENGTHS */}
        {report.strengths && report.strengths.length > 0 && (
          <View className="mb-6">
            <Text className="text-sm font-extrabold text-[#1F3A5F] uppercase tracking-wider mb-3">Key Strengths</Text>
            <View className="bg-white rounded-2xl p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
               {report.strengths.map((str: string, idx: number) => (
                 <View key={idx} className="flex-row items-start mb-3 last:mb-0">
                   <Ionicons name="checkmark-circle" size={20} color="#79D5C8" style={{ marginRight: 10, marginTop: -2 }} />
                   <Text className="flex-1 text-[#4F6B82] font-medium leading-5">{str}</Text>
                 </View>
               ))}
            </View>
          </View>
        )}

        {/* AREAS TO IMPROVE */}
        {report.areasToImprove && report.areasToImprove.length > 0 && (
          <View className="mb-6">
            <Text className="text-sm font-extrabold text-[#1F3A5F] uppercase tracking-wider mb-3">Areas to Improve</Text>
            <View className="bg-white rounded-2xl p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
               {report.areasToImprove.map((str: string, idx: number) => (
                 <View key={idx} className="flex-row items-start mb-3 last:mb-0">
                   <Ionicons name="alert-circle" size={20} color="#F4A47A" style={{ marginRight: 10, marginTop: -2 }} />
                   <Text className="flex-1 text-[#4F6B82] font-medium leading-5">{str}</Text>
                 </View>
               ))}
            </View>
          </View>
        )}

        {/* WEAKEST ANSWER */}
        {report.weakestAnswer && (
          <View className="mb-6">
            <Text className="text-sm font-extrabold text-[#1F3A5F] uppercase tracking-wider mb-3">Weakest Moment</Text>
            <View className="bg-[#FEF5F1] rounded-2xl p-5 border border-[#FDEEE6]">
               <Text className="text-xs font-bold text-[#CA5D25] mb-1 uppercase">The Question</Text>
               <Text className="text-sm font-bold text-[#1F3A5F] mb-4">"{report.weakestAnswer.question}"</Text>
               
               <Text className="text-xs font-bold text-[#CA5D25] mb-1 uppercase">Why it was weak</Text>
               <Text className="text-sm font-medium text-[#4F6B82] leading-5 mb-4">{report.weakestAnswer.whyItWasWeak}</Text>
               
               <Text className="text-xs font-bold text-[#1E5D53] mb-1 uppercase">How to improve</Text>
               <Text className="text-sm font-medium text-[#1E5D53] leading-5 bg-[#F1FAF8] p-3 rounded-xl border border-[#D7F1ED]">
                 {report.weakestAnswer.howToImprove}
               </Text>
            </View>
          </View>
        )}

      </ScrollView>

      <View className="p-6 bg-white border-t border-[#EAF2F7]">
        <PrimaryButton 
          title="Return to Dashboard" 
          variant="orange" 
          onPress={handleReturnToDashboard} 
        />
      </View>
    </SafeAreaView>
  );
}
