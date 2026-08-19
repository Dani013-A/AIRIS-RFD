import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import { PrimaryButton } from "../../components/ui";
import { fetchUserActivities, UserActivity } from "../../services/firebase/activityService";

export default function StudentDashboardScreen() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const activeResume = useResumeStore((state) => state.activeResume);
  const activeAnalysis = useResumeStore((state) => state.activeAnalysis);

  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!currentUser?.uid) return;
      try {
        const fetchedActivities = await fetchUserActivities(currentUser.uid);
        if (isMounted) {
          setActivities(fetchedActivities);
        }
      } catch (error) {
        console.error("Failed to load activities:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid]);

  const userName = currentUser?.fullName || "Student";
  const userProgram = currentUser?.degreeProgram || "BS Computer Science";
  const targetJob = currentUser?.targetPosition || "Software Engineer";

  const resumeActivities = activities.filter(a => a.type === "Resume Analysis");
  const interviewActivities = activities.filter(a => a.type === "Mock Interview");

  const hasResume = resumeActivities.length > 0;
  const hasInterview = interviewActivities.length > 0;

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

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>

      {/* HERO / GREETING */}
      <View className="flex-row items-center justify-between py-6">
        <View className="flex-1 pr-3">
          <Text className="text-3xl font-extrabold text-[#1F3A5F]">
            {getGreeting()}, {userName}!
          </Text>
          <Text className="text-sm font-semibold text-[#4F6B82] mt-1" numberOfLines={1}>
            {userProgram}
          </Text>
          <Text className="text-xs font-bold text-[#CA5D25] mt-0.5" numberOfLines={1}>
            {targetJob}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleProfilePress}
          className="h-14 w-14 items-center justify-center rounded-full bg-[#79D5C8] border-2 border-white"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}
        >
          <Ionicons name="person" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

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
          ) : !hasInterview ? (
            <>
              <View className="items-center my-6">
                <View className="h-24 w-24 items-center justify-center rounded-full bg-[#EAF2F7]">
                  <Ionicons name="bar-chart-outline" size={40} color="#1F3A5F" />
                </View>
              </View>

              <Text className="text-base font-bold text-center text-[#1F3A5F]">
                Incomplete Data
              </Text>
              <Text className="mt-1.5 text-sm text-center text-[#4F6B82] px-6 leading-5">
                Complete an interview simulation to unlock your full employability score!
              </Text>
            </>
          ) : (
            <View className="flex-row items-center justify-between w-full py-4">
              <View className="flex-1 pr-6">
                <Text className="text-sm text-[#4F6B82] leading-5 font-medium">
                  Your preparedness score is based on 60% interview performance and 40% resume scoring.
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
            <Text className="text-xs font-medium text-[#4F6B82] mt-2 leading-4">40% Weight</Text>
          </View>

          <View className="flex-1 rounded-2xl bg-white p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <Text className="text-[10px] font-bold text-[#4F6B82] uppercase tracking-wider mb-2">Interview Score</Text>
            <View className="flex-row items-baseline">
              <Text className="text-3xl font-black text-[#1F3A5F]">{hasInterview ? interviewScore : '--'}</Text>
              {hasInterview && <Text className="text-sm font-bold text-[#8B95A5] ml-1">/ 100</Text>}
            </View>
            <Text className="text-xs font-medium text-[#4F6B82] mt-2 leading-4">60% Weight</Text>
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
            Step into a virtual interview room and practice answering questions. Build confidence and improve your communication skills.
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
                   No recent activity recorded.
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
                <TouchableOpacity onPress={() => router.push(activity.type === 'Mock Interview' ? "/(student)/(tabs)/interview" as any : "/(student)/(tabs)/resume" as any)} className="bg-[#FEF5F1] px-4 py-2 rounded-full border border-[#FDEEE6]">
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
