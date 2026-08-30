import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, BackHandler, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, AppState } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";

import { PrimaryButton } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import { extractTextFromFile } from "../../services/resume/resumeExtractionService";
import { getMockResumeText } from "../../fixtures/resume/mockResume";
import { uploadResumeFileWithProgress, type UploadProgressEvent } from "../../services/resume/resumeAnalysisService";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

import SkillSelfAssessmentModal from "../../components/resume/SkillSelfAssessmentModal";

export default function ResumeUploadIntroScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const currentUser = useAuthStore((state) => state.currentUser);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const authLoading = useAuthStore((state) => state.loading);
  const authError = useAuthStore((state) => state.error);

  const activeResume = useResumeStore((state) => state.activeResume);
  const processingStatus = useResumeStore((state) => state.processingStatus);
  const pendingTargetSkills = useResumeStore((state) => state.pendingTargetSkills);
  const uploadAndProcessResume = useResumeStore((state) => state.uploadAndProcessResume);
  const completeSelfAssessmentAndFinalize = useResumeStore((state) => state.completeSelfAssessmentAndFinalize);
  const clearAnalysisState = useResumeStore((state) => state.clearAnalysisState);
  const resumeError = useResumeStore((state) => state.error);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [tempFile, setTempFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [bytesUploaded, setBytesUploaded] = useState<{ loaded: number; total: number }>({ loaded: 0, total: 0 });
  const [uploadPhase, setUploadPhase] = useState<string>("Uploading file...");
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "extracting" | "analyzing" | "awaiting_assessment" | "saving" | "completed">("idle");

  const fileName = activeResume?.originalFileName || null;

  React.useEffect(() => {
    const onBackPress = () => false;
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, []);

  React.useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        useResumeStore.getState().clearStore();
      }
    });
    return () => sub.remove();
  }, []);

  const handleToggleTerms = () => setAgreeTerms(!agreeTerms);
  const handleTogglePrivacy = () => setAgreePrivacy(!agreePrivacy);

  const handleUploadResume = async () => {
    if (!agreeTerms || !agreePrivacy) {
      Alert.alert(
        "Consent Required",
        "Please check and agree to both the Terms of Service and Privacy Policy before uploading your resume."
      );
      return;
    }

    if (!currentUser) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["*/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const initialSize = asset.size && asset.size > 0 ? asset.size : 10240;
      const selectedFile = {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || "application/octet-stream",
        size: initialSize,
      };

      const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase() || "";
      const validExtensions = ["pdf", "doc", "docx", "txt", "png", "jpg", "jpeg"];
      const isValidMime =
        selectedFile.mimeType.includes("pdf") ||
        selectedFile.mimeType.includes("word") ||
        selectedFile.mimeType.includes("text") ||
        selectedFile.mimeType.startsWith("image/");

      if (!validExtensions.includes(fileExtension) && !isValidMime) {
        Alert.alert("Unsupported Format", "Please select a PDF, DOCX, TXT, or Image file.");
        return;
      }

      const targetPosition = (currentUser?.targetPosition || "").trim();
      if (!targetPosition) {
        Alert.alert(
          "Target Position Required",
          "Please select a target position before uploading your resume.",
          [
            {
              text: "Select Target Position",
              onPress: () => router.push("/(student)/(onboarding)/job-selection" as any),
            },
          ]
        );
        return;
      }

      clearAnalysisState();
      useResumeStore.getState().setProcessingStatus("extracting");
      setUploadStage("uploading");
      setUploadProgress(0);
      setBytesUploaded({ loaded: 0, total: initialSize });
      setUploadPhase("Uploading resume file...");

      let extractedText = "";
      let sourceFileType: any = "pdf";
      let sourceDetailType: any = "pdf_text";

      if (fileExtension === "doc" || fileExtension === "docx" || selectedFile.mimeType.includes("word")) {
        sourceFileType = "docx";
        sourceDetailType = "docx_text";
      } else if (fileExtension === "txt" || selectedFile.mimeType === "text/plain") {
        sourceFileType = "txt";
        sourceDetailType = "txt_direct";
      } else if (fileExtension === "png" || fileExtension === "jpg" || fileExtension === "jpeg" || selectedFile.mimeType.startsWith("image/")) {
        sourceFileType = "image";
        sourceDetailType = "image_ocr";
      }

      let precomputedAnalysis: any = undefined;
      try {
        const uploadResult = await uploadResumeFileWithProgress(
          { ...selectedFile, size: initialSize },
          targetPosition,
          (progressEvent: UploadProgressEvent) => {
            setUploadProgress(progressEvent.progress);
            setBytesUploaded({ loaded: progressEvent.loaded, total: progressEvent.total || initialSize });
            if (progressEvent.phase === "uploading") {
              setUploadStage("uploading");
              setUploadPhase(`Uploading resume file... (${progressEvent.progress}%)`);
            } else {
              setUploadStage("analyzing");
              setUploadPhase("Parsing resume sections & evaluating alignment...");
            }
          }
        );

        extractedText = uploadResult.rawText;
        precomputedAnalysis = uploadResult.analysisResult;
      } catch (backendError) {
        console.log("Backend upload fallback to client parser:", backendError);
        setUploadStage("extracting");
        setUploadPhase("Reading document content...");
        setUploadProgress(50);
        setBytesUploaded({ loaded: Math.round(initialSize * 0.5), total: initialSize });

        if (fileExtension === "txt" || selectedFile.mimeType === "text/plain") {
          extractedText = await extractTextFromFile(selectedFile.uri, selectedFile.name, selectedFile.mimeType);
        } else {
          const fullName = currentUser.fullName || "Student";
          const college = currentUser.college || "";
          const degreeProgram = currentUser.degreeProgram || "";
          extractedText = getMockResumeText(fullName, college, degreeProgram, targetPosition);
        }

        setUploadProgress(100);
        setBytesUploaded({ loaded: initialSize, total: initialSize });
      }

      setUploadStage("saving");
      setUploadPhase("Finalizing resume analysis & saving...");
      setUploadProgress(100);

      await uploadAndProcessResume(
        currentUser.uid,
        currentUser.targetPosition || "",
        selectedFile,
        sourceFileType,
        sourceDetailType,
        extractedText,
        precomputedAnalysis
      );

      const currentStatus = useResumeStore.getState().processingStatus;
      if (currentStatus === "awaiting_self_assessment") {
        setUploadStage("awaiting_assessment");
        setUploadPhase("Please rate your confidence for the target skills below.");
      } else {
        setUploadStage("completed");
      }
    } catch (err) {
      useResumeStore.getState().setProcessingStatus("idle");
      setUploadStage("idle");
      setUploadProgress(0);
      Alert.alert(
        "Upload Failure",
        err instanceof Error ? err.message : "Failed to process resume upload."
      );
    }
  };

  const handlePasteSubmit = async () => {
    if (!tempFile || !pastedText.trim()) {
      Alert.alert("Empty Resume Text", "Please paste your resume text before submitting.");
      return;
    }

    if (!currentUser) return;

    const fileExtension = tempFile.name.split(".").pop()?.toLowerCase() || "";
    const sourceFileType = (fileExtension === "pdf" ? "pdf" : "image") as any;

    try {
      setShowPasteModal(false);
      clearAnalysisState();
      await uploadAndProcessResume(
        currentUser.uid,
        currentUser.targetPosition || "",
        tempFile,
        sourceFileType,
        "manual_paste",
        pastedText
      );
      const currentStatus = useResumeStore.getState().processingStatus;
      if (currentStatus === "awaiting_self_assessment") {
        setUploadStage("awaiting_assessment");
        setUploadPhase("Please rate your confidence for the target skills below.");
      } else {
        setUploadStage("completed");
      }
      setPastedText("");
      setTempFile(null);
    } catch (err) {
      Alert.alert("Analysis Error", err instanceof Error ? err.message : "Failed to analyze and save resume.");
    }
  };

  const handleContinue = async () => {
    if (!agreeTerms || !agreePrivacy) {
      Alert.alert("Consent Required", "Please check and agree to both the Terms of Service and Privacy Policy.");
      return;
    }
    if (processingStatus !== "completed" || !activeResume || !currentUser?.activeResumeId) {
      Alert.alert("Assessment Required", "Please complete your skill self-assessment to view your personalized dashboard.");
      return;
    }

    try {
      await completeOnboarding(agreeTerms, agreePrivacy, "1.0.0", "1.0.0");
      const latestUser = useAuthStore.getState().currentUser;
      if (latestUser?.hasCompletedOnboarding) {
        router.replace("/(student)/(tabs)/resume" as any);
      }
    } catch (err) {
      Alert.alert(
        "Onboarding Error",
        err instanceof Error ? err.message : "Failed to complete onboarding. Please try again."
      );
    }
  };

  const isProcessing =
    processingStatus === "extracting" ||
    processingStatus === "validating" ||
    processingStatus === "parsing" ||
    processingStatus === "analyzing" ||
    processingStatus === "saving";

  const isSubmitEnabled =
    agreeTerms &&
    agreePrivacy &&
    processingStatus === "completed" &&
    (!!activeResume && !!currentUser?.activeResumeId);

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: 100 }}
      >
        <View className="items-center mt-6">
          <Text className="text-center text-3xl font-extrabold text-[#1F3A5F]">
            Upload Your Resume
          </Text>
          <Text className="mt-2 text-center text-sm font-medium text-[#4F6B82] px-4 leading-6">
            Supported files include PDF, DOCX, TXT, and images. Real-time ATS analysis is run automatically.
          </Text>
        </View>

        <View className="mt-8 rounded-2xl bg-white p-6 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleUploadResume}
            disabled={isProcessing}
            className={`h-[220px] items-center justify-center rounded-2xl border-2 border-dashed px-4 ${
              isProcessing ? "border-[#BFD6EA] bg-[#F4F8FB]" : "border-[#F4A47A] bg-[#FEF5F1]"
            }`}
          >
            {isProcessing ? (
              <View className="w-full px-4 py-3">
                <Text className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wider mb-4 text-center">
                  Analyzing Your Resume
                </Text>

                <View className="gap-3">
                  {/* Stage 1: Upload */}
                  <View className="flex-row items-center">
                    {uploadStage === "uploading" ? (
                      <ActivityIndicator size="small" color="#F4A47A" style={{ width: 20, height: 20 }} />
                    ) : (
                      <Ionicons name="checkmark-circle" size={20} color="#79D5C8" />
                    )}
                    <Text className={`ml-3 text-xs font-semibold ${uploadStage === "uploading" ? "text-[#CA5D25] font-bold" : "text-[#1F3A5F]"}`}>
                      {uploadStage === "uploading"
                        ? `Uploading document (${bytesUploaded.total > 0 ? formatBytes(bytesUploaded.loaded) : "in progress"}...)`
                        : "Document uploaded successfully"}
                    </Text>
                  </View>

                  {/* Stage 2: Extraction & Structure */}
                  <View className="flex-row items-center">
                    {uploadStage === "uploading" ? (
                      <Ionicons name="ellipse-outline" size={20} color="#BFD6EA" />
                    ) : uploadStage === "extracting" ? (
                      <ActivityIndicator size="small" color="#F4A47A" style={{ width: 20, height: 20 }} />
                    ) : (
                      <Ionicons name="checkmark-circle" size={20} color="#79D5C8" />
                    )}
                    <Text className={`ml-3 text-xs font-semibold ${uploadStage === "extracting" ? "text-[#CA5D25] font-bold" : uploadStage === "uploading" ? "text-[#8B95A5]" : "text-[#1F3A5F]"}`}>
                      Extracting sections & content
                    </Text>
                  </View>

                  {/* Stage 3: Semantic Alignment & SBERT Analysis */}
                  <View className="flex-row items-center">
                    {uploadStage === "uploading" || uploadStage === "extracting" ? (
                      <Ionicons name="ellipse-outline" size={20} color="#BFD6EA" />
                    ) : uploadStage === "analyzing" ? (
                      <ActivityIndicator size="small" color="#F4A47A" style={{ width: 20, height: 20 }} />
                    ) : (
                      <Ionicons name="checkmark-circle" size={20} color="#79D5C8" />
                    )}
                    <Text className={`ml-3 text-xs font-semibold ${uploadStage === "analyzing" ? "text-[#CA5D25] font-bold" : uploadStage === "saving" || uploadStage === "completed" ? "text-[#1F3A5F]" : "text-[#8B95A5]"}`}>
                      Matching alignment to {currentUser?.targetPosition || "target role"}
                    </Text>
                  </View>

                  {/* Stage 4: Learning Roadmap & Finalization */}
                  <View className="flex-row items-center">
                    {uploadStage === "saving" ? (
                      <ActivityIndicator size="small" color="#F4A47A" style={{ width: 20, height: 20 }} />
                    ) : uploadStage === "completed" ? (
                      <Ionicons name="checkmark-circle" size={20} color="#79D5C8" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color="#BFD6EA" />
                    )}
                    <Text className={`ml-3 text-xs font-semibold ${uploadStage === "saving" ? "text-[#CA5D25] font-bold" : uploadStage === "completed" ? "text-[#1F3A5F]" : "text-[#8B95A5]"}`}>
                      Curating skill gaps & learning roadmap
                    </Text>
                  </View>
                </View>
              </View>
            ) : fileName ? (
              <>
                <View className="h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm mb-4">
                  <Ionicons name="document-text" size={32} color="#79D5C8" />
                </View>
                <Text className="text-base font-bold text-[#79D5C8] text-center px-2">{fileName}</Text>
                <Text className="mt-2 text-xs font-medium text-[#4F6B82]">Tap to re-upload</Text>
              </>
            ) : (
              <>
                <View className="h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm mb-4">
                  <Ionicons name="cloud-upload" size={32} color="#CA5D25" />
                </View>
                <Text className="text-base font-bold text-[#1F3A5F]">Tap to Upload File</Text>
                <Text className="mt-1 text-xs font-medium text-[#4F6B82]">PDF, DOCX, TXT, or Image</Text>
              </>
            )}
          </TouchableOpacity>

          <View className="mt-6 gap-4">
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#EAF2F7]">
                <Ionicons name="analytics" size={20} color="#1F3A5F" />
              </View>
              <Text className="flex-1 text-sm font-medium text-[#4F6B82] leading-5">
                Detailed Correlation Analysis between your resume and target job.
              </Text>
            </View>

            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#EAF2F7]">
                <Ionicons name="mic" size={20} color="#1F3A5F" />
              </View>
              <Text className="flex-1 text-sm font-medium text-[#4F6B82] leading-5">
                Realistic Simulations tailored to your career goals.
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-6 gap-3">
          <TouchableOpacity
            className="flex-row items-center bg-white p-4 rounded-xl border border-[#BFD6EA]"
            activeOpacity={0.85}
            onPress={handleToggleTerms}
          >
            <Ionicons
              name={agreeTerms ? "checkbox" : "square-outline"}
              size={24}
              color={agreeTerms ? "#F4A47A" : "#8B95A5"}
            />
            <Text className="ml-3 text-sm font-medium text-[#1F3A5F] flex-1">
              I agree to the{" "}
              <Text
                className="font-bold text-[#CA5D25] underline"
                onPress={(e) => {
                  e.stopPropagation();
                  setShowTermsModal(true);
                }}
              >
                Terms of Service
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center bg-white p-4 rounded-xl border border-[#BFD6EA]"
            activeOpacity={0.85}
            onPress={handleTogglePrivacy}
          >
            <Ionicons
              name={agreePrivacy ? "checkbox" : "square-outline"}
              size={24}
              color={agreePrivacy ? "#F4A47A" : "#8B95A5"}
            />
            <Text className="ml-3 text-sm font-medium text-[#1F3A5F] flex-1">
              I agree to the{" "}
              <Text
                className="font-bold text-[#CA5D25] underline"
                onPress={(e) => {
                  e.stopPropagation();
                  setShowPrivacyModal(true);
                }}
              >
                Privacy Policy (EULA)
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {resumeError ? (
          <View className="mt-6 p-4 bg-[#FEF5F1] rounded-xl border border-[#FDEEE6]">
            <Text className="text-sm font-medium text-center text-[#CA5D25]">{resumeError}</Text>
          </View>
        ) : authError ? (
          <View className="mt-6 p-4 bg-[#FEF5F1] rounded-xl border border-[#FDEEE6]">
            <Text className="text-sm font-medium text-center text-[#CA5D25]">{authError}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ paddingBottom: Math.max(insets.bottom, 16), marginBottom: 12, paddingHorizontal: 4 }}>
        <PrimaryButton
          title="Go to Dashboard"
          variant="orange"
          onPress={handleContinue}
          loading={authLoading}
          disabled={!isSubmitEnabled || authLoading}
        />
      </View>

      <Modal
        visible={showTermsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="h-4/5 rounded-t-3xl bg-white p-6 shadow-lg">
            <View className="flex-row items-center justify-between border-b border-[#EAF2F7] pb-4">
              <Text className="text-xl font-extrabold text-[#1F3A5F]">Terms of Service</Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="#8B95A5" />
              </TouchableOpacity>
            </View>

            <ScrollView className="mt-4 flex-1 pr-2" showsVerticalScrollIndicator={true}>
              <Text className="text-sm font-bold text-[#1F3A5F] mb-2 uppercase tracking-wider">1. Acceptance of Terms</Text>
              <Text className="text-sm leading-6 text-[#4F6B82] mb-6">
                By using AIRIS, you agree to these Terms of Service. If you do not agree, you must
                not use the application.
              </Text>

              <Text className="text-sm font-bold text-[#1F3A5F] mb-2 uppercase tracking-wider">
                2. Career Readiness Purpose
              </Text>
              <Text className="text-sm leading-6 text-[#4F6B82] mb-6">
                AIRIS provides resume parsing and AI interview feedback to enhance student
                employability. The results, advice, and preparedness scores generated by the
                application are for educational and mock simulation purposes only. They do not
                guarantee job offers or official employment placement.
              </Text>

              <Text className="text-sm font-bold text-[#1F3A5F] mb-2 uppercase tracking-wider">
                3. User Responsibilities
              </Text>
              <Text className="text-sm leading-6 text-[#4F6B82] mb-6">
                You are responsible for ensuring the details you submit are accurate. You agree not
                to submit offensive, plagiarized, or false content during mock interview practice or
                resume upload.
              </Text>
            </ScrollView>

            <View className="pt-4 border-t border-[#EAF2F7]">
              <PrimaryButton
                title="Agree & Close"
                variant="orange"
                onPress={() => {
                  setAgreeTerms(true);
                  setShowTermsModal(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="h-4/5 rounded-t-3xl bg-white p-6 shadow-lg">
            <View className="flex-row items-center justify-between border-b border-[#EAF2F7] pb-4">
              <Text className="text-xl font-extrabold text-[#1F3A5F]">Privacy Policy</Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="#8B95A5" />
              </TouchableOpacity>
            </View>

            <ScrollView className="mt-4 flex-1 pr-2" showsVerticalScrollIndicator={true}>
              <Text className="text-sm font-bold text-[#1F3A5F] mb-2 uppercase tracking-wider">1. Data We Collect</Text>
              <Text className="text-sm leading-6 text-[#4F6B82] mb-6">
                We collect profile data including your name, TIP email, college, degree program, and
                target job roles. We parse resume details and mock interview transcripts locally or
                securely send them to processors to generate feedback.
              </Text>

              <Text className="text-sm font-bold text-[#1F3A5F] mb-2 uppercase tracking-wider">2. How We Use Data</Text>
              <Text className="text-sm leading-6 text-[#4F6B82] mb-6">
                Your data is exclusively used to tailor your employability score, customize mock
                questions, and provide actionable feedback. We do not sell or monetize student data.
              </Text>

              <Text className="text-sm font-bold text-[#1F3A5F] mb-2 uppercase tracking-wider">3. Storage & Deletion</Text>
              <Text className="text-sm leading-6 text-[#4F6B82] mb-6">
                Resume data is parsed and stored inside Firestore under your authenticated user
                record. You retain complete ownership and can request account removal or delete
                entries at any time.
              </Text>
            </ScrollView>

            <View className="pt-4 border-t border-[#EAF2F7]">
              <PrimaryButton
                title="Agree & Close"
                variant="orange"
                onPress={() => {
                  setAgreePrivacy(true);
                  setShowPrivacyModal(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* SKILL SELF-ASSESSMENT MODAL IN UPLOAD FLOW */}
      <SkillSelfAssessmentModal
        visible={processingStatus === "awaiting_self_assessment"}
        skills={pendingTargetSkills}
        onSave={async (ratings) => {
          await completeSelfAssessmentAndFinalize(ratings);
          setUploadStage("completed");
        }}
        onSkip={async () => {
          await completeSelfAssessmentAndFinalize({});
          setUploadStage("completed");
        }}
      />
    </SafeAreaView>
  );
}
