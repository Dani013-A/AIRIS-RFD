import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";

import { getAiRecommendationsForResume } from "../../data/learningRecommendations";

export default function DashboardScreen() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const loading = useAuthStore((state) => state.loading);
  const activeResume = useResumeStore((state) => state.activeResume);
  const activeAnalysis = useResumeStore((state) => state.activeAnalysis);
  const processingStatus = useResumeStore((state) => state.processingStatus);

  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [expandedBreakdown, setExpandedBreakdown] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"certification" | "seminar" | "course">("certification");
  const [showScoreMath, setShowScoreMath] = useState(false);
  const [showAtsMatchDetails, setShowAtsMatchDetails] = useState(false);
  const [showAtsCompatDetails, setShowAtsCompatDetails] = useState(false);

  const isProcessing =
    processingStatus === "extracting" ||
    processingStatus === "validating" ||
    processingStatus === "parsing" ||
    processingStatus === "analyzing" ||
    processingStatus === "saving";

  if (isProcessing) {
    const isStageDone = (stage: string) => {
      const order = ["extracting", "validating", "parsing", "analyzing", "saving"];
      return order.indexOf(processingStatus) > order.indexOf(stage);
    };
    
    const isStageActive = (stage: string) => processingStatus === stage;

    const renderStage = (key: string, label: string) => (
      <View className="flex-row items-center mb-4">
        {isStageDone(key) ? (
          <Ionicons name="checkmark-circle" size={22} color="#79D5C8" />
        ) : isStageActive(key) ? (
          <ActivityIndicator size="small" color="#F4A47A" style={{ width: 22, height: 22 }} />
        ) : (
          <Ionicons name="ellipse-outline" size={22} color="#BFD6EA" />
        )}
        <Text className={`ml-3 text-sm font-semibold ${isStageDone(key) || isStageActive(key) ? "text-[#1F3A5F]" : "text-[#4F6B82]"}`}>
          {label}
        </Text>
      </View>
    );

    return (
      <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>
        <View className="py-6 items-center justify-center flex-1">
          <Text className="mt-4 text-2xl font-extrabold text-[#1F3A5F] text-center">Analyzing your resume</Text>
          <Text className="mt-3 text-center text-sm text-[#4F6B82] px-4 leading-5 mb-10">
            AIRIS is reviewing your resume structure, skills, experience, and target-role alignment.
            This may take a little while. Please keep the app open while we finish.
          </Text>
          
          <View className="w-full bg-white p-6 rounded-3xl shadow-sm border border-[#BFD6EA]">
            {renderStage("extracting", "Reading resume content")}
            {renderStage("validating", "Checking document structure")}
            {renderStage("parsing", "Identifying education & experience sections")}
            {renderStage("analyzing", "Analyzing skills and role alignment")}
            {renderStage("saving", "Finding improvement opportunities")}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const handleOpenOfficialLink = async (url: string) => {
    if (!url) {
       Alert.alert("Link Unavailable", "There is no official link available for this resource at the moment.");
       return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Link Error", "Cannot open this URL on your device.");
      }
    } catch {
      Alert.alert("Link Error", "Failed to open official link.");
    }
  };

  const toggleBreakdown = (key: string) => {
    setExpandedBreakdown(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F4F8FB]">
        <ActivityIndicator size="large" color="#F4A47A" />
      </SafeAreaView>
    );
  }

  const hasResume = currentUser?.hasUploadedResume === true && !!activeResume && !!activeAnalysis;

  if (!hasResume) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>
        <View className="flex-row items-center justify-between py-6">
          <View>
            <Text className="text-sm font-medium text-[#4F6B82]">Welcome back,</Text>
            <Text className="text-2xl font-bold text-[#1F3A5F]">
              {currentUser?.fullName ?? "Student"}
            </Text>
          </View>
        </View>

        <View className="flex-1 justify-center items-center pb-20">
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-[#EAF2F7] shadow-sm">
            <Ionicons name="document-text" size={40} color="#79D5C8" />
          </View>

          <Text className="text-2xl font-extrabold text-center text-[#1F3A5F]">No Analysis Yet</Text>
          <Text className="mt-3 text-base leading-6 text-center text-[#4F6B82] px-4 mb-8">
            Upload your resume to receive ATS feedback, content analysis, skill-gap recommendations, and tailored career resources.
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/(student)/resume-upload")}
            className="h-14 px-8 items-center justify-center rounded-full bg-[#F4A47A] shadow-sm flex-row"
          >
            <Text className="text-base font-bold text-white mr-2">Upload Resume</Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const overallScore = activeAnalysis.atsScore.overallScore;
  const levelKey = activeAnalysis.atsScore.level;

  let scoreInterpretation = "Good foundation. A few targeted improvements will make it even stronger.";
  if (overallScore >= 85) scoreInterpretation = "Outstanding! Your resume is highly effective and clearly highlights your strengths.";
  else if (overallScore < 50) scoreInterpretation = "Needs attention. Your resume requires some important improvements to get noticed.";

  const priorityWeights: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const sortedSuggestions = [...(activeAnalysis.suggestions || [])].sort((a, b) => {
    const wA = priorityWeights[a.priority] || 0;
    const wB = priorityWeights[b.priority] || 0;
    return wB - wA;
  });
  const topSuggestions = sortedSuggestions.slice(0, 3);

  const adjustments = activeAnalysis.atsScore.roleRelevance?.adjustments || activeAnalysis.atsScore.adjustments || [];
  const categoriesToGroup = [
    { key: "atsCompatibility", label: "ATS Compatibility" },
    { key: "skillsMatch", label: "Skills Match" },
    { key: "experience", label: "Experience & Projects" },
    { key: "educationRelevance", label: "Education Relevance" },
    { key: "certifications", label: "Certifications" },
  ];

  const semanticAdjustments = adjustments.filter(adj => adj.category === "skillsMatch");
  const strongMatches = semanticAdjustments.filter(adj => adj.points === 10);
  const partialMatches = semanticAdjustments.filter(adj => adj.points === 5);
  const missingMatches = semanticAdjustments.filter(adj => adj.points === 0);
  const getConcept = (ruleId: string) => ruleId.replace("match_", "").replace(/_/g, " ");


  const detectedSections = activeAnalysis.detectedSections || [];
  const allRecommendations = getAiRecommendationsForResume(
    activeAnalysis,
    currentUser?.degreeProgram || "",
    currentUser?.targetPosition || "",
  );
  
  const filteredRecommendations = allRecommendations.filter((r) => {
    if (activeTab === "certification") {
      return r.type === "certification" || r.type === "documentation" || r.type === "learning-path";
    }
    return r.type === activeTab;
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB]" edges={["top", "left", "right"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* HEADER SECTION - LIGHT BLUE */}
        <View className="px-6 pt-6 pb-8 bg-[#CFE0EC] rounded-b-[40px] shadow-sm mb-4 border-b border-[#BFD6EA]">
          <View className="flex-row items-center justify-between mb-8">
            <View className="flex-1 pr-4">
              <Text className="text-[10px] font-bold text-[#4F6B82] uppercase tracking-widest mb-1">Resume</Text>
              <Text className="text-xl font-extrabold text-[#1F3A5F]" numberOfLines={1}>{activeResume?.originalFileName}</Text>
              <Text className="text-xs font-semibold text-[#4F6B82] mt-1">Target: {currentUser?.targetPosition || "Not Selected"}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(student)/resume-upload")} className="h-10 px-4 items-center justify-center rounded-full bg-white border border-[#BFD6EA] shadow-sm">
              <Text className="text-xs font-bold text-[#1F3A5F]">Update</Text>
            </TouchableOpacity>
          </View>

          <View className="items-center mb-6">
            <Text className="text-[10px] font-bold text-[#4F6B82] uppercase tracking-widest mb-2">Your Resume Score</Text>
            <Text className="text-[80px] leading-[90px] font-black text-[#1F3A5F]">{overallScore}</Text>
            <View className={`mt-2 px-5 py-2 rounded-full ${overallScore >= 70 ? 'bg-[#D7F1ED] border border-[#79D5C8]' : 'bg-[#FDEEE6] border border-[#F4A47A]'}`} style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 }}>
               <Text className={`text-sm font-bold ${overallScore >= 70 ? 'text-[#1E5D53]' : 'text-[#CA5D25]'}`}>
                 {levelKey === "ExcellentMatch" ? "Excellent Match" : levelKey === "StrongFoundation" ? "Strong Foundation" : levelKey === "GettingThere" ? "Getting There" : "Needs Improvement"}
               </Text>
            </View>
            <TouchableOpacity onPress={() => setShowScoreMath(!showScoreMath)} className="mt-3 bg-[#F4F8FB] px-4 py-2 rounded-full border border-[#EAF2F7] flex-row items-center" style={{ alignSelf: 'center' }}>
              <Text className="text-[10px] font-bold text-[#4F6B82] mr-2 text-center flex-shrink" style={{ flexShrink: 1 }}>Score = Resume Score 50% + Role Relevance 50%</Text>
              <Ionicons name={showScoreMath ? "chevron-up" : "chevron-down"} size={14} color="#8B95A5" />
            </TouchableOpacity>

            {showScoreMath && (
              <View className="bg-white rounded-2xl border border-[#BFD6EA] mt-4 w-[90%] overflow-hidden" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                <View className="p-4 bg-[#F4F8FB] border-b border-[#EAF2F7]">
                  <Text className="text-[10px] font-bold text-[#1F3A5F] uppercase tracking-widest text-center">How is this calculated?</Text>
                </View>
                <View className="p-5 gap-3">
                  {/* New Architecture Display */}
                  {activeAnalysis.atsScore.resumeScore && activeAnalysis.atsScore.roleRelevance ? (
                    <>
                      <View className="flex-row justify-between items-center">
                        <Text className="text-xs font-bold text-[#4F6B82]">Resume Score</Text>
                        <Text className="text-[11px] font-medium text-[#8B95A5]">{activeAnalysis.atsScore.resumeScore.total}/100 × 50% = <Text className="font-bold text-[#1F3A5F] text-xs">{Number.isInteger(activeAnalysis.atsScore.resumeScore.total * 0.5) ? (activeAnalysis.atsScore.resumeScore.total * 0.5) : (activeAnalysis.atsScore.resumeScore.total * 0.5).toFixed(1)}</Text></Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <Text className="text-xs font-bold text-[#4F6B82]">Role Relevance</Text>
                        <Text className="text-[11px] font-medium text-[#8B95A5]">{activeAnalysis.atsScore.roleRelevance.total}/100 × 50% = <Text className="font-bold text-[#1F3A5F] text-xs">{Number.isInteger(activeAnalysis.atsScore.roleRelevance.total * 0.5) ? (activeAnalysis.atsScore.roleRelevance.total * 0.5) : (activeAnalysis.atsScore.roleRelevance.total * 0.5).toFixed(1)}</Text></Text>
                      </View>
                    </>
                  ) : (
                    /* Legacy Architecture Display Fallback */
                    <>
                      <Text className="text-xs text-[#CA5D25] italic text-center mb-2">Displaying legacy analysis data</Text>
                      <View className="flex-row justify-between items-center">
                        <Text className="text-xs font-bold text-[#4F6B82]">Role Match</Text>
                        <Text className="text-[11px] font-medium text-[#8B95A5]">{activeAnalysis.atsScore.breakdown?.semanticRoleMatch?.rawScore ?? 0}/100</Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <Text className="text-xs font-bold text-[#4F6B82]">Resume Quality</Text>
                        <Text className="text-[11px] font-medium text-[#8B95A5]">{activeAnalysis.atsScore.breakdown?.resumeQuality?.rawScore ?? 0}/100</Text>
                      </View>
                    </>
                  )}
                  
                  <View className="h-[1px] bg-[#EAF2F7] my-2" />
                  <View className="flex-row justify-between items-center bg-[#F4F8FB] -mx-5 -mb-5 p-5">
                    <Text className="text-xs font-black text-[#1F3A5F] uppercase tracking-widest">Overall Resume Score</Text>
                    <Text className="text-lg font-black text-[#1F3A5F]">≈ {overallScore}</Text>
                  </View>
                </View>
              </View>
            )}

            <Text className="text-sm text-center font-medium text-[#4F6B82] mt-4 px-6 leading-5">{scoreInterpretation}</Text>
          </View>

          {/* Resume Score Intrinsic Card */}
          <View className="bg-white rounded-2xl border border-[#BFD6EA] mx-6 mb-4 overflow-hidden" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <TouchableOpacity onPress={() => setShowAtsCompatDetails(!showAtsCompatDetails)} className="flex-row items-center justify-between p-5">
              <View>
                <Text className="text-[10px] font-bold text-[#4F6B82] uppercase tracking-widest mb-1">Intrinsic Value</Text>
                <View className="flex-row items-baseline">
                  <Text className="text-3xl font-black text-[#1F3A5F]">{activeAnalysis.atsScore.resumeScore?.total ?? 0}</Text>
                  <Text className="text-lg font-bold text-[#8B95A5]">/100</Text>
                </View>
                <Text className="text-xs font-bold text-[#1F3A5F] mt-1">Resume Score</Text>
              </View>
              <Ionicons name={showAtsCompatDetails ? "chevron-up" : "chevron-down"} size={20} color="#8B95A5" />
            </TouchableOpacity>
            
            {showAtsCompatDetails && activeAnalysis.atsScore.resumeScore && (
              <View className="px-5 pb-5 pt-2 border-t border-[#EAF2F7]">
                <Text className="text-sm font-bold text-[#1F3A5F] mb-1">Resume Strength Breakdown</Text>
                <Text className="text-xs text-[#4F6B82] mb-5 flex-wrap" style={{ flexShrink: 1 }}>
                  This measures the strength of your resume's evidence entirely independent of your target role.
                </Text>

                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-xs font-bold text-[#4F6B82]">Skills Value</Text>
                  <Text className="text-[11px] font-medium text-[#8B95A5]">{activeAnalysis.atsScore.resumeScore.breakdown.skills.rawScore}/100 × 50% = <Text className="font-bold text-[#1F3A5F] text-xs">{activeAnalysis.atsScore.resumeScore.breakdown.skills.weightedScore}</Text></Text>
                </View>
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-xs font-bold text-[#4F6B82]">Education Value</Text>
                  <Text className="text-[11px] font-medium text-[#8B95A5]">{activeAnalysis.atsScore.resumeScore.breakdown.education.rawScore}/100 × 25% = <Text className="font-bold text-[#1F3A5F] text-xs">{activeAnalysis.atsScore.resumeScore.breakdown.education.weightedScore}</Text></Text>
                </View>
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-xs font-bold text-[#4F6B82]">Certification Value</Text>
                  <Text className="text-[11px] font-medium text-[#8B95A5]">{activeAnalysis.atsScore.resumeScore.breakdown.certifications.rawScore}/100 × 25% = <Text className="font-bold text-[#1F3A5F] text-xs">{activeAnalysis.atsScore.resumeScore.breakdown.certifications.weightedScore}</Text></Text>
                </View>
              </View>
            )}
          </View>

          {/* Role Relevance Diagnostic */}
          <View className="bg-white rounded-2xl border border-[#BFD6EA] mx-6 mb-4 overflow-hidden" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <TouchableOpacity onPress={() => setShowAtsMatchDetails(!showAtsMatchDetails)} className="flex-row items-center justify-between p-5">
              <View>
                <Text className="text-[10px] font-bold text-[#4F6B82] uppercase tracking-widest mb-1">Target Match</Text>
                <View className="flex-row items-baseline">
                  <Text className="text-3xl font-black text-[#1F3A5F]">{activeAnalysis.atsScore.roleRelevance?.total ?? 0}</Text>
                  <Text className="text-lg font-bold text-[#8B95A5]">/100</Text>
                </View>
                <Text className="text-xs font-bold text-[#1F3A5F] mt-1">Role Relevance</Text>
              </View>
              <Ionicons name={showAtsMatchDetails ? "chevron-up" : "chevron-down"} size={20} color="#8B95A5" />
            </TouchableOpacity>
            
            {showAtsMatchDetails && (
              <View className="px-5 pb-5 pt-2 border-t border-[#EAF2F7]">
                
                {/* Math Breakdown */}
                {activeAnalysis.atsScore.roleRelevance && (
                  <View className="mb-5 pb-4 border-b border-[#EAF2F7]">
                    <Text className="text-sm font-bold text-[#1F3A5F] mb-1">Semantic Match Breakdown</Text>
                    <Text className="text-xs text-[#4F6B82] mb-4 flex-wrap" style={{ flexShrink: 1 }}>
                      This calculates how much of your resume directly aligns with {currentUser?.targetPosition || 'your target role'}.
                    </Text>
                    <View className="flex-row justify-between items-center mb-3">
                      <Text className="text-xs font-bold text-[#4F6B82]">Skills Match</Text>
                      <Text className="text-[11px] font-medium text-[#8B95A5]">{activeAnalysis.atsScore.roleRelevance.breakdown.skillsMatch.rawScore}/100 × 40% = <Text className="font-bold text-[#1F3A5F] text-xs">{activeAnalysis.atsScore.roleRelevance.breakdown.skillsMatch.weightedScore}</Text></Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-3">
                      <Text className="text-xs font-bold text-[#4F6B82]">Experience Match</Text>
                      <Text className="text-[11px] font-medium text-[#8B95A5]">{activeAnalysis.atsScore.roleRelevance.breakdown.experienceMatch.rawScore}/100 × 30% = <Text className="font-bold text-[#1F3A5F] text-xs">{activeAnalysis.atsScore.roleRelevance.breakdown.experienceMatch.weightedScore}</Text></Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-3">
                      <Text className="text-xs font-bold text-[#4F6B82]">Education Match</Text>
                      <Text className="text-[11px] font-medium text-[#8B95A5]">{activeAnalysis.atsScore.roleRelevance.breakdown.educationMatch.rawScore}/100 × 20% = <Text className="font-bold text-[#1F3A5F] text-xs">{activeAnalysis.atsScore.roleRelevance.breakdown.educationMatch.weightedScore}</Text></Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs font-bold text-[#4F6B82]">Certifications Match</Text>
                      <Text className="text-[11px] font-medium text-[#8B95A5]">{activeAnalysis.atsScore.roleRelevance.breakdown.certificationsMatch.rawScore}/100 × 10% = <Text className="font-bold text-[#1F3A5F] text-xs">{activeAnalysis.atsScore.roleRelevance.breakdown.certificationsMatch.weightedScore}</Text></Text>
                    </View>
                  </View>
                )}

                <Text className="text-sm font-bold text-[#1F3A5F] mb-1">Role Competency Analysis</Text>
                <Text className="text-xs text-[#4F6B82] mb-5 flex-wrap" style={{ flexShrink: 1 }}>
                  Here is the actual evidence we detected in your resume for {currentUser?.targetPosition || 'your target role'}.
                </Text>
                
                {strongMatches.length > 0 && (
                  <View className="mb-4">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="checkmark-circle" size={14} color="#1E5D53" />
                      <Text className="ml-1.5 text-[10px] font-bold text-[#1E5D53] uppercase tracking-widest">Strong Matches</Text>
                    </View>
                    <View className="gap-3 pl-1">
                      {strongMatches.map((adj, i) => (
                        <View key={i} className="flex-row items-start">
                          <Ionicons name="checkmark-circle" size={12} color="#1E5D53" style={{ marginRight: 6, marginTop: 1 }} />
                          <View className="flex-1">
                            <Text className="text-xs font-bold text-[#1F3A5F]">{getConcept(adj.ruleId)}</Text>
                            {adj.matchedChunk && (
                              <Text className="text-[11px] text-[#4F6B82] mt-0.5 italic">"{adj.matchedChunk}"</Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
                {partialMatches.length > 0 && (
                  <View className="mb-4">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="warning" size={14} color="#CA5D25" />
                      <Text className="ml-1.5 text-[10px] font-bold text-[#CA5D25] uppercase tracking-widest">Partial Matches</Text>
                    </View>
                    <View className="gap-3 pl-1">
                      {partialMatches.map((adj, i) => (
                        <View key={i} className="flex-row items-start">
                          <Ionicons name="warning" size={12} color="#CA5D25" style={{ marginRight: 6, marginTop: 1 }} />
                          <View className="flex-1">
                            <Text className="text-xs font-bold text-[#1F3A5F]">{getConcept(adj.ruleId)}</Text>
                            {adj.matchedChunk && (
                              <Text className="text-[11px] text-[#4F6B82] mt-0.5 italic">"{adj.matchedChunk}"</Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
                {missingMatches.length > 0 && (
                  <View>
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="close-circle" size={14} color="#D32F2F" />
                      <Text className="ml-1.5 text-[10px] font-bold text-[#D32F2F] uppercase tracking-widest">Missing / Weak Areas</Text>
                    </View>
                    <View className="gap-2 pl-1">
                      {missingMatches.map((adj, i) => (
                        <View key={i} className="flex-row items-start">
                          <Ionicons name="close-circle" size={12} color="#D32F2F" style={{ marginRight: 6, marginTop: 1 }} />
                          <Text className="text-xs font-semibold text-[#1F3A5F] flex-1 flex-wrap">{getConcept(adj.ruleId)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
                {strongMatches.length === 0 && partialMatches.length === 0 && missingMatches.length === 0 && (
                  <Text className="text-xs text-[#8B95A5] italic mt-2">No specific competency matches were detected for this analysis.</Text>
                )}
              </View>
            )}
          </View>

          {/* Solid 50% width separator */}
          <View className="items-center mb-6">
            <View className="w-1/2 h-[2px] bg-[#8B95A5]/30 rounded-full" />
          </View>
        </View>

        {/* DETECTED SECTIONS */}
        <View className="px-6 mt-8">
          <Text className="text-lg font-extrabold text-[#1F3A5F] mb-3">Detected Sections</Text>
          <View className="flex-row flex-wrap gap-2">
            {(() => {
              const ALL_SECTIONS: string[] = [
                "ContactInformation", "ProfessionalSummary", "Education", "Skills", 
                "WorkExperience", "Projects", "Internships", "RelevantCoursework", 
                "Certifications", "OrganizationsAndLeadership", "Achievements", 
                "Languages", "Trainings"
              ];
              
              const detectedNames = new Set(detectedSections.filter(s => s.isPresent).map(s => s.name));
              
              // Add any custom detected sections
              detectedSections.filter(s => s.isPresent).forEach(s => {
                if (!ALL_SECTIONS.includes(s.name) && (s.name as string) !== 'Content') {
                  ALL_SECTIONS.push(s.name);
                }
              });

              return ALL_SECTIONS.map((sectionName, idx) => {
                const isPresent = detectedNames.has(sectionName as any);
                if (isPresent) {
                  return (
                    <View key={`sec-${idx}`} className="flex-row items-center bg-white px-3 py-1.5 rounded-full border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 }}>
                      <Ionicons name="checkmark-circle" size={14} color="#79D5C8" />
                      <Text className="ml-1.5 text-xs font-bold text-[#1F3A5F]">
                        {sectionName.replace(/([A-Z])/g, " $1").trim()}
                      </Text>
                    </View>
                  );
                } else {
                  return (
                    <View key={`sec-${idx}`} className="flex-row items-center bg-transparent px-3 py-1.5 rounded-full border border-[#BFD6EA] opacity-60">
                      <Ionicons name="ellipse-outline" size={14} color="#8B95A5" />
                      <Text className="ml-1.5 text-xs font-semibold text-[#4F6B82]">
                        {sectionName.replace(/([A-Z])/g, " $1").trim()}
                      </Text>
                    </View>
                  );
                }
              });
            })()}
          </View>
        </View>

        {/* TOP IMPROVEMENTS */}
        <View className="px-6 mt-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-extrabold text-[#1F3A5F]">Improve Your Resume</Text>
            {sortedSuggestions.length > 3 && (
              <TouchableOpacity onPress={() => setShowAllSuggestions(true)}>
                <Text className="text-sm font-bold text-[#F4A47A]">View all {sortedSuggestions.length} →</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="gap-4">
            {topSuggestions.map((suggestion, idx) => (
              <View key={idx} className="bg-white rounded-2xl p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                <View className="flex-row items-start mb-3">
                  <View className="mt-0.5 mr-2">
                    <Ionicons name={suggestion.priority === "critical" ? "warning" : "bulb"} size={18} color={suggestion.priority === "critical" ? "#CA5D25" : "#1F3A5F"} />
                  </View>
                  <Text className="text-base font-bold text-[#1F3A5F] flex-1">{suggestion.title}</Text>
                </View>
                
                <Text className="text-sm leading-5 text-justify text-[#4F6B82] mb-3">
                  {suggestion.description || suggestion.message}
                </Text>
                
                {suggestion.example && (
                  <View className="bg-[#FEF5F1] p-4 rounded-xl border border-[#FDEEE6]">
                    <Text className="text-[10px] font-bold text-[#CA5D25] uppercase tracking-widest mb-1.5">Suggested Rewrite</Text>
                    <Text className="text-sm leading-5 text-justify text-[#CA5D25] font-medium">{suggestion.example}</Text>
                  </View>
                )}
              </View>
            ))}
            {topSuggestions.length === 0 && (
              <View className="bg-[#F1FAF8] p-5 rounded-2xl border border-[#D7F1ED] items-center" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 }}>
                <Ionicons name="checkmark-circle" size={32} color="#1E5D53" className="mb-2" />
                <Text className="text-sm font-bold text-[#1E5D53] text-center">No critical improvements found. Great job!</Text>
              </View>
            )}
          </View>
        </View>

        {/* DETAILED SCORE BREAKDOWN */}
        <View className="px-6 mt-10">
          <Text className="text-lg font-extrabold text-[#1F3A5F] mb-1">Score Breakdown</Text>
          <Text className="text-sm text-[#4F6B82] mb-4">Understand how your score was calculated.</Text>

          <View className="bg-white rounded-2xl border border-[#BFD6EA] overflow-hidden" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            {categoriesToGroup.map((cat, groupIdx) => {
              const groupAdjustments = adjustments.filter((adj) => adj.category === cat.key);
              if (groupAdjustments.length === 0) return null;
              const isExpanded = expandedBreakdown[cat.key];

              return (
                <View key={groupIdx} className="border-b border-[#EAF2F7] last:border-b-0">
                  <TouchableOpacity 
                    onPress={() => toggleBreakdown(cat.key)}
                    className={`flex-row items-center justify-between p-5 ${isExpanded ? 'bg-[#F4F8FB]' : 'bg-white'}`}
                  >
                    <Text className="text-sm font-bold text-[#1F3A5F]">{cat.label}</Text>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#8B95A5" />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View className="px-4 pb-4 bg-[#F4F8FB]">
                      {groupAdjustments.map((adjustment, idx) => (
                        <View key={idx} className={`flex-row items-start p-3 mb-2 rounded-xl border ${adjustment.passed ? "bg-[#D7F1ED]/20 border-[#79D5C8]/30" : "bg-[#FDEEE6]/20 border-[#F4A47A]/30"}`}>
                          <Ionicons 
                            name={adjustment.passed ? "checkmark-circle" : "alert-circle"} 
                            size={18} 
                            color={adjustment.passed ? "#1E5D53" : "#CA5D25"} 
                            style={{ marginTop: 1 }}
                          />
                          <View className="ml-3 flex-1">
                            <Text className={`text-sm font-semibold leading-5 ${adjustment.passed ? "text-[#1E5D53]" : "text-[#CA5D25]"}`}>
                              {adjustment.reason.split(" (Rule:")[0]}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* GROWTH PATHS */}
        <View className="px-6 mt-10">
          <Text className="text-lg font-extrabold text-[#1F3A5F] mb-4">Recommended Growth Paths</Text>
          
          <View className="flex-row bg-[#EAF2F7] p-1.5 rounded-xl mb-5 border border-[#BFD6EA]">
            <TouchableOpacity onPress={() => setActiveTab("certification")} className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === "certification" ? "bg-white border border-[#BFD6EA]" : ""}`} style={activeTab === "certification" ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 } : {}}>
              <Text className={`text-xs font-bold ${activeTab === "certification" ? "text-[#1F3A5F]" : "text-[#4F6B82]"}`}>Certifications</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab("seminar")} className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === "seminar" ? "bg-white border border-[#BFD6EA]" : ""}`} style={activeTab === "seminar" ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 } : {}}>
              <Text className={`text-xs font-bold ${activeTab === "seminar" ? "text-[#1F3A5F]" : "text-[#4F6B82]"}`}>Seminars</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab("course")} className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === "course" ? "bg-white border border-[#BFD6EA]" : ""}`} style={activeTab === "course" ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 } : {}}>
              <Text className={`text-xs font-bold ${activeTab === "course" ? "text-[#1F3A5F]" : "text-[#4F6B82]"}`}>Courses</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-4">
            {filteredRecommendations.map((item, idx) => (
              <View key={idx} className="bg-white rounded-2xl p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                <View className="flex-row justify-between items-start mb-2.5">
                  <Text className="text-[10px] font-black text-[#F4A47A] uppercase tracking-widest">{item.provider}</Text>
                  <View className="bg-[#EAF2F7] px-2.5 py-1 rounded-full border border-[#BFD6EA]">
                    <Text className="text-[10px] font-bold text-[#1F3A5F] capitalize">{item.type}</Text>
                  </View>
                </View>
                
                <Text className="text-lg font-bold text-[#1F3A5F] mb-2 leading-6">{item.title}</Text>
                
                <Text className="text-sm leading-5 text-[#4F6B82] mb-4">{item.description}</Text>
                
                {item.gapRationale && (
                  <View className="mb-4 bg-[#F4F8FB] p-3 rounded-xl border border-[#EAF2F7]">
                    <View className="flex-row items-center mb-1.5">
                      <Ionicons name="sparkles" size={14} color="#F4A47A" className="mr-1" />
                      <Text className="text-[10px] font-bold text-[#CA5D25] uppercase tracking-widest ml-1">Why this is recommended</Text>
                    </View>
                    <Text className="text-sm font-medium text-[#4F6B82] leading-5">
                      {item.gapRationale.replace(/Gap Detected: /gi, "").replace(/This is highly expected by recruiters\./gi, "Adding this can strengthen your profile if you have experience with it.")}
                    </Text>
                  </View>
                )}
                
                <View className="flex-row gap-3 mt-1">
                  <TouchableOpacity
                    onPress={() => handleOpenOfficialLink(item.url)}
                    className="flex-1 h-12 flex-row items-center justify-center rounded-xl bg-[#EAF2F7] border border-[#BFD6EA]"
                  >
                    <Text className="text-xs font-bold text-[#1F3A5F] mr-2">Official Resource</Text>
                    <Ionicons name="open-outline" size={16} color="#1F3A5F" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push(`/(student)/(tabs)/learn?search=${encodeURIComponent(item.title)}` as any)}
                    className="h-12 px-5 items-center justify-center rounded-xl border border-[#BFD6EA] bg-white"
                  >
                    <Ionicons name="search" size={18} color="#4F6B82" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            
            {filteredRecommendations.length === 0 && (
              <View className="items-center py-12 bg-[#F4F8FB] rounded-2xl border border-dashed border-[#BFD6EA]">
                <Ionicons name="document-text-outline" size={32} color="#BFD6EA" className="mb-2" />
                <Text className="text-sm font-bold text-[#8B95A5]">No {activeTab}s recommended right now.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ALL SUGGESTIONS MODAL */}
      <Modal visible={showAllSuggestions} transparent animationType="slide" onRequestClose={() => setShowAllSuggestions(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="h-5/6 rounded-t-3xl bg-[#F4F8FB] shadow-lg overflow-hidden">
            <View className="flex-row items-center justify-between p-6 bg-white border-b border-[#BFD6EA]">
              <Text className="text-xl font-extrabold text-[#1F3A5F]">All Improvements</Text>
              <TouchableOpacity onPress={() => setShowAllSuggestions(false)} className="h-8 w-8 items-center justify-center bg-[#EAF2F7] rounded-full">
                <Ionicons name="close" size={20} color="#1F3A5F" />
              </TouchableOpacity>
            </View>

            <ScrollView className="p-6 bg-[#F4F8FB]" showsVerticalScrollIndicator={false}>
              <View className="gap-4 pb-12">
                {sortedSuggestions.map((suggestion, idx) => (
                  <View key={idx} className="bg-white rounded-2xl p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                    <View className="flex-row items-start mb-3">
                      <View className="mt-0.5 mr-2">
                        <Ionicons name={suggestion.priority === "critical" ? "warning" : "bulb"} size={18} color={suggestion.priority === "critical" ? "#CA5D25" : "#1F3A5F"} />
                      </View>
                      <Text className="text-base font-bold text-[#1F3A5F] flex-1">{suggestion.title}</Text>
                    </View>
                    
                    <Text className="text-sm leading-5 text-justify text-[#4F6B82] mb-3">
                      {suggestion.description || suggestion.message}
                    </Text>
                    
                    {suggestion.example && (
                      <View className="bg-[#FEF5F1] p-4 rounded-xl border border-[#FDEEE6]">
                        <Text className="text-[10px] font-bold text-[#CA5D25] uppercase tracking-widest mb-1.5">Suggested Rewrite</Text>
                        <Text className="text-sm leading-5 text-justify text-[#CA5D25] font-medium">{suggestion.example}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
