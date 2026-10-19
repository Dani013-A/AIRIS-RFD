import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../../components/ui/AppText";
import { Tag } from "../../components/ui";
import { formatSkillDisplayName } from "../../utils/displayNames";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";
import {
  fetchActiveResumeFromDb,
  fetchAnalysisByIdFromDb,
} from "../../services/resume/resumeService";
import type { Resume, StructuredResumeData } from "../../types/resume.types";
import type { ResumeAnalysisResult } from "../../services/resume/resumeAnalysisEngine";

interface ParsedRawSection {
  title: string;
  body: string;
}

/**
 * Parses unformatted rawText into structured readable blocks by detecting standard resume headers.
 */
function parseRawTextIntoSections(rawText: string): ParsedRawSection[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const sections: ParsedRawSection[] = [];
  let currentTitle = "General Information";
  let currentLines: string[] = [];

  const HEADER_REGEX =
    /^(PROFESSIONAL SUMMARY|SUMMARY|PROFILE|OBJECTIVE|EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT HISTORY|EDUCATION|ACADEMIC BACKGROUND|SKILLS|TECHNICAL SKILLS|CORE COMPETENCIES|PROJECTS|KEY PROJECTS|CERTIFICATIONS|CERTIFICATES|LICENSES|TRAINING|TRAININGS|COURSES|AWARDS|HONORS|PUBLICATIONS|LANGUAGES|ORGANIZATIONS|AFFILIATIONS|VOLUNTEER EXPERIENCE|CONTACT INFORMATION|CONTACT)\b/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentLines.length > 0 && currentLines[currentLines.length - 1] !== "") {
        currentLines.push("");
      }
      continue;
    }

    if (HEADER_REGEX.test(trimmed) && trimmed.length < 50) {
      if (currentLines.length > 0) {
        sections.push({
          title: currentTitle,
          body: currentLines.join("\n").trim(),
        });
        currentLines = [];
      }
      currentTitle = trimmed;
    } else {
      currentLines.push(trimmed);
    }
  }

  if (currentLines.length > 0) {
    sections.push({
      title: currentTitle,
      body: currentLines.join("\n").trim(),
    });
  }

  return sections.filter((s) => s.body.length > 0);
}

export default function HistoricalResumeViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    activityId?: string;
    analysisId?: string;
    resumeId?: string;
    targetPosition?: string;
    title?: string;
  }>();

  const currentUser = useAuthStore((state) => state.currentUser);

  const [isLoading, setIsLoading] = useState(true);
  const [resumeData, setResumeData] = useState<Resume | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  const [targetPosition, setTargetPosition] = useState<string>("");
  const [resolvedDate, setResolvedDate] = useState<string>("");
  const [showRawTextToggle, setShowRawTextToggle] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadHistoricalData() {
      if (!currentUser?.uid) {
        setIsLoading(false);
        setNotFound(true);
        return;
      }

      setIsLoading(true);
      setNotFound(false);

      try {
        const uid = currentUser.uid;
        const requestedActivityId = params.activityId || "";
        const requestedAnalysisId = params.analysisId || requestedActivityId;
        let requestedResumeId = params.resumeId || "";

        let loadedAnalysisDoc: any = null;
        let loadedResumeDoc: Resume | null = null;

        // 1. Try to fetch analysis document by analysisId or activityId
        if (requestedAnalysisId) {
          loadedAnalysisDoc = await fetchAnalysisByIdFromDb(uid, requestedAnalysisId);
        }

        if (loadedAnalysisDoc) {
          requestedResumeId = loadedAnalysisDoc.resumeId || requestedResumeId;
          const res = loadedAnalysisDoc.result || null;
          if (res && !res.scoringModelVersion && loadedAnalysisDoc.scoringModelVersion) {
            res.scoringModelVersion = loadedAnalysisDoc.scoringModelVersion;
          }
          setAnalysisResult(res);
          setTargetPosition(
            loadedAnalysisDoc.targetPosition || params.targetPosition || ""
          );

          if (loadedAnalysisDoc.createdAt) {
            try {
              const dt = loadedAnalysisDoc.createdAt.toDate
                ? loadedAnalysisDoc.createdAt.toDate()
                : new Date(loadedAnalysisDoc.createdAt);
              setResolvedDate(
                dt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              );
            } catch {
              setResolvedDate("");
            }
          }
        }

        // 2. Try to fetch the underlying resume document
        if (requestedResumeId) {
          loadedResumeDoc = await fetchActiveResumeFromDb(uid, requestedResumeId);
        } else if (requestedActivityId && !loadedAnalysisDoc) {
          // Fallback: Activity ID might have been stored as resumeId
          loadedResumeDoc = await fetchActiveResumeFromDb(uid, requestedActivityId);
          if (loadedResumeDoc && loadedResumeDoc.latestAnalysisId) {
            loadedAnalysisDoc = await fetchAnalysisByIdFromDb(
              uid,
              loadedResumeDoc.latestAnalysisId
            );
            if (loadedAnalysisDoc) {
              const res = loadedAnalysisDoc.result || null;
              if (res && !res.scoringModelVersion && loadedAnalysisDoc.scoringModelVersion) {
                res.scoringModelVersion = loadedAnalysisDoc.scoringModelVersion;
              }
              setAnalysisResult(res);
              setTargetPosition(
                loadedAnalysisDoc.targetPosition || params.targetPosition || ""
              );
            }
          }
        }

        if (isMounted) {
          if (loadedResumeDoc) {
            setResumeData(loadedResumeDoc);
            if (!targetPosition && params.targetPosition) {
              setTargetPosition(params.targetPosition);
            }
            if (!resolvedDate && loadedResumeDoc.uploadedAt) {
              try {
                const dt = (loadedResumeDoc.uploadedAt as any).toDate
                  ? (loadedResumeDoc.uploadedAt as any).toDate()
                  : new Date(loadedResumeDoc.uploadedAt as any);
                setResolvedDate(
                  dt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                );
              } catch {
                setResolvedDate("");
              }
            }
          } else if (loadedAnalysisDoc) {
            // Analysis document found even if separate resume doc was purged
            setTargetPosition(loadedAnalysisDoc.targetPosition || "");
          } else {
            setNotFound(true);
          }
        }
      } catch (err) {
        console.error("Error loading historical resume:", err);
        if (isMounted) {
          setNotFound(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadHistoricalData();

    return () => {
      isMounted = false;
    };
  }, [
    currentUser?.uid,
    params.activityId,
    params.analysisId,
    params.resumeId,
    params.targetPosition,
  ]);

  const structured: StructuredResumeData = resumeData?.structuredData || {};
  const hasStructuredSummary = !!structured.professionalSummary;
  const hasStructuredExperience =
    Array.isArray(structured.workExperience) && structured.workExperience.length > 0;
  const hasStructuredEducation =
    Array.isArray(structured.education) && structured.education.length > 0;
  const hasStructuredSkills =
    Array.isArray(structured.skills) && structured.skills.length > 0;
  const hasStructuredCertifications =
    Array.isArray(structured.certifications) && structured.certifications.length > 0;
  const hasStructuredProjects =
    Array.isArray(structured.projects) && structured.projects.length > 0;
  const hasStructuredTrainings =
    Array.isArray(structured.trainings) && structured.trainings.length > 0;

  const hasAnyStructuredSections =
    hasStructuredSummary ||
    hasStructuredExperience ||
    hasStructuredEducation ||
    hasStructuredSkills ||
    hasStructuredCertifications ||
    hasStructuredProjects ||
    hasStructuredTrainings;

  const rawText = resumeData?.rawText || "";
  const rawSections = parseRawTextIntoSections(rawText);

  const candidateName =
    structured.contactInformation?.name ||
    currentUser?.fullName ||
    "Student Candidate";
  const fileName =
    resumeData?.originalFileName || params.title?.replace("Analyzed ", "") || "Resume Document";
  const displayRole = targetPosition || currentUser?.targetPosition || "Target Role";
  const overallScore = analysisResult?.atsScore?.overallScore;
  const intrinsicScore = analysisResult?.atsScore?.breakdown?.resumeQualityScore;

  const isCanonicalV3 = Boolean(
    analysisResult?.scoringModelVersion === "3.0.0-canonical" ||
    (analysisResult?.resumeScore && analysisResult?.alignmentScore)
  );
  const displayResumeScore = analysisResult?.resumeScore?.overallScore ?? overallScore;
  const atsScoreVal = analysisResult?.atsScore?.overallScore ?? overallScore;
  const alignScoreVal = analysisResult?.alignmentScore?.overallScore;

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>
      {/* HEADER */}
      <View className="flex-row items-center justify-between py-4 border-b border-[#EAF2F7]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-white border border-[#BFD6EA]"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#1F3A5F" />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-lg font-extrabold text-[#1F3A5F]">Resume Details</Text>
          <Text className="text-[10px] font-bold text-[#CA5D25] uppercase tracking-wider">
            {isCanonicalV3 ? "Latest Result" : "Older Result"}
          </Text>
        </View>

        <View className="w-10" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#F4A47A" />
          <Text className="mt-4 text-sm font-bold text-[#4F6B82]">
            Loading resume details...
          </Text>
        </View>
      ) : notFound || (!resumeData && !analysisResult) ? (
        <View className="flex-1 items-center justify-center py-20 px-4">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-[#FEF5F1] mb-4 border border-[#FDEEE6]">
            <Ionicons name="document-text-outline" size={36} color="#CA5D25" />
          </View>
          <Text className="text-lg font-extrabold text-[#1F3A5F] text-center mb-2">
            Details not found
          </Text>
          <Text className="text-sm font-medium text-[#4F6B82] text-center leading-5 mb-6">
            This result is no longer saved on this device.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="px-6 py-3 bg-[#1F3A5F] rounded-xl"
          >
            <Text className="text-xs font-bold text-white uppercase tracking-wider">
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 mt-3"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {!isCanonicalV3 && (
            <View className="mb-4 p-3 bg-[#FEF5F1] rounded-2xl border border-[#F4A47A] flex-row items-center">
              <Ionicons name="time-outline" size={18} color="#CA5D25" className="mr-2" />
              <Text className="text-[11px] text-[#4F6B82] flex-1 leading-4">
                <Text className="font-bold text-[#CA5D25]">Older result: </Text>
                This was checked with an older version. Upload your resume again for updated scores.
              </Text>
            </View>
          )}

          {/* HERO SUMMARY CARD */}
          <View
            className="rounded-3xl bg-white p-6 border border-[#BFD6EA] mb-5"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1 pr-3">
                <Text className="text-2xl font-black text-[#1F3A5F]">{candidateName}</Text>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="briefcase-outline" size={14} color="#CA5D25" />
                  <Text className="text-xs font-bold text-[#CA5D25] ml-1.5">{displayRole}</Text>
                </View>
              </View>

              {typeof displayResumeScore === "number" && (
                <View className="items-end">
                  <View className="bg-[#FEF5F1] border border-[#F4A47A] px-3 py-1.5 rounded-2xl items-center">
                    <Text className="text-[10px] font-bold text-[#CA5D25] uppercase tracking-wider">
                      {isCanonicalV3 ? "Resume Score" : "ATS Score"}
                    </Text>
                    <Text className="text-xl font-black text-[#1F3A5F]">{displayResumeScore}</Text>
                  </View>
                  {isCanonicalV3 && typeof alignScoreVal === "number" && (
                    <Text className="text-[10px] font-semibold text-[#8B95A5] mt-1">
                      ATS: {atsScoreVal} · Alignment: {alignScoreVal}
                    </Text>
                  )}
                  {!isCanonicalV3 && typeof intrinsicScore === "number" && (
                    <Text className="text-[10px] font-semibold text-[#8B95A5] mt-1">
                      Earlier score: {intrinsicScore}/100
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* METADATA CHIPS */}
            <View className="pt-3 border-t border-[#EAF2F7] flex-row flex-wrap gap-2">
              <View className="bg-[#F4F8FB] px-3 py-1.5 rounded-lg border border-[#EAF2F7] flex-row items-center">
                <Ionicons name="document-attach-outline" size={14} color="#4F6B82" />
                <Text className="text-xs font-medium text-[#4F6B82] ml-1.5" numberOfLines={1}>
                  {fileName}
                </Text>
              </View>

              {resolvedDate ? (
                <View className="bg-[#F4F8FB] px-3 py-1.5 rounded-lg border border-[#EAF2F7] flex-row items-center">
                  <Ionicons name="calendar-outline" size={14} color="#4F6B82" />
                  <Text className="text-xs font-medium text-[#4F6B82] ml-1.5">
                    {resolvedDate}
                  </Text>
                </View>
              ) : null}

              {structured.contactInformation?.email && (
                <View className="bg-[#F4F8FB] px-3 py-1.5 rounded-lg border border-[#EAF2F7] flex-row items-center">
                  <Ionicons name="mail-outline" size={14} color="#4F6B82" />
                  <Text className="text-xs font-medium text-[#4F6B82] ml-1.5">
                    {structured.contactInformation.email}
                  </Text>
                </View>
              )}

              {structured.contactInformation?.phone && (
                <View className="bg-[#F4F8FB] px-3 py-1.5 rounded-lg border border-[#EAF2F7] flex-row items-center">
                  <Ionicons name="call-outline" size={14} color="#4F6B82" />
                  <Text className="text-xs font-medium text-[#4F6B82] ml-1.5">
                    {structured.contactInformation.phone}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* RENDER STRUCTURED SECTIONS IF AVAILABLE */}
          {hasAnyStructuredSections ? (
            <View className="gap-4">
              {/* Professional Summary */}
              {hasStructuredSummary && (
                <View
                  className="rounded-2xl bg-white p-5 border border-[#BFD6EA]"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="person-circle-outline" size={18} color="#1F3A5F" />
                    <Text className="text-sm font-extrabold text-[#1F3A5F] uppercase tracking-wider ml-2">
                      Professional Summary
                    </Text>
                  </View>
                  <Text className="text-sm leading-6 text-[#4F6B82] font-medium">
                    {structured.professionalSummary}
                  </Text>
                </View>
              )}

              {/* Work Experience */}
              {hasStructuredExperience && (
                <View
                  className="rounded-2xl bg-white p-5 border border-[#BFD6EA]"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-center mb-4">
                    <Ionicons name="briefcase-outline" size={18} color="#1F3A5F" />
                    <Text className="text-sm font-extrabold text-[#1F3A5F] uppercase tracking-wider ml-2">
                      Work Experience
                    </Text>
                  </View>
                  <View className="gap-4">
                    {structured.workExperience!.map((exp, idx) => (
                      <View
                        key={idx}
                        className={`pb-4 ${
                          idx < structured.workExperience!.length - 1
                            ? "border-b border-[#EAF2F7]"
                            : ""
                        }`}
                      >
                        <Text className="text-base font-bold text-[#1F3A5F]">{exp.role}</Text>
                        <View className="flex-row items-center justify-between mt-1 mb-2">
                          <Text className="text-xs font-semibold text-[#CA5D25]">
                            {exp.company}
                          </Text>
                          {exp.duration && (
                            <Text className="text-xs font-medium text-[#8B95A5]">
                              {exp.duration}
                            </Text>
                          )}
                        </View>
                        {exp.description ? (
                          <Text className="text-sm leading-5 text-[#4F6B82]">
                            {exp.description}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Education */}
              {hasStructuredEducation && (
                <View
                  className="rounded-2xl bg-white p-5 border border-[#BFD6EA]"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-center mb-4">
                    <Ionicons name="school-outline" size={18} color="#1F3A5F" />
                    <Text className="text-sm font-extrabold text-[#1F3A5F] uppercase tracking-wider ml-2">
                      Education
                    </Text>
                  </View>
                  <View className="gap-4">
                    {structured.education!.map((edu, idx) => (
                      <View
                        key={idx}
                        className={`pb-3 ${
                          idx < structured.education!.length - 1
                            ? "border-b border-[#EAF2F7]"
                            : ""
                        }`}
                      >
                        <Text className="text-base font-bold text-[#1F3A5F]">{edu.degree}</Text>
                        <View className="flex-row items-center justify-between mt-1">
                          <Text className="text-xs font-semibold text-[#CA5D25]">
                            {edu.school}
                          </Text>
                          {edu.graduationYear && (
                            <Text className="text-xs font-medium text-[#8B95A5]">
                              Class of {edu.graduationYear}
                            </Text>
                          )}
                        </View>
                        {edu.gpa && (
                          <Text className="text-xs font-medium text-[#4F6B82] mt-1">
                            GPA / Honors: {edu.gpa}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Skills */}
              {hasStructuredSkills && (
                <View
                  className="rounded-2xl bg-white p-5 border border-[#BFD6EA]"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="construct-outline" size={18} color="#1F3A5F" />
                    <Text className="text-sm font-extrabold text-[#1F3A5F] uppercase tracking-wider ml-2">
                      Skills found
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {structured.skills!.map((skill, idx) => (
                      <Tag key={idx} label={formatSkillDisplayName(skill)} variant="info" />
                    ))}
                  </View>
                </View>
              )}

              {/* Certifications */}
              {hasStructuredCertifications && (
                <View
                  className="rounded-2xl bg-white p-5 border border-[#BFD6EA]"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="ribbon-outline" size={18} color="#1F3A5F" />
                    <Text className="text-sm font-extrabold text-[#1F3A5F] uppercase tracking-wider ml-2">
                      Certifications & Credentials
                    </Text>
                  </View>
                  <View className="gap-3">
                    {structured.certifications!.map((cert, idx) => (
                      <View
                        key={idx}
                        className={`pb-3 ${
                          idx < structured.certifications!.length - 1
                            ? "border-b border-[#EAF2F7]"
                            : ""
                        }`}
                      >
                        <Text className="text-sm font-bold text-[#1F3A5F]">{cert.name}</Text>
                        <View className="flex-row items-center justify-between mt-1">
                          {cert.issuer && (
                            <Text className="text-xs font-semibold text-[#CA5D25]">
                              {cert.issuer}
                            </Text>
                          )}
                          {cert.date && (
                            <Text className="text-xs font-medium text-[#8B95A5]">
                              {cert.date}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Projects */}
              {hasStructuredProjects && (
                <View
                  className="rounded-2xl bg-white p-5 border border-[#BFD6EA]"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="code-slash-outline" size={18} color="#1F3A5F" />
                    <Text className="text-sm font-extrabold text-[#1F3A5F] uppercase tracking-wider ml-2">
                      Projects
                    </Text>
                  </View>
                  <View className="gap-4">
                    {structured.projects!.map((proj, idx) => (
                      <View
                        key={idx}
                        className={`pb-3 ${
                          idx < structured.projects!.length - 1
                            ? "border-b border-[#EAF2F7]"
                            : ""
                        }`}
                      >
                        <Text className="text-sm font-bold text-[#1F3A5F]">{proj.name}</Text>
                        {proj.description ? (
                          <Text className="text-sm leading-5 text-[#4F6B82] mt-1 mb-2">
                            {proj.description}
                          </Text>
                        ) : null}
                        {proj.technologies && proj.technologies.length > 0 && (
                          <View className="flex-row flex-wrap gap-1.5">
                            {proj.technologies.map((tech, tIdx) => (
                              <View
                                key={tIdx}
                                className="bg-[#F4F8FB] px-2.5 py-1 rounded border border-[#EAF2F7]"
                              >
                                <Text className="text-[10px] font-semibold text-[#1F3A5F]">
                                  {tech}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Trainings */}
              {hasStructuredTrainings && (
                <View
                  className="rounded-2xl bg-white p-5 border border-[#BFD6EA]"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="medal-outline" size={18} color="#1F3A5F" />
                    <Text className="text-sm font-extrabold text-[#1F3A5F] uppercase tracking-wider ml-2">
                      Training & Seminars
                    </Text>
                  </View>
                  <View className="gap-3">
                    {structured.trainings!.map((trn, idx) => (
                      <View
                        key={idx}
                        className={`pb-3 ${
                          idx < structured.trainings!.length - 1
                            ? "border-b border-[#EAF2F7]"
                            : ""
                        }`}
                      >
                        <Text className="text-sm font-bold text-[#1F3A5F]">{trn.title}</Text>
                        <View className="flex-row items-center justify-between mt-1">
                          {trn.provider && (
                            <Text className="text-xs font-semibold text-[#CA5D25]">
                              {trn.provider}
                            </Text>
                          )}
                          {trn.date && (
                            <Text className="text-xs font-medium text-[#8B95A5]">
                              {trn.date}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ) : (
            /* FALLBACK: RENDER FORMATTED RAW TEXT BLOCKS */
            <View className="gap-4">
              {rawSections.length > 0 ? (
                rawSections.map((sec, idx) => (
                  <View
                    key={idx}
                    className="rounded-2xl bg-white p-5 border border-[#BFD6EA]"
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <View className="flex-row items-center mb-3">
                      <Ionicons name="document-text-outline" size={16} color="#CA5D25" />
                      <Text className="text-sm font-extrabold text-[#1F3A5F] uppercase tracking-wider ml-2">
                        {sec.title}
                      </Text>
                    </View>
                    <Text className="text-sm leading-6 text-[#4F6B82] font-medium whitespace-pre-wrap">
                      {sec.body}
                    </Text>
                  </View>
                ))
              ) : rawText ? (
                <View
                  className="rounded-2xl bg-white p-5 border border-[#BFD6EA]"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <Text className="text-sm leading-6 text-[#4F6B82] font-medium whitespace-pre-wrap">
                    {rawText}
                  </Text>
                </View>
              ) : (
                <View className="items-center py-10 bg-white rounded-2xl border border-[#BFD6EA]">
                  <Text className="text-sm font-medium text-[#8B95A5]">
                    No readable sections found in this resume.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* TOGGLE FULL RAW TEXT OPTION */}
          {rawText && hasAnyStructuredSections && (
            <View className="mt-6">
              <TouchableOpacity
                onPress={() => setShowRawTextToggle(!showRawTextToggle)}
                className="py-3 px-4 rounded-xl bg-white border border-[#BFD6EA] flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Ionicons name="code-working-outline" size={18} color="#1F3A5F" />
                  <Text className="text-xs font-bold text-[#1F3A5F] ml-2">
                    {showRawTextToggle ? "Hide text" : "Show extracted text"}
                  </Text>
                </View>
                <Ionicons
                  name={showRawTextToggle ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#1F3A5F"
                />
              </TouchableOpacity>

              {showRawTextToggle && (
                <View className="mt-3 p-4 bg-[#F4F8FB] rounded-xl border border-[#EAF2F7]">
                  <Text className="text-xs font-mono leading-5 text-[#4F6B82]">
                    {rawText}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
