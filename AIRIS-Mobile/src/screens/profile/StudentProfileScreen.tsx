import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import { PrimaryButton } from "../../components/ui";
import { fetchUserActivities, UserActivity } from "../../services/firebase/activityService";

export default function StudentProfileScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const currentUser = useAuthStore((state) => state.currentUser);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const updatePasswordAction = useAuthStore((state) => state.updatePasswordAction);
  const loading = useAuthStore((state) => state.loading);
  const authError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const activeResume = useResumeStore((state) => state.activeResume);
  const activeAnalysis = useResumeStore((state) => state.activeAnalysis);
  const retargetActiveResume = useResumeStore((state) => state.retargetActiveResume);

  const [activeTab, setActiveTab] = useState<"profile" | "settings">("profile");
  const [expandedPanel, setExpandedPanel] = useState<"account" | "privacy" | "about" | null>(null);

  const [editName, setEditName] = useState(currentUser?.fullName || "");
  const [editCollege, setEditCollege] = useState(currentUser?.college || "");
  const [editProgram, setEditProgram] = useState(currentUser?.degreeProgram || "");
  const [editCareer, setEditCareer] = useState(currentUser?.targetPosition || "");

  const [isRetargeting, setIsRetargeting] = useState(false);
  const [retargetStatusText, setRetargetStatusText] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passVisible, setPassVisible] = useState(false);
  const [confirmPassVisible, setConfirmPassVisible] = useState(false);

  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.fullName);
      setEditCollege(currentUser.college || "");
      setEditProgram(currentUser.degreeProgram || "");
      setEditCareer(currentUser.targetPosition || "");
      loadActivities();
    }
  }, [currentUser]);

  const loadActivities = async () => {
    if (!currentUser?.uid) return;
    try {
      const fetchedActivities = await fetchUserActivities(currentUser.uid);
      setActivities(fetchedActivities);
    } catch (e) {
      console.error("Failed to load activities", e);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const togglePanel = (panel: "account" | "privacy" | "about") => {
    clearError();
    setExpandedPanel(expandedPanel === panel ? null : panel);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("Required Field", "Full name cannot be empty.");
      return;
    }
    clearError();
    const targetChanged = editCareer.trim().toLowerCase() !== (currentUser?.targetPosition || "").trim().toLowerCase();

    try {
      if (targetChanged && currentUser?.hasUploadedResume && activeResume?.rawText) {
        setIsRetargeting(true);
        setRetargetStatusText(`Analyzing resume alignment for ${editCareer.trim()}...`);

        // 1. Update profile in database & auth store
        await updateProfile(editName, editCollege, editProgram, editCareer.trim());

        // 2. Perform ONE intentional role retarget analysis
        try {
          await retargetActiveResume(editCareer.trim());
          Alert.alert(
            "Career Target Updated",
            `Your profile has been saved and your resume has been re-targeted for "${editCareer.trim()}". Your dashboard, interview prep, and learning recommendations have been updated.`
          );
        } catch (retargetErr) {
          Alert.alert(
            "Retargeting Incomplete",
            "Your target role was updated, but the new resume analysis could not be completed at this time. Your previous analysis remains active and safe."
          );
        }

        setIsRetargeting(false);
        setRetargetStatusText("");
      } else {
        await updateProfile(editName, editCollege, editProgram, editCareer.trim());
        Alert.alert("Success", "Profile details saved successfully.");
      }
      setExpandedPanel(null);
    } catch (err) {
      setIsRetargeting(false);
      setRetargetStatusText("");
      Alert.alert("Save Error", err instanceof Error ? err.message : "Failed to update profile.");
    }
  };

  const handleCancelProfile = () => {
    if (currentUser) {
      setEditName(currentUser.fullName);
      setEditCollege(currentUser.college || "");
      setEditProgram(currentUser.degreeProgram || "");
      setEditCareer(currentUser.targetPosition || "");
    }
    setExpandedPanel(null);
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert("Weak Password", "New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "Confirm password does not match new password.");
      return;
    }

    clearError();
    try {
      await updatePasswordAction(newPassword);
      Alert.alert("Success", "Account password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
      setExpandedPanel(null);
    } catch (err) {
      Alert.alert(
        "Update Error",
        err instanceof Error ? err.message : "Failed to update password. You may need to sign out and log back in to perform security actions."
      );
    }
  };

  const resumeScans = activities.filter(a => a.type === "Resume Analysis").length;
  const mockPracticed = activities.filter(a => a.type === "Mock Interview").length;

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between py-4">
        <View>
          <Text className="text-sm font-bold text-[#4F6B82] uppercase tracking-wider">User Settings</Text>
          <Text className="text-2xl font-extrabold text-[#1F3A5F]">My Profile</Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          className="rounded-full bg-white p-2.5 border border-[#BFD6EA]"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
        >
          <Ionicons name="log-out-outline" size={22} color="#CA5D25" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        <View className="rounded-3xl bg-white p-6 border border-[#BFD6EA] items-center" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <View className="h-20 w-20 items-center justify-center rounded-full bg-[#79D5C8] mb-4 shadow-sm border-2 border-white">
            <Ionicons name="person" size={42} color="white" />
          </View>

          <Text className="text-2xl font-extrabold text-[#1F3A5F] text-center">
            {currentUser?.fullName || "TIP Student"}
          </Text>
          <Text className="text-sm font-semibold text-[#4F6B82] mt-1 text-center px-4">
            {currentUser?.degreeProgram || "Not Selected"}
          </Text>

          {currentUser?.targetPosition ? (
            <View className="mt-4 bg-[#FEF5F1] px-4 py-1.5 rounded-full border border-[#F4A47A]">
              <Text className="text-xs font-bold text-[#CA5D25] uppercase tracking-wider">
                {currentUser.targetPosition}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row bg-[#EAF2F7] p-1.5 rounded-xl mt-6 mb-4 border border-[#BFD6EA]">
          <TouchableOpacity
            onPress={() => { clearError(); setActiveTab("profile"); }}
            className={`flex-1 py-3 rounded-lg items-center ${activeTab === "profile" ? "bg-white border border-[#BFD6EA]" : ""}`}
            style={activeTab === "profile" ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : {}}
          >
            <Text className={`text-sm font-bold ${activeTab === "profile" ? "text-[#1F3A5F]" : "text-[#4F6B82]"}`}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { clearError(); setActiveTab("settings"); }}
            className={`flex-1 py-3 rounded-lg items-center ${activeTab === "settings" ? "bg-white border border-[#BFD6EA]" : ""}`}
            style={activeTab === "settings" ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : {}}
          >
            <Text className={`text-sm font-bold ${activeTab === "settings" ? "text-[#1F3A5F]" : "text-[#4F6B82]"}`}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "profile" ? (
          <View className="gap-5">

            <View className="rounded-2xl bg-white p-6 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
              <Text className="text-sm font-bold text-[#1F3A5F] mb-4 uppercase tracking-wider">Personal Details</Text>

              <View className="gap-4">
                <View className="flex-row justify-between py-2 border-b border-[#EAF2F7]">
                  <Text className="text-sm font-medium text-[#4F6B82]">Registered Email</Text>
                  <Text className="text-sm font-bold text-[#1F3A5F]">{currentUser?.email}</Text>
                </View>
                <View className="flex-row justify-between py-2 border-b border-[#EAF2F7]">
                  <Text className="text-sm font-medium text-[#4F6B82]">Associated College</Text>
                  <Text className="text-sm font-bold text-[#1F3A5F] flex-1 text-right ml-4" numberOfLines={1}>{currentUser?.college || "Not Set"}</Text>
                </View>
                <View className="flex-row justify-between py-2 border-b border-[#EAF2F7]">
                  <Text className="text-sm font-medium text-[#4F6B82]">Account Privilege</Text>
                  <View className="bg-[#EAF2F7] px-3 py-1 rounded-full">
                    <Text className="text-[10px] font-bold text-[#1F3A5F] uppercase tracking-wider">{currentUser?.role}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="rounded-2xl bg-white p-6 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
              <Text className="text-sm font-bold text-[#1F3A5F] mb-4 uppercase tracking-wider">Activity Summary</Text>

              <View className="flex-row gap-4">
                <View className="flex-1 bg-[#F4F8FB] border border-[#BFD6EA] p-4 rounded-xl items-center">
                  <View className="h-10 w-10 bg-white rounded-full items-center justify-center mb-2 shadow-sm">
                    <Ionicons name="document-text" size={20} color="#79D5C8" />
                  </View>
                  <Text className="text-xl font-extrabold text-[#1F3A5F]">{resumeScans}</Text>
                  <Text className="text-[10px] font-bold text-[#4F6B82] uppercase tracking-wider text-center mt-1">Resume Scans</Text>
                </View>
                <View className="flex-1 bg-[#F4F8FB] border border-[#BFD6EA] p-4 rounded-xl items-center">
                  <View className="h-10 w-10 bg-white rounded-full items-center justify-center mb-2 shadow-sm">
                    <Ionicons name="videocam" size={20} color="#F4A47A" />
                  </View>
                  <Text className="text-xl font-extrabold text-[#1F3A5F]">{mockPracticed}</Text>
                  <Text className="text-[10px] font-bold text-[#4F6B82] uppercase tracking-wider text-center mt-1">Mock Practiced</Text>
                </View>
              </View>

              <Text className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wider mt-8 mb-4">Timeline Logs</Text>

              {loadingActivities ? (
                <ActivityIndicator size="small" color="#79D5C8" />
              ) : activities.length > 0 ? (
                activities.map((activity, index) => (
                  <View key={activity.id} className="flex-row items-start pl-2">
                    <View className="items-center mr-4">
                      <View className="h-4 w-4 rounded-full bg-[#79D5C8] border-2 border-white shadow-sm" />
                      {index !== activities.length - 1 && <View className="w-0.5 h-12 bg-[#EAF2F7] mt-1" />}
                    </View>
                    <View className="flex-1 pb-4">
                      <Text className="text-sm font-bold text-[#1F3A5F]">{activity.title}</Text>
                      <Text className="text-[11px] text-[#4F6B82] font-medium mt-1">
                        Type: {activity.type} | Score: {activity.score}
                        {activity.completedAt && ` | ${new Date(activity.completedAt.seconds ? activity.completedAt.seconds * 1000 : activity.completedAt).toLocaleDateString()}`}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-sm text-[#8B95A5] italic pl-2">No activity history logged yet.</Text>
              )}
            </View>
          </View>
        ) : (
          <View className="gap-4">

            <View className="rounded-2xl bg-white border border-[#BFD6EA] overflow-hidden" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
              <TouchableOpacity
                onPress={() => togglePanel("account")}
                activeOpacity={0.85}
                className="flex-row items-center justify-between p-5"
              >
                <View className="flex-row items-center">
                  <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-[#EAF2F7]">
                    <Ionicons name="card" size={20} color="#1F3A5F" />
                  </View>
                  <Text className="text-base font-bold text-[#1F3A5F]">Account Details</Text>
                </View>
                <Ionicons
                  name={expandedPanel === "account" ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#8B95A5"
                />
              </TouchableOpacity>

              {expandedPanel === "account" && (
                <View className="px-5 pb-6 border-t border-[#EAF2F7] pt-5 gap-5">
                  <View className="gap-2">
                    <Text className="text-xs font-bold text-[#4F6B82] ml-1 uppercase tracking-wider">Full Name</Text>
                    <TextInput
                      className="rounded-xl border border-[#BFD6EA] px-4 py-3 text-base text-[#1F3A5F] bg-[#F4F8FB] h-12"
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Full Name"
                      placeholderTextColor="#94A3B8"
                      editable={!loading}
                    />
                  </View>

                  <View className="gap-2">
                    <Text className="text-xs font-bold text-[#4F6B82] ml-1 uppercase tracking-wider">College Dept</Text>
                    <TextInput
                      className="rounded-xl border border-[#BFD6EA] px-4 py-3 text-base text-[#1F3A5F] bg-[#F4F8FB] h-12"
                      value={editCollege}
                      onChangeText={setEditCollege}
                      placeholder="e.g. College of Computer Studies"
                      placeholderTextColor="#94A3B8"
                      editable={!loading}
                    />
                  </View>

                  <View className="gap-2">
                    <Text className="text-xs font-bold text-[#4F6B82] ml-1 uppercase tracking-wider">Degree Program</Text>
                    <TextInput
                      className="rounded-xl border border-[#BFD6EA] px-4 py-3 text-base text-[#1F3A5F] bg-[#F4F8FB] h-12"
                      value={editProgram}
                      onChangeText={setEditProgram}
                      placeholder="e.g. BS Computer Science"
                      placeholderTextColor="#94A3B8"
                      editable={!loading}
                    />
                  </View>

                  <View className="gap-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-bold text-[#4F6B82] ml-1 uppercase tracking-wider">Preferred Career</Text>
                      {currentUser?.hasUploadedResume && (
                        <Text className="text-[10px] font-bold text-[#CA5D25] uppercase tracking-wider">
                          Re-targets active resume
                        </Text>
                      )}
                    </View>
                    <TextInput
                      className="rounded-xl border border-[#BFD6EA] px-4 py-3 text-base text-[#1F3A5F] bg-[#F4F8FB] h-12"
                      value={editCareer}
                      onChangeText={setEditCareer}
                      placeholder="e.g. Software Engineer"
                      placeholderTextColor="#94A3B8"
                      editable={!loading && !isRetargeting}
                    />

                    {/* Quick career suggestion pills */}
                    <View className="flex-row flex-wrap gap-1.5 mt-1">
                      {[
                        "Software Engineer",
                        "Data Analyst",
                        "Cybersecurity Analyst",
                        "Cloud Engineer",
                        "Frontend Developer",
                        "Backend Developer",
                        "QA Engineer",
                        "UI/UX Designer",
                      ].map((role) => (
                        <TouchableOpacity
                          key={role}
                          onPress={() => setEditCareer(role)}
                          disabled={loading || isRetargeting}
                          className={`px-2.5 py-1 rounded-full border ${
                            editCareer.trim().toLowerCase() === role.toLowerCase()
                              ? "bg-[#FEF5F1] border-[#F4A47A]"
                              : "bg-white border-[#BFD6EA]"
                          }`}
                        >
                          <Text
                            className={`text-[11px] font-semibold ${
                              editCareer.trim().toLowerCase() === role.toLowerCase()
                                ? "text-[#CA5D25] font-bold"
                                : "text-[#4F6B82]"
                            }`}
                          >
                            {role}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {isRetargeting && (
                      <View className="flex-row items-center gap-2 mt-2 p-3 bg-[#FEF5F1] rounded-xl border border-[#F4A47A]">
                        <ActivityIndicator size="small" color="#CA5D25" />
                        <Text className="text-xs font-bold text-[#CA5D25] flex-1">
                          {retargetStatusText || "Re-targeting resume..."}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row gap-3 mt-4">
                    <TouchableOpacity
                      onPress={handleCancelProfile}
                      disabled={loading || isRetargeting}
                      className="flex-1 h-14 items-center justify-center rounded-xl border border-[#BFD6EA] bg-white"
                    >
                      <Text className="text-sm font-bold text-[#4F6B82]">Cancel</Text>
                    </TouchableOpacity>
                    <View className="flex-1">
                      <PrimaryButton
                        title={isRetargeting ? "Re-targeting..." : "Save Changes"}
                        variant="orange"
                        onPress={handleSaveProfile}
                        loading={loading || isRetargeting}
                        disabled={loading || isRetargeting}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>

            <View className="rounded-2xl bg-white border border-[#BFD6EA] overflow-hidden" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
              <TouchableOpacity
                onPress={() => togglePanel("privacy")}
                activeOpacity={0.85}
                className="flex-row items-center justify-between p-5"
              >
                <View className="flex-row items-center">
                  <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-[#EAF2F7]">
                    <Ionicons name="shield-checkmark" size={20} color="#1F3A5F" />
                  </View>
                  <Text className="text-base font-bold text-[#1F3A5F]">Privacy & Security</Text>
                </View>
                <Ionicons
                  name={expandedPanel === "privacy" ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#8B95A5"
                />
              </TouchableOpacity>

              {expandedPanel === "privacy" && (
                <View className="px-5 pb-6 border-t border-[#EAF2F7] pt-5 gap-5">
                  <Text className="text-sm font-bold text-[#CA5D25] uppercase tracking-wider">Change Password</Text>

                  <View className="gap-2">
                    <Text className="text-xs font-bold text-[#4F6B82] ml-1 uppercase tracking-wider">New Password</Text>
                    <View className="flex-row items-center rounded-xl border border-[#BFD6EA] px-4 bg-[#F4F8FB] h-12">
                      <TextInput
                        className="flex-1 text-base text-[#1F3A5F]"
                        style={{ paddingVertical: 0 }}
                        placeholder="New Password"
                        placeholderTextColor="#94A3B8"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!passVisible}
                        editable={!loading}
                      />
                      <TouchableOpacity
                        onPress={() => setPassVisible((v) => !v)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        className="p-2 -mr-2 items-center justify-center"
                      >
                        <Ionicons
                          name={passVisible ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color="#8B95A5"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="gap-2">
                    <Text className="text-xs font-bold text-[#4F6B82] ml-1 uppercase tracking-wider">Confirm Password</Text>
                    <View className="flex-row items-center rounded-xl border border-[#BFD6EA] px-4 bg-[#F4F8FB] h-12">
                      <TextInput
                        className="flex-1 text-base text-[#1F3A5F]"
                        style={{ paddingVertical: 0 }}
                        placeholder="Confirm Password"
                        placeholderTextColor="#94A3B8"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!confirmPassVisible}
                        editable={!loading}
                      />
                      <TouchableOpacity
                        onPress={() => setConfirmPassVisible((v) => !v)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        className="p-2 -mr-2 items-center justify-center"
                      >
                        <Ionicons
                          name={confirmPassVisible ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color="#8B95A5"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="mt-2">
                    <PrimaryButton
                      title="Update Password"
                      variant="orange"
                      onPress={handleUpdatePassword}
                      loading={loading}
                      disabled={loading || !newPassword || !confirmPassword}
                    />
                  </View>

                  {authError && (
                    <Text className="text-center text-sm font-bold text-[#CA5D25] px-2 mt-1">{authError}</Text>
                  )}

                  <View className="border-t border-[#EAF2F7] my-4 pt-5">
                    <Text className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wider mb-2">Data Privacy Statement</Text>
                    <Text className="text-xs leading-5 text-[#4F6B82]">
                      AIRIS complies with the Data Privacy Act of 2012. We collect profile details and resume content for mock interview prep and resume correlation tracking. We secure your information and do not share any record profiles with third-party vendors.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View className="rounded-2xl bg-white border border-[#BFD6EA] overflow-hidden" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
              <TouchableOpacity
                onPress={() => togglePanel("about")}
                activeOpacity={0.85}
                className="flex-row items-center justify-between p-5"
              >
                <View className="flex-row items-center">
                  <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-[#EAF2F7]">
                    <Ionicons name="information-circle" size={20} color="#1F3A5F" />
                  </View>
                  <Text className="text-base font-bold text-[#1F3A5F]">About AIRIS</Text>
                </View>
                <Ionicons
                  name={expandedPanel === "about" ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#8B95A5"
                />
              </TouchableOpacity>

              {expandedPanel === "about" && (
                <View className="px-5 pb-6 border-t border-[#EAF2F7] pt-5 gap-3">
                  <Text className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wider">Application Details</Text>
                  <Text className="text-sm leading-6 text-[#4F6B82]">
                    AIRIS is an AI-assisted resume analyzer and interactive interview simulation platform tailored to help fresh graduates build and evaluate their readiness for modern industry roles.
                  </Text>
                  <Text className="text-xs font-medium text-[#8B95A5] mt-2">Version 1.0.0 | © 2026 AIRIS Team</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
