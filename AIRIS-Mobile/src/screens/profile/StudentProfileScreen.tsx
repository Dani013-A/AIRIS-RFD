import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
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
import { Image } from "expo-image";
import { tipManilaPrograms, tipManilaCollegePrograms } from "../../data/tipManilaPrograms";
import { PasswordRequirementsView } from "../../components/ui/PasswordRequirementsView";
import { validatePassword } from "../../utils/passwordPolicy";
import { validatePersonName, validateAcademicSelection } from "../../utils/inputValidator";
import { mapAuthError } from "../../utils/errorMapper";
import { resolveProfilePhoto, DEFAULT_PROFILE_FALLBACK } from "../../services/firebase/profilePhotoService";
import { evaluateCareerTargetCompatibility, CareerCompatibilityResult } from "../../services/ai/careerCompatibilityGuardrail";
import { CareerCompatibilityModal } from "../../components/ui/CareerCompatibilityModal";

export default function StudentProfileScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const currentUser = useAuthStore((state) => state.currentUser);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const updateProfilePhotoAction = useAuthStore((state) => state.updateProfilePhotoAction);
  const updatePasswordAction = useAuthStore((state) => state.updatePasswordAction);
  const deleteAccountAction = useAuthStore((state) => state.deleteAccountAction);
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

  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);

  const [isRetargeting, setIsRetargeting] = useState(false);
  const [retargetStatusText, setRetargetStatusText] = useState("");

  const [compatibilityResult, setCompatibilityResult] = useState<CareerCompatibilityResult | null>(null);
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassVisible, setCurrentPassVisible] = useState(false);
  const [passVisible, setPassVisible] = useState(false);
  const [confirmPassVisible, setConfirmPassVisible] = useState(false);

  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthPassVisible, setReauthPassVisible] = useState(false);
  const [reauthError, setReauthError] = useState("");
  const [reauthLoading, setReauthLoading] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  const [photoSource, setPhotoSource] = useState<{ uri?: string; defaultAsset?: any }>({ defaultAsset: DEFAULT_PROFILE_FALLBACK });

  useEffect(() => {
    let isMounted = true;
    if (currentUser?.uid) {
      resolveProfilePhoto(currentUser.uid).then((res) => {
        if (isMounted) setPhotoSource(res);
      });
    } else {
      setPhotoSource({ defaultAsset: DEFAULT_PROFILE_FALLBACK });
    }
    return () => { isMounted = false; };
  }, [currentUser?.uid, currentUser?.photoURL]);

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

  const executeSaveProfile = async (confirmed: boolean = false) => {
    const nameVal = validatePersonName(editName);
    const targetChanged = editCareer.trim().toLowerCase() !== (currentUser?.targetPosition || "").trim().toLowerCase();
    const academicChanged = editCollege.trim().toLowerCase() !== (currentUser?.college || "").trim().toLowerCase() ||
                            editProgram.trim().toLowerCase() !== (currentUser?.degreeProgram || "").trim().toLowerCase();

    try {
      if (targetChanged && currentUser?.hasUploadedResume && activeResume?.rawText) {
        setIsRetargeting(true);
        setRetargetStatusText(`Analyzing resume alignment for ${editCareer.trim()}...`);

        // 1. Update profile in database & auth store
        await updateProfile(nameVal.normalizedValue!, editCollege.trim(), editProgram.trim(), editCareer.trim());

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
        await updateProfile(nameVal.normalizedValue!, editCollege.trim(), editProgram.trim(), editCareer.trim());

        if (academicChanged && currentUser?.hasUploadedResume) {
          Alert.alert(
            "Academic Program Updated",
            "Your academic profile has been updated. If your course alignment or skill targets have changed, consider updating your target career or re-analyzing your resume for updated recommendations."
          );
        } else {
          Alert.alert("Success", "Profile details saved successfully.");
        }
      }
      setExpandedPanel(null);
      setShowCompatibilityModal(false);
      setCompatibilityResult(null);
    } catch (err) {
      setIsRetargeting(false);
      setRetargetStatusText("");
      Alert.alert("Save Error", err instanceof Error ? err.message : "Failed to update profile.");
    }
  };

  const handleSaveProfile = async () => {
    Keyboard.dismiss();
    const nameVal = validatePersonName(editName);
    if (!nameVal.isValid) {
      Alert.alert("Invalid Name", nameVal.message);
      return;
    }

    const academicVal = validateAcademicSelection(editCollege, editProgram);
    if (!academicVal.isValid) {
      Alert.alert("Invalid Academic Selection", academicVal.message);
      return;
    }

    if (!editCareer.trim()) {
      Alert.alert("Required Field", "Preferred career target cannot be empty.");
      return;
    }

    clearError();
    const targetChanged = editCareer.trim().toLowerCase() !== (currentUser?.targetPosition || "").trim().toLowerCase();
    const academicChanged = editCollege.trim().toLowerCase() !== (currentUser?.college || "").trim().toLowerCase() ||
                            editProgram.trim().toLowerCase() !== (currentUser?.degreeProgram || "").trim().toLowerCase();
    const profileChanged = targetChanged || academicChanged;

    if (profileChanged) {
      const compResult = evaluateCareerTargetCompatibility(
        editProgram,
        editCareer.trim(),
        (activeAnalysis as any)?.detectedSkills || activeAnalysis?.learningSnapshot?.careerContext?.detectedSkills || [],
        activeResume?.rawText || ""
      );

      if (compResult.classification === "DISTANT") {
        setCompatibilityResult(compResult);
        setShowCompatibilityModal(true);
        return; // Require explicit user confirmation modal before activating
      }

      if (compResult.classification === "PIVOT") {
        Alert.alert(
          "Career Transition Notice",
          compResult.reason,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Continue Transition", onPress: () => executeSaveProfile(true) }
          ]
        );
        return;
      }
    }

    await executeSaveProfile(false);
  };

  const handleCancelCompatibilityModal = () => {
    setShowCompatibilityModal(false);
    setCompatibilityResult(null);
    if (currentUser) {
      setEditCollege(currentUser.college || "");
      setEditProgram(currentUser.degreeProgram || "");
      setEditCareer(currentUser.targetPosition || "");
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
    if (!currentPassword) {
      Alert.alert("Current Password Required", "Please enter your current password to authorize this security change.");
      return;
    }

    const valResult = validatePassword(newPassword);
    if (!valResult.isValid) {
      Alert.alert("Password Requirements Not Met", valResult.message);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Password Mismatch", "Confirm password does not match the new password.");
      return;
    }

    clearError();
    try {
      await updatePasswordAction(currentPassword, newPassword);
      Alert.alert("Password Changed", "Your account password has been updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setExpandedPanel(null);
    } catch (err) {
      Alert.alert(
        "Update Failed",
        err instanceof Error ? err.message : "Failed to update password. Please check your credentials and try again."
      );
    }
  };

  const performDeleteCascade = async (passwordToUse: string) => {
    if (!passwordToUse || !passwordToUse.trim()) {
      setReauthError("Please enter your current password to confirm account deletion.");
      return;
    }

    setReauthError("");
    setShowReauthModal(false);
    setIsDeletingAccount(true);

    try {
      await deleteAccountAction(passwordToUse.trim());
      setTimeout(() => {
        setIsDeletingAccount(false);
        setReauthPassword("");
        router.replace("/(auth)/login");
      }, 400);
    } catch (err: any) {
      setIsDeletingAccount(false);
      setShowReauthModal(true);
      const msg = mapAuthError(err);
      setReauthError(msg || "Account deletion failed. Please verify your password and try again.");
    }
  };

  const handleDeleteAccount = () => {
    setReauthPassword("");
    setReauthError("");
    setShowReauthModal(true);
  };

  const resumeScans = activities.filter(a => a.type === "Resume Analysis").length;
  const mockPracticed = activities.filter(a => a.type === "Mock Interview").length;

  const handleUpdatePhoto = async () => {
    const success = await updateProfilePhotoAction();
    if (success) {
      Alert.alert("Success", "Profile photo updated successfully.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-5" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between py-4 mb-2">
        <View className="flex-row items-center">
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
          <TouchableOpacity
            onPress={handleUpdatePhoto}
            disabled={loading}
            activeOpacity={0.8}
            className="relative mb-4"
          >
            <View className="h-24 w-24 items-center justify-center rounded-full bg-[#79D5C8] shadow-sm border-2 border-white overflow-hidden">
              <Image
                source={photoSource.uri ? { uri: photoSource.uri } : (photoSource.defaultAsset || DEFAULT_PROFILE_FALLBACK)}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
            </View>
            <View className="absolute bottom-0 right-0 bg-[#CA5D25] rounded-full p-2 border-2 border-white shadow-sm">
              <Ionicons name="camera" size={14} color="white" />
            </View>
          </TouchableOpacity>

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
                      className="rounded-xl border border-[#BFD6EA] px-4 text-base text-[#1F3A5F] bg-[#F4F8FB] h-12"
                      style={{ paddingTop: 0, paddingBottom: 0, paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Full Name"
                      placeholderTextColor="#94A3B8"
                      editable={!loading}
                    />
                  </View>

                  <View className="gap-2">
                    <Text className="text-xs font-bold text-[#4F6B82] ml-1 uppercase tracking-wider">College Dept</Text>
                    <TouchableOpacity
                      onPress={() => setShowCollegeModal(true)}
                      disabled={loading || isRetargeting}
                      className="rounded-xl border border-[#BFD6EA] px-4 bg-[#F4F8FB] h-12 flex-row items-center justify-between"
                    >
                      <Text className={`text-base ${editCollege ? "text-[#1F3A5F] font-semibold" : "text-[#94A3B8]"}`}>
                        {editCollege || "Select College Department"}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color="#8B95A5" />
                    </TouchableOpacity>
                  </View>

                  <View className="gap-2">
                    <Text className="text-xs font-bold text-[#4F6B82] ml-1 uppercase tracking-wider">Degree Program</Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (!editCollege) {
                          Alert.alert("Select Department First", "Please select a College Department before selecting a Degree Program.");
                          return;
                        }
                        setShowProgramModal(true);
                      }}
                      disabled={loading || isRetargeting}
                      className="rounded-xl border border-[#BFD6EA] px-4 bg-[#F4F8FB] h-12 flex-row items-center justify-between"
                    >
                      <Text className={`text-base ${editProgram ? "text-[#1F3A5F] font-semibold" : "text-[#94A3B8]"}`}>
                        {editProgram || "Select Degree Program"}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color="#8B95A5" />
                    </TouchableOpacity>
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
                      className="rounded-xl border border-[#BFD6EA] px-4 text-base text-[#1F3A5F] bg-[#F4F8FB] h-12"
                      style={{ paddingTop: 0, paddingBottom: 0, paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
                      value={editCareer}
                      onChangeText={setEditCareer}
                      placeholder="e.g. Software Engineer"
                      placeholderTextColor="#94A3B8"
                      editable={!loading && !isRetargeting}
                    />

                    {/* Dynamic career suggestion pills from canonical academic catalog */}
                    <View className="flex-row flex-wrap gap-1.5 mt-1">
                      {(() => {
                        const collegeData = tipManilaCollegePrograms.find((c) => c.name.toLowerCase() === editCollege.toLowerCase());
                        const progData = collegeData?.programs.find((p) => p.name.toLowerCase() === editProgram.toLowerCase());
                        const dynamicSuggestions = progData?.suggestedPositions || [
                          "Software Engineer", "Data Analyst", "Civil Engineer", "Accountant", "Architect", "QA Engineer"
                        ];
                        return dynamicSuggestions.slice(0, 8).map((role) => (
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
                        ));
                      })()}
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
                    <Text className="text-xs font-bold text-[#4F6B82] ml-1 uppercase tracking-wider">Current Password</Text>
                    <View className="flex-row items-center rounded-xl border border-[#BFD6EA] px-4 bg-[#F4F8FB] h-12">
                      <TextInput
                        className="flex-1 h-full text-base text-[#1F3A5F]"
                        style={{ paddingTop: 0, paddingBottom: 0, paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
                        placeholder="Current Password"
                        placeholderTextColor="#94A3B8"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry={!currentPassVisible}
                        editable={!loading}
                      />
                      <TouchableOpacity
                        onPress={() => setCurrentPassVisible((v) => !v)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        className="p-2 -mr-2 items-center justify-center"
                      >
                        <Ionicons
                          name={currentPassVisible ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color="#8B95A5"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="gap-2">
                    <Text className="text-xs font-bold text-[#4F6B82] ml-1 uppercase tracking-wider">New Password</Text>
                    <View className="flex-row items-center rounded-xl border border-[#BFD6EA] px-4 bg-[#F4F8FB] h-12">
                      <TextInput
                        className="flex-1 h-full text-base text-[#1F3A5F]"
                        style={{ paddingTop: 0, paddingBottom: 0, paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
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

                    {newPassword ? <PasswordRequirementsView password={newPassword} /> : null}
                  </View>

                  <View className="gap-2">
                    <Text className="text-xs font-bold text-[#4F6B82] ml-1 uppercase tracking-wider">Confirm Password</Text>
                    <View className="flex-row items-center rounded-xl border border-[#BFD6EA] px-4 bg-[#F4F8FB] h-12">
                      <TextInput
                        className="flex-1 h-full text-base text-[#1F3A5F]"
                        style={{ paddingTop: 0, paddingBottom: 0, paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
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

                  <View className="border-t border-[#FEE2E2] pt-4">
                    <Text className="text-xs font-bold text-[#DC2626] uppercase tracking-wider mb-2">Danger Zone</Text>
                    <TouchableOpacity
                      onPress={handleDeleteAccount}
                      disabled={loading}
                      className="rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] py-3.5 items-center justify-center flex-row gap-2"
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                      <Text className="text-sm font-bold text-[#DC2626]">Delete Account & Data</Text>
                    </TouchableOpacity>
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

      {/* College Department Selection Modal */}
      <Modal visible={showCollegeModal} animationType="slide" transparent={true} onRequestClose={() => setShowCollegeModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%] border-t border-[#BFD6EA]">
            <View className="flex-row items-center justify-between pb-4 border-b border-[#EAF2F7] mb-4">
              <Text className="text-lg font-extrabold text-[#1F3A5F]">Select College Department</Text>
              <TouchableOpacity onPress={() => setShowCollegeModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="#8B95A5" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 20 }}>
              {tipManilaCollegePrograms.map((c) => {
                const isSelected = editCollege.toLowerCase() === c.name.toLowerCase();
                return (
                  <TouchableOpacity
                    key={c.name}
                    onPress={() => {
                      setEditCollege(c.name);
                      // Reset program if it doesn't belong to new college
                      const validInNewCollege = c.programs.some((p) => p.name.toLowerCase() === editProgram.toLowerCase());
                      if (!validInNewCollege && c.programs.length > 0) {
                        setEditProgram(c.programs[0].name);
                      }
                      setShowCollegeModal(false);
                    }}
                    className={`p-4 rounded-xl border flex-row items-center justify-between ${
                      isSelected ? "bg-[#FEF5F1] border-[#F4A47A]" : "bg-[#F4F8FB] border-[#EAF2F7]"
                    }`}
                  >
                    <Text className={`text-sm font-bold flex-1 pr-2 ${isSelected ? "text-[#CA5D25]" : "text-[#1F3A5F]"}`}>
                      {c.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#CA5D25" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Degree Program Selection Modal */}
      <Modal visible={showProgramModal} animationType="slide" transparent={true} onRequestClose={() => setShowProgramModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%] border-t border-[#BFD6EA]">
            <View className="flex-row items-center justify-between pb-4 border-b border-[#EAF2F7] mb-4">
              <Text className="text-lg font-extrabold text-[#1F3A5F]">Select Degree Program</Text>
              <TouchableOpacity onPress={() => setShowProgramModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="#8B95A5" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 20 }}>
              {(() => {
                const collegeData = tipManilaCollegePrograms.find((c) => c.name.toLowerCase() === editCollege.toLowerCase());
                const availablePrograms = collegeData ? collegeData.programs : [];
                return availablePrograms.map((p) => {
                  const isSelected = editProgram.toLowerCase() === p.name.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={p.name}
                      onPress={() => {
                        setEditProgram(p.name);
                        setShowProgramModal(false);
                      }}
                      className={`p-4 rounded-xl border flex-row items-center justify-between ${
                        isSelected ? "bg-[#FEF5F1] border-[#F4A47A]" : "bg-[#F4F8FB] border-[#EAF2F7]"
                      }`}
                    >
                      <Text className={`text-sm font-bold flex-1 pr-2 ${isSelected ? "text-[#CA5D25]" : "text-[#1F3A5F]"}`}>
                        {p.name}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color="#CA5D25" />}
                    </TouchableOpacity>
                  );
                });
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Account Deletion Reauthentication Modal */}
      <Modal
        visible={showReauthModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          if (!reauthLoading) {
            setShowReauthModal(false);
            setReauthPassword("");
            setReauthError("");
          }
        }}
      >
        <View className="flex-1 bg-black/60 justify-center px-5">
          <View className="bg-white rounded-3xl p-6 border border-[#BFD6EA] shadow-xl">
            <View className="flex-row items-center justify-between pb-4 border-b border-[#EAF2F7] mb-4">
              <View className="flex-row items-center gap-2">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-[#FEF2F2]">
                  <Ionicons name="lock-closed-outline" size={20} color="#DC2626" />
                </View>
                <Text className="text-lg font-extrabold text-[#1F3A5F]">Security Verification</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowReauthModal(false);
                  setReauthPassword("");
                  setReauthError("");
                }}
                disabled={reauthLoading}
                className="p-1"
              >
                <Ionicons name="close" size={22} color="#8B95A5" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm leading-6 text-[#4F6B82] mb-4">
              Please confirm your current password to continue deleting your account.
            </Text>

            <View className="gap-2 mb-4">
              <Text className="text-xs font-bold text-[#4F6B82] ml-1 uppercase tracking-wider">Current Password</Text>
              <View className="flex-row items-center rounded-xl border border-[#BFD6EA] px-4 bg-[#F4F8FB] h-12">
                <TextInput
                  className="flex-1 h-full text-base text-[#1F3A5F]"
                  style={{ paddingTop: 0, paddingBottom: 0, paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
                  placeholder="Enter current password"
                  placeholderTextColor="#94A3B8"
                  value={reauthPassword}
                  onChangeText={setReauthPassword}
                  secureTextEntry={!reauthPassVisible}
                  editable={!reauthLoading}
                />
                <TouchableOpacity
                  onPress={() => setReauthPassVisible((v) => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="p-2 -mr-2 items-center justify-center"
                >
                  <Ionicons
                    name={reauthPassVisible ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#8B95A5"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {reauthError ? (
              <Text className="text-center text-sm font-bold text-[#DC2626] mb-4 px-2">{reauthError}</Text>
            ) : null}

            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowReauthModal(false);
                  setReauthPassword("");
                  setReauthError("");
                }}
                disabled={reauthLoading}
                className="flex-1 h-12 rounded-xl bg-[#F4F8FB] border border-[#BFD6EA] items-center justify-center"
              >
                <Text className="text-sm font-bold text-[#1F3A5F]">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => performDeleteCascade(reauthPassword.trim())}
                disabled={reauthLoading || !reauthPassword.trim()}
                className={`flex-1 h-12 rounded-xl bg-[#DC2626] items-center justify-center flex-row gap-2 ${
                  reauthLoading || !reauthPassword.trim() ? "opacity-60" : ""
                }`}
              >
                {reauthLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={16} color="white" />
                    <Text className="text-sm font-bold text-white">Confirm Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dedicated Quick Account Deletion Loading Screen */}
      <Modal visible={isDeletingAccount} animationType="fade" transparent={true}>
        <View className="flex-1 bg-black/75 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-8 items-center w-full max-w-sm border border-[#BFD6EA] shadow-2xl">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-[#FEF2F2] mb-5 border border-[#FCA5A5]">
              <Ionicons name="trash-outline" size={32} color="#DC2626" />
            </View>
            <ActivityIndicator size="large" color="#DC2626" />
            <Text className="text-lg font-extrabold text-[#1F3A5F] text-center mt-5 mb-2">
              Ensuring all data is deleted from our system
            </Text>
            <Text className="text-xs text-center text-[#64748B] leading-5">
              Wiping profile records, resume analysis data, and security credentials...
            </Text>
          </View>
        </View>
      </Modal>

      <CareerCompatibilityModal
        visible={showCompatibilityModal}
        compatibilityResult={compatibilityResult}
        onCancel={handleCancelCompatibilityModal}
        onConfirm={() => executeSaveProfile(true)}
        isProcessing={isRetargeting}
      />
    </SafeAreaView>
  );
}
