import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, BackHandler, Modal, ScrollView, TouchableOpacity, View, AppState } from "react-native";
import { Text, TextInput } from "../../components/ui/AppText";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { PrimaryButton } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import { getMockResumeText } from "../../fixtures/resume/mockResume";
import { uploadResumeFileWithProgress, type UploadProgressEvent, type ResumeFormatAssessment } from "../../services/resume/resumeAnalysisService";
import { classifyNameMatch } from "../../utils/nameMatcher";
import { normalizeApiError } from "../../utils/errorMapper";
import { validateResumeText } from "../../services/resume/resumeNormalizer";
import { downloadAirisResumeTemplate } from "../../utils/airisResumeTemplate";

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
  const saveAcceptedConsents = useAuthStore((state) => state.saveAcceptedConsents);
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
  const [uploadPhase, setUploadPhase] = useState<string>("Connecting to server...");
  const [uploadStage, setUploadStage] = useState<"idle" | "connecting" | "uploading" | "extracting" | "analyzing" | "awaiting_assessment" | "saving" | "completed">("idle");

  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string; size: number } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isInvalidDocument, setIsInvalidDocument] = useState<boolean>(false);
  const [hasValidUploadCompleted, setHasValidUploadCompleted] = useState<boolean>(false);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(student)/onboarding");
    }
  };

  React.useEffect(() => {
    const onBackPress = () => {
      handleGoBack();
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, []);

  const handleToggleTerms = () => setAgreeTerms(!agreeTerms);
  const handleTogglePrivacy = () => setAgreePrivacy(!agreePrivacy);

  const isSubmittingRef = React.useRef(false);

  const openStandardTemplate = async () => {
    try {
      await downloadAirisResumeTemplate();
    } catch {
      Alert.alert("Template unavailable", "AIRIS could not save or share the resume template on this device.");
    }
  };

  const explainFormat = (assessment: ResumeFormatAssessment) =>
    `${assessment.reasons.join("\n")}\n\n${assessment.outcome === "WARNING" ? "Some details may be missed, so your analysis or scores may be less accurate.\n\n" : ""}${assessment.remediation}`;

  const processSelectedResumeFile = async (fileToProcess: { uri: string; name: string; mimeType: string; size: number }) => {
    if (!currentUser) return;
    if (isSubmittingRef.current) {
      console.log("[AIRIS Upload] Duplicate upload submission blocked.");
      return;
    }
    isSubmittingRef.current = true;

    try {
      setSelectedFile(fileToProcess);
      setValidationError(null);
      setIsInvalidDocument(false);
      setHasValidUploadCompleted(false);

    const fileExtension = fileToProcess.name.split(".").pop()?.toLowerCase() || "";
    const validExtensions = ["pdf", "docx", "rtf", "txt", "png", "jpg", "jpeg", "webp", "heic"];

    if (!validExtensions.includes(fileExtension)) {
      const errMsg = "Please choose a PDF, DOCX, RTF, TXT, or supported image. Legacy .doc files must be converted to DOCX or PDF.";
      setIsInvalidDocument(true);
      setValidationError(errMsg);
      setUploadStage("idle");
      Alert.alert("Unsupported Format", errMsg);
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

    const initialSize = fileToProcess.size > 0 ? fileToProcess.size : 10240;
    useResumeStore.getState().setProcessingStatus("extracting");
    setUploadStage("connecting");
    setUploadProgress(0);
    setBytesUploaded({ loaded: 0, total: initialSize });
    setUploadPhase("Connecting to server...");

    let extractedText = "";
    let sourceFileType: any = "pdf";
    let sourceDetailType: any = "pdf_text";

    if (fileExtension === "docx") {
      sourceFileType = "docx";
      sourceDetailType = "docx_text";
    } else if (fileExtension === "rtf") {
      sourceFileType = "rtf";
      sourceDetailType = "rtf_text";
    } else if (fileExtension === "txt" || fileToProcess.mimeType === "text/plain") {
      sourceFileType = "txt";
      sourceDetailType = "txt_direct";
    } else if (fileExtension === "png" || fileExtension === "jpg" || fileExtension === "jpeg" || fileExtension === "webp" || fileExtension === "heic" || fileToProcess.mimeType.startsWith("image/")) {
      sourceFileType = "image";
      sourceDetailType = "image_ocr";
    }

    let precomputedAnalysis: any = undefined;
    let formatAssessment: ResumeFormatAssessment | undefined;
    try {
      const uploadResult = await uploadResumeFileWithProgress(
        { ...fileToProcess, size: initialSize },
        targetPosition,
        (progressEvent: UploadProgressEvent) => {
          setUploadProgress(progressEvent.progress);
          setBytesUploaded({ loaded: progressEvent.loaded, total: progressEvent.total || initialSize });
          if (progressEvent.phase === "connecting") {
            setUploadStage("connecting");
            setUploadPhase("Connecting to server...");
          } else if (progressEvent.phase === "uploading") {
            setUploadStage("uploading");
            setUploadPhase(`Uploading your resume... (${progressEvent.progress}%)`);
          } else {
            setUploadStage("extracting");
            setUploadPhase("Reading & checking your resume...");
          }
        },
        currentUser?.fullName || ""
      );

      extractedText = uploadResult.rawText;
      formatAssessment = uploadResult.formatAssessment;
      precomputedAnalysis = uploadResult.analysisResult || ((uploadResult as any).atsScore ? uploadResult as any : undefined);
    } catch (backendError: any) {
      if (backendError?.formatAssessment?.outcome === "BLOCKED") {
        const assessment = backendError.formatAssessment as ResumeFormatAssessment;
        useResumeStore.getState().setProcessingStatus("idle");
        setUploadStage("idle");
        setUploadProgress(0);
        setIsInvalidDocument(true);
        setValidationError("This document was not analyzed. Choose another file or use the AIRIS standard template.");
        Alert.alert("Resume cannot be analyzed", explainFormat(assessment), [
          { text: "Choose another file", style: "cancel", onPress: () => { void pickDocumentResume(); } },
          { text: "Download template", onPress: openStandardTemplate },
        ]);
        return;
      }
      const normErr = normalizeApiError(backendError);
      const isImageFile = sourceFileType === "image" || (validExtensions.includes(fileExtension) && ["png", "jpg", "jpeg", "webp", "heic"].includes(fileExtension));
      const isHttpAppError = Boolean(backendError?.isHttpError || backendError?.status || (normErr.code !== "UNKNOWN_ERROR" && normErr.code !== "NETWORK_ERROR"));

      if (
        isHttpAppError ||
        isImageFile ||
        normErr.code === "EXCEEDED_PAGE_LIMIT" ||
        normErr.code === "NAME_MISMATCH" ||
        normErr.code === "INVALID_RESUME" ||
        normErr.userMessage.includes("exceed 3 pages") ||
        normErr.userMessage.includes("belong to a different individual") ||
        normErr.userMessage.includes("doesn't appear to be a resume") ||
        normErr.userMessage.includes("valid resume")
      ) {
        useResumeStore.getState().setProcessingStatus("idle");
        setUploadStage("idle");
        setUploadProgress(0);
        setIsInvalidDocument(true);
        setValidationError(normErr.userMessage);
        setHasValidUploadCompleted(false);
        Alert.alert("Upload Notice", normErr.userMessage);
        return;
      }

      const unavailableMessage = "AIRIS could not verify your resume format. No analysis was saved. Please check your connection and retry.";
      useResumeStore.getState().setProcessingStatus("idle");
      setUploadStage("idle");
      setUploadProgress(0);
      setIsInvalidDocument(true);
      setValidationError(unavailableMessage);
      setHasValidUploadCompleted(false);
      Alert.alert("Format check unavailable", unavailableMessage, [
        { text: "Retry with another file", style: "cancel" },
        { text: "Download template", onPress: openStandardTemplate },
      ]);
      return;
    }

    if (formatAssessment?.outcome === "WARNING") {
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert("Resume format warning", explainFormat(formatAssessment!), [
          { text: "Choose another file", style: "cancel", onPress: () => resolve(false) },
          { text: "Download template", onPress: () => { void openStandardTemplate(); resolve(false); } },
          { text: "Continue anyway", onPress: () => resolve(true) },
        ], { cancelable: false });
      });
      if (!proceed) {
        useResumeStore.getState().setProcessingStatus("idle");
        setUploadStage("idle");
        setUploadProgress(0);
        setValidationError("Resume format warning. Choose another file or use the AIRIS standard template.");
        return;
      }
    }

    // Name Matching Decision Flow (Warning / Confirmation)
    const nameCheck = classifyNameMatch(currentUser.fullName || "", extractedText);
    if (nameCheck.classification === "CLEAR_MISMATCH") {
      const confirmProceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Name Verification Warning",
          "The candidate name in the uploaded document appears to differ from your profile name. Would you like to proceed with this resume or select another file?",
          [
            { text: "Select Different File", style: "cancel", onPress: () => resolve(false) },
            { text: "Proceed Anyway", style: "default", onPress: () => resolve(true) },
          ]
        );
      });

      if (!confirmProceed) {
        useResumeStore.getState().setProcessingStatus("idle");
        setUploadStage("idle");
        setUploadProgress(0);
        setTempFile(null);
        setIsInvalidDocument(true);
        setValidationError("The uploaded document name does not match your profile name.");
        setHasValidUploadCompleted(false);
        return;
      }
    }

    setUploadStage("saving");
    setUploadPhase("Finalizing resume analysis & saving...");
    setUploadProgress(100);

    await uploadAndProcessResume(
      currentUser.uid,
      currentUser.targetPosition || "",
      fileToProcess,
      sourceFileType,
      sourceDetailType,
      extractedText,
      precomputedAnalysis
    );

    const currentStatus = useResumeStore.getState().processingStatus;
    setIsInvalidDocument(false);
    setValidationError(null);
    setHasValidUploadCompleted(true);
    if (currentStatus === "awaiting_self_assessment") {
      setUploadStage("awaiting_assessment");
      setUploadPhase("Please rate your confidence for the target skills below.");
    } else {
      setUploadStage("completed");
    }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const pickDocumentResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["*/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const selectedFile = {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || "application/octet-stream",
        size: asset.size && asset.size > 0 ? asset.size : 10240,
      };

      await processSelectedResumeFile(selectedFile);
    } catch (err) {
      useResumeStore.getState().setProcessingStatus("idle");
      setUploadStage("idle");
      setUploadProgress(0);
      const normalized = normalizeApiError(err, "Failed to process resume document.");
      setIsInvalidDocument(true);
      setValidationError(normalized.userMessage);
      setHasValidUploadCompleted(false);
      Alert.alert("Upload Notice", normalized.userMessage);
    }
  };

  const pickPhotoLibraryResume = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "AIRIS needs access to your Photo Library to select image resumes.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const ext = asset.mimeType?.split("/")[1] || "jpg";
      const fileName = asset.fileName || `resume_image_${Date.now()}.${ext}`;
      const selectedFile = {
        uri: asset.uri,
        name: fileName,
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize || 102400,
      };

      await processSelectedResumeFile(selectedFile);
    } catch (err) {
      useResumeStore.getState().setProcessingStatus("idle");
      setUploadStage("idle");
      setUploadProgress(0);
      const normalized = normalizeApiError(err, "Failed to process photo resume.");
      setIsInvalidDocument(true);
      setValidationError(normalized.userMessage);
      setHasValidUploadCompleted(false);
      Alert.alert("Upload Notice", normalized.userMessage);
    }
  };

  const handleUploadResume = async () => {
    const hasAcceptedConsents = Boolean(currentUser?.acceptedTerms && currentUser?.acceptedPrivacy);
    if (!hasAcceptedConsents && (!agreeTerms || !agreePrivacy)) {
      Alert.alert(
        "Consent Required",
        "Please check and agree to both the Terms of Service and Privacy Policy before uploading your resume."
      );
      return;
    }

    if (!currentUser) return;

    if (!hasAcceptedConsents && agreeTerms && agreePrivacy) {
      await saveAcceptedConsents(true, true, "1.0.0", "1.0.0");
    }

    Alert.alert(
      "Choose Resume Source",
      "Select your resume document or photo from library:",
      [
        {
          text: "Document File (PDF, DOCX, TXT)",
          onPress: pickDocumentResume,
        },
        {
          text: "Photo Library (PNG, JPG, HEIC)",
          onPress: pickPhotoLibraryResume,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const handlePasteSubmit = async () => {
    if (!tempFile || !pastedText.trim()) {
      Alert.alert("Empty Resume Text", "Please paste your resume text before submitting.");
      return;
    }

    if (!currentUser) return;

    try {
      validateResumeText(pastedText);
    } catch (valErr) {
      const normVal = normalizeApiError(valErr);
      setIsInvalidDocument(true);
      setValidationError(normVal.userMessage);
      setHasValidUploadCompleted(false);
      Alert.alert("Upload Notice", normVal.userMessage);
      return;
    }

    const fileExtension = tempFile.name.split(".").pop()?.toLowerCase() || "";
    const sourceFileType = (fileExtension === "pdf" ? "pdf" : "image") as any;

    try {
      setShowPasteModal(false);
      await uploadAndProcessResume(
        currentUser.uid,
        currentUser.targetPosition || "",
        tempFile,
        sourceFileType,
        "manual_paste",
        pastedText
      );
      const currentStatus = useResumeStore.getState().processingStatus;
      setIsInvalidDocument(false);
      setValidationError(null);
      setHasValidUploadCompleted(true);
      if (currentStatus === "awaiting_self_assessment") {
        setUploadStage("awaiting_assessment");
        setUploadPhase("Please rate your confidence for the target skills below.");
      } else {
        setUploadStage("completed");
      }
      setPastedText("");
      setTempFile(null);
    } catch (err) {
      const normErr = normalizeApiError(err);
      setIsInvalidDocument(true);
      setValidationError(normErr.userMessage);
      setHasValidUploadCompleted(false);
      Alert.alert("Analysis Error", normErr.userMessage);
    }
  };

  const handleContinue = async () => {
    if (isInvalidDocument || validationError) {
      Alert.alert(
        "Invalid Resume Document",
        validationError || "The selected document is invalid. Please select a valid resume or CV file."
      );
      return;
    }

    if (!selectedFile || !hasValidUploadCompleted) {
      Alert.alert(
        "Resume Upload Required",
        "Please select and upload a valid resume or CV file before continuing."
      );
      return;
    }

    const hasAcceptedConsents = Boolean(currentUser?.acceptedTerms && currentUser?.acceptedPrivacy);
    if (!hasAcceptedConsents && (!agreeTerms || !agreePrivacy)) {
      Alert.alert("Consent Required", "Please check and agree to both the Terms of Service and Privacy Policy to proceed.");
      return;
    }

    try {
      if (!hasAcceptedConsents && agreeTerms && agreePrivacy) {
        await saveAcceptedConsents(true, true, "1.0.0", "1.0.0");
      }
      router.replace("/(student)/(tabs)/dashboard" as any);
    } catch (err) {
      Alert.alert(
        "Upload Notice",
        err instanceof Error ? err.message : "Failed to proceed to dashboard. Please try again."
      );
    }
  };

  const isProcessing =
    processingStatus === "extracting" ||
    processingStatus === "validating" ||
    processingStatus === "parsing" ||
    processingStatus === "analyzing" ||
    processingStatus === "saving" ||
    uploadStage === "connecting" ||
    uploadStage === "uploading" ||
    uploadStage === "extracting" ||
    uploadStage === "analyzing" ||
    uploadStage === "saving";

  const isAwaitingAssessment =
    processingStatus === "awaiting_self_assessment" ||
    uploadStage === "awaiting_assessment";

  const hasAcceptedConsents = Boolean(currentUser?.acceptedTerms && currentUser?.acceptedPrivacy);

  const isSubmitEnabled =
    (hasAcceptedConsents || (agreeTerms && agreePrivacy)) &&
    !isProcessing &&
    !isAwaitingAssessment &&
    !isInvalidDocument &&
    !validationError &&
    selectedFile !== null &&
    hasValidUploadCompleted;

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between pt-2 pb-2">
        <TouchableOpacity onPress={handleGoBack} className="flex-row items-center py-2">
          <Ionicons name="arrow-back" size={24} color="#1F3A5F" />
          <Text className="text-[#1F3A5F] font-bold ml-1 text-base">Back</Text>
        </TouchableOpacity>
      </View>
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
            AIRIS expects its standard resume format as a selectable-text PDF. Other readable files can be reviewed with a format warning.
          </Text>
          <TouchableOpacity
            className="mt-3 rounded-xl bg-[#EAF2F7] px-4 py-3"
            onPress={openStandardTemplate}
          >
            <Text className="text-center font-bold text-[#1F3A5F]">Download AIRIS Standard Resume Template</Text>
          </TouchableOpacity>
          <Text className="mt-2 text-center text-xs text-[#4F6B82] px-4">
            PDF is recommended. DOCX, RTF, TXT, and images may proceed after review when readable. Replace all template examples with your own information.
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
                  Processing Your Resume
                </Text>

                <View className="gap-3">
                  {/* Stage 1: Connecting / Uploading */}
                  <View className="flex-row items-center">
                    {uploadStage === "connecting" || uploadStage === "uploading" ? (
                      <ActivityIndicator size="small" color="#F4A47A" style={{ width: 20, height: 20 }} />
                    ) : (
                      <Ionicons name="checkmark-circle" size={20} color="#79D5C8" />
                    )}
                    <Text className={`ml-3 text-xs font-semibold ${uploadStage === "connecting" || uploadStage === "uploading" ? "text-[#CA5D25] font-bold" : "text-[#1F3A5F]"}`}>
                      {uploadStage === "connecting"
                        ? "Connecting to server..."
                        : uploadStage === "uploading"
                        ? `Uploading your resume... (${bytesUploaded.total > 0 ? formatBytes(bytesUploaded.loaded) : "in progress"})`
                        : "Resume uploaded"}
                    </Text>
                  </View>

                  {/* Stage 2: Reading */}
                  <View className="flex-row items-center">
                    {uploadStage === "connecting" || uploadStage === "uploading" ? (
                      <Ionicons name="ellipse-outline" size={20} color="#BFD6EA" />
                    ) : uploadStage === "extracting" ? (
                      <ActivityIndicator size="small" color="#F4A47A" style={{ width: 20, height: 20 }} />
                    ) : (
                      <Ionicons name="checkmark-circle" size={20} color="#79D5C8" />
                    )}
                    <Text className={`ml-3 text-xs font-semibold ${uploadStage === "extracting" ? "text-[#CA5D25] font-bold" : uploadStage === "connecting" || uploadStage === "uploading" ? "text-[#8B95A5]" : "text-[#1F3A5F]"}`}>
                      Reading your resume...
                    </Text>
                  </View>

                  {/* Stage 3: Checking */}
                  <View className="flex-row items-center">
                    {uploadStage === "connecting" || uploadStage === "uploading" || uploadStage === "extracting" ? (
                      <Ionicons name="ellipse-outline" size={20} color="#BFD6EA" />
                    ) : uploadStage === "analyzing" ? (
                      <ActivityIndicator size="small" color="#F4A47A" style={{ width: 20, height: 20 }} />
                    ) : (
                      <Ionicons name="checkmark-circle" size={20} color="#79D5C8" />
                    )}
                    <Text className={`ml-3 text-xs font-semibold ${uploadStage === "analyzing" ? "text-[#CA5D25] font-bold" : uploadStage === "saving" || uploadStage === "completed" || uploadStage === "awaiting_assessment" ? "text-[#1F3A5F]" : "text-[#8B95A5]"}`}>
                      Checking your resume...
                    </Text>
                  </View>

                  {/* Stage 4: Analyzing */}
                  <View className="flex-row items-center">
                    {uploadStage === "saving" ? (
                      <ActivityIndicator size="small" color="#F4A47A" style={{ width: 20, height: 20 }} />
                    ) : uploadStage === "completed" || uploadStage === "awaiting_assessment" ? (
                      <Ionicons name="checkmark-circle" size={20} color="#79D5C8" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color="#BFD6EA" />
                    )}
                    <Text className={`ml-3 text-xs font-semibold ${uploadStage === "saving" ? "text-[#CA5D25] font-bold" : uploadStage === "completed" || uploadStage === "awaiting_assessment" ? "text-[#1F3A5F]" : "text-[#8B95A5]"}`}>
                      Analyzing your skills and experience...
                    </Text>
                  </View>

                  {/* Stage 5: Preparing */}
                  <View className="flex-row items-center">
                    {uploadStage === "completed" || uploadStage === "awaiting_assessment" ? (
                      <Ionicons name="checkmark-circle" size={20} color="#79D5C8" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color="#BFD6EA" />
                    )}
                    <Text className={`ml-3 text-xs font-semibold ${uploadStage === "completed" || uploadStage === "awaiting_assessment" ? "text-[#1F3A5F]" : "text-[#8B95A5]"}`}>
                      Preparing your results...
                    </Text>
                  </View>
                </View>
              </View>
            ) : isInvalidDocument ? (
              <>
                <View className="h-16 w-16 items-center justify-center rounded-full bg-[#FEF5F1] shadow-sm mb-3">
                  <Ionicons name="alert-circle" size={32} color="#CA5D25" />
                </View>
                <Text className="text-xs font-bold text-[#CA5D25] text-center px-4 leading-5">
                  {validationError || "Invalid document selected."}
                </Text>
                <Text className="mt-2 text-xs font-bold text-[#1F3A5F]">Tap to select another file</Text>
              </>
            ) : selectedFile && hasValidUploadCompleted ? (
              <>
                <View className="h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm mb-4">
                  <Ionicons name="document-text" size={32} color="#79D5C8" />
                </View>
                <Text className="text-base font-bold text-[#79D5C8] text-center px-2">{selectedFile.name}</Text>
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

        {/* Consents & Agreements: ONLY displayed if user has not yet accepted at account level */}
        {!hasAcceptedConsents && (
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
        )}

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
        visible={isAwaitingAssessment}
        skills={pendingTargetSkills}
        onSave={async (ratings) => {
          console.log(`[SELF_ASSESSMENT] session=${useResumeStore.getState().currentAnalysisSessionId} saved`);
          await completeSelfAssessmentAndFinalize(ratings);
          setUploadStage("completed");
          setHasValidUploadCompleted(true);
        }}
        onSkip={async () => {
          console.log(`[SELF_ASSESSMENT] session=${useResumeStore.getState().currentAnalysisSessionId} explicit_skip`);
          await completeSelfAssessmentAndFinalize({});
          setUploadStage("completed");
          setHasValidUploadCompleted(true);
        }}
      />
    </SafeAreaView>
  );
}
