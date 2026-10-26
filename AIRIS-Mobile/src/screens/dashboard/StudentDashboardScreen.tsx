import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, ScrollView, TouchableOpacity, View, ActivityIndicator, RefreshControl } from "react-native";
import { Text } from "../../components/ui/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import { PrimaryButton, UserAvatar } from "../../components/ui";
import { fetchUserActivities, UserActivity } from "../../services/firebase/activityService";

import { pendingInterviewCompletion } from '../../services/firebase/pendingInterviewCompletion';
import { withTimeout } from '../../utils/promiseTimeout';

export default function StudentDashboardScreen() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const activeResume = useResumeStore((state) => state.activeResume);
  const activeAnalysis = useResumeStore((state) => state.activeAnalysis);

  const [activityResult, setActivityResult] = useState<{uid: string; rows: UserActivity[]} | null>(null);
  const activities = activityResult && activityResult.uid === currentUser?.uid ? activityResult.rows : [];
  const [pending, setPending] = useState<{uid: string; id: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useFocusEffect(useCallback(() => {
    let current = true;
    const uid = currentUser?.uid;
    setIsLoading(true);
    setActivityError(null);
    if (!uid) { setIsLoading(false); return; }
    void Promise.allSettled([
      withTimeout(fetchUserActivities(uid), 15000, 'Activity read timed out'),
      withTimeout(pendingInterviewCompletion(uid), 10000, 'Recovery read timed out'),
    ]).then(([history, recovery]) => {
      if (!current) return;
      if (history.status === 'fulfilled') setActivityResult({uid, rows: history.value});
      else setActivityError('Unable to refresh your saved activity. Please try again.');
      if (recovery.status === 'rejected') setActivityError('Unable to check pending interview saves. Please try again.');
      setPending(recovery.status === 'fulfilled' && recovery.value ? {uid,id:recovery.value} : null);
      setIsLoading(false);
    });
    return () => { current = false; };
  }, [currentUser?.uid, refresh]));

  const userName = currentUser?.fullName || "Student";
  const userProgram = currentUser?.degreeProgram || "Degree Program Not Selected";
  const targetJob = currentUser?.targetPosition || "Target Role Not Selected";

  const resumeActivities = activities.filter(a => a.type === "Resume Analysis");
  const interviewActivities = activities.filter(a => a.type === "Mock Interview");

  const hasResume = resumeActivities.length > 0 && Number.isFinite(resumeActivities[0].score) && resumeActivities[0].score >= 0 && resumeActivities[0].score <= 100;
  const hasInterview = interviewActivities.length > 0 && Number.isFinite(interviewActivities[0].score) && interviewActivities[0].score >= 0 && interviewActivities[0].score <= 100;

  const resumeScore = hasResume ? resumeActivities[0].score : 0;
  const interviewScore = hasInterview ? interviewActivities[0].score : 0;

  // Calculate readiness score (60% interview, 40% resume).
  const employabilityScore = Math.round((interviewScore * 0.60) + (resumeScore * 0.40));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const handleProfilePress = () => {
    router.push("/(student)/(tabs)/profile" as any);
  };

  const handleViewActivity = (activity: UserActivity) => {
    if (activity.type === "Mock Interview") {
      try {
        if (!activity.id) throw new Error('Missing interview reference');
        router.push({ pathname: '/(student)/interview-session/saved', params: { sessionId: activity.id } } as any);
      } catch {
        Alert.alert('Interview unavailable', 'Unable to open this saved interview. Please try again from the dashboard.');
      }
    } else {
      router.push({
        pathname: "/(student)/resume-view",
        params: {
          activityId: activity.id,
          analysisId: activity.analysisId || activity.metadata?.analysisId || activity.id,
          resumeId: activity.resumeId || activity.metadata?.resumeId || "",
          targetPosition: activity.targetPosition || activity.metadata?.targetPosition || "",
          title: activity.title,
        },
      } as any);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>

      {/* HERO / GREETING */}
      <View className="flex-row items-center justify-between py-6">
        <View className="flex-1 pr-3">
          <Text className="text-3xl font-extrabold text-[#1F3A5F]">
            {getGreeting()}, {userName}!
          </Text>
          <Text className="text-sm font-semibold text-[#4F6B82] mt-1">
            {userProgram}
          </Text>
          <Text className="text-xs font-bold text-[#CA5D25] mt-0.5">
            {targetJob}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleProfilePress}
          accessibilityRole="button"
          accessibilityLabel="Open your profile"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}
        >
          <UserAvatar uid={currentUser?.uid} size={56} />
        </TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => setRefresh(value => value + 1)} />} className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {activityError ? <View className="px-6 pt-4"><Text className="text-[#B91C1C]">{activityError}</Text><PrimaryButton title="Refresh saved activity" onPress={() => setRefresh(value => value + 1)} /></View> : null}
        {pending?.uid === currentUser?.uid && pending ? <View className="px-6 pt-4"><Text className="text-[#4F6B82] mb-3">An interview is waiting for save confirmation.</Text><PrimaryButton title="Resume saving interview" onPress={() => router.push({pathname:'/(student)/interview-session/summary',params:{sessionId:pending.id}} as any)} /></View> : null}


        {/* EMPLOYABILITY SCORE CARD */}
        <View className="rounded-3xl bg-white p-6 border border-[#BFD6EA] mt-2 items-center" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <Text className="text-lg font-extrabold text-[#1F3A5F] self-start mb-2">
            Employability Preparedness
          </Text>

          {isLoading ? (
            <View className="items-center my-6">
              <ActivityIndicator size="large" color="#F4A47A" />
              <Text className="mt-3 text-sm font-bold text-[#4F6B82]">Calculating score...</Text>
            </View>
          ) : !hasResume || !hasInterview ? (
            <>
              <View className="items-center my-6">
                <View className="h-24 w-24 items-center justify-center rounded-full bg-[#EAF2F7]">
                  <Ionicons name="bar-chart-outline" size={40} color="#1F3A5F" />
                </View>
              </View>

              <Text className="text-base font-bold text-center text-[#1F3A5F]">
                No score yet
              </Text>
              <Text className="mt-1.5 text-sm text-center text-[#4F6B82] px-6 leading-5">
                Finish one practice interview to see your score here.
              </Text>
            </>
          ) : (
            <View className="flex-row items-center justify-between w-full py-4">
              <View className="flex-1 pr-6">
                <Text className="text-sm text-[#4F6B82] leading-5 font-medium">
                  Based on your interview (60%) and your resume (40%).
                </Text>
              </View>
              <View className="h-20 w-20 items-center justify-center rounded-full bg-[#F1FAF8] border-2 border-[#D7F1ED]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                <Text className="text-2xl font-black text-[#1E5D53]">{employabilityScore}%</Text>
              </View>
            </View>
          )}
        </View>

        {/* BREAKDOWN CARDS */}
        <View className="flex-row gap-4 mt-4 px-1">
          <View className="flex-1 rounded-2xl bg-white p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <Text className="text-[10px] font-bold text-[#4F6B82] uppercase tracking-wider mb-2">Resume Score</Text>
            <View className="flex-row items-baseline">
              <Text className="text-3xl font-black text-[#1F3A5F]">{hasResume ? resumeScore : '--'}</Text>
              {hasResume && <Text className="text-sm font-bold text-[#8B95A5] ml-1">/ 100</Text>}
            </View>
            <Text className="text-xs font-medium text-[#4F6B82] mt-2 leading-4">Counts 40% of your score</Text>
          </View>

          <View className="flex-1 rounded-2xl bg-white p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <Text className="text-[10px] font-bold text-[#4F6B82] uppercase tracking-wider mb-2">Interview Score</Text>
            <View className="flex-row items-baseline">
              <Text className="text-3xl font-black text-[#1F3A5F]">{hasInterview ? interviewScore : '--'}</Text>
              {hasInterview && <Text className="text-sm font-bold text-[#8B95A5] ml-1">/ 100</Text>}
            </View>
            <Text className="text-xs font-medium text-[#4F6B82] mt-2 leading-4">Counts 60% of your score</Text>
          </View>
        </View>

        {/* IMMERSIVE VR CARD */}
        <View className="rounded-3xl bg-white p-6 border border-[#BFD6EA] mt-6 relative overflow-hidden" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>

          <View className="absolute -bottom-6 -right-6 opacity-[0.03] pointer-events-none">
            <Ionicons name="cube" size={140} color="#1F3A5F" />
          </View>

          <View className="bg-[#EAF2F7] border border-[#BFD6EA] px-3 py-1 rounded-full self-start mb-4">
            <Text className="text-[10px] font-bold text-[#1F3A5F] uppercase tracking-wider">
              Immersive VR
            </Text>
          </View>

          <Text className="text-2xl font-extrabold text-[#1F3A5F] pr-4">
            Practice in a Realistic 3D Interview Environment
          </Text>

          <Text className="mt-3 text-sm leading-5 text-[#4F6B82] pr-4 font-medium mb-6">
            Practice answering questions in a virtual interview room. Build confidence for real interviews.
          </Text>

          <PrimaryButton
             title="Start Experience"
             variant="orange"
             onPress={() => router.push("/(student)/(tabs)/interview" as any)}
          />
        </View>

        {/* TOP RECOMMENDATION CARD */}
        <View className="rounded-3xl bg-white p-6 border border-[#BFD6EA] mt-6 relative overflow-hidden" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>

          <View className="bg-[#FEF5F1] border border-[#F4A47A] px-3 py-1 rounded-full self-start mb-4">
            <Text className="text-[10px] font-bold text-[#CA5D25] uppercase tracking-wider">
              Top Recommendation
            </Text>
          </View>

          <Text className="text-2xl font-extrabold text-[#1F3A5F] pr-4">
            Professional Communication
          </Text>

          <Text className="mt-3 text-sm leading-5 text-[#4F6B82] pr-4 font-medium mb-6">
            Fundamental certification recommended for {targetJob}s from {userProgram.replace("Bachelor of Science in ", "")}.
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/(student)/(tabs)/learn" as any)}
            className="h-12 px-6 self-start rounded-full bg-[#EAF2F7] flex-row items-center justify-center border border-[#BFD6EA]"
          >
            <Text className="text-sm font-bold text-[#1F3A5F]">View Details</Text>
            <Ionicons name="arrow-forward" size={16} color="#1F3A5F" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        {/* RECENT ACTIVITY */}
        <View className="mt-8 mb-4">
          <Text className="text-lg font-extrabold text-[#1F3A5F] mb-1">Recent Activity</Text>

          {!hasResume && !hasInterview ? (
            <View className="mt-3 rounded-2xl bg-white p-5 border border-[#BFD6EA] flex-row items-center justify-between" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
              <View className="flex-row items-center flex-1 pr-4">
                 <View className="h-10 w-10 bg-[#F4F8FB] rounded-full items-center justify-center mr-4">
                   <Ionicons name="time" size={20} color="#4F6B82" />
                 </View>
                 <Text className="text-sm font-medium text-[#4F6B82] leading-5 flex-1">
                   Nothing here yet. Your resume checks and interviews will show up here.
                 </Text>
              </View>
            </View>
          ) : (
            activities.slice(0, 3).map((activity, index) => (
              <View key={activity.id + index} className="mt-3 rounded-2xl bg-white p-5 border border-[#BFD6EA] flex-row items-center justify-between" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                <View className="flex-row items-center flex-1 pr-4">
                   <View className={`h-10 w-10 rounded-full items-center justify-center mr-4 ${activity.type === 'Mock Interview' ? 'bg-[#FEF5F1]' : 'bg-[#F4F8FB]'}`}>
                     <Ionicons name={activity.type === 'Mock Interview' ? 'mic' : 'document-text'} size={20} color={activity.type === 'Mock Interview' ? '#CA5D25' : '#4F6B82'} />
                   </View>
                   <Text className="text-sm font-medium text-[#4F6B82] leading-5 flex-1">
                     {activity.title}
                   </Text>
                </View>
                <TouchableOpacity onPress={() => handleViewActivity(activity)} className="bg-[#FEF5F1] px-4 py-2 rounded-full border border-[#FDEEE6]">
                  <Text className="text-xs font-bold text-[#CA5D25]">View</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
