import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../../components/ui/AppText";
import { Tag } from "../../components/ui";
import { formatSkillDisplayName } from "../../utils/displayNames";
import { SafeAreaView } from "react-native-safe-area-context";
import { ResourceCard } from "../../components/learning/ResourceCard";
import { SkeletonResourceCard } from "../../components/ui";
import { DEFAULT_LEARNING_CATEGORIES } from "../../data/learningCategories";
import {
  getInstantCatalog,
  loadCachedCatalog,
  logForYouRecommendations,
  matchLearningRecommendations,
  refreshCatalog,
  subscribeToCatalog,
} from "../../services/learning/learningCatalogService";
import { getStoredSelfAssessments } from "../../services/resume/selfAssessmentService";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import {
  LearningCategory,
  LearningResource,
  PrimaryLearnCategory,
} from "../../types/learning.types";
import { OFFICIAL_RESUME_TEMPLATES, OfficialResumeTemplate } from "../../data/officialResumeTemplates";
import { downloadOfficialResumeTemplate } from "../../utils/officialResumeTemplates";

interface LearningScreenProps {
  initialCategory?: PrimaryLearnCategory;
}

export default function LearningScreen({ initialCategory = "interviews" }: LearningScreenProps) {
  const router = useRouter();

  // Catalog state - initialized immediately with first-paint cache
  const initialData = getInstantCatalog();
  const [catalogResources, setCatalogResources] = useState<LearningResource[]>(initialData.resources);
  const [catalogCategories, setCatalogCategories] = useState<LearningCategory[]>(
    initialData.categories.length > 0 ? initialData.categories : DEFAULT_LEARNING_CATEGORIES
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<PrimaryLearnCategory>(initialCategory);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const currentUser = useAuthStore((state) => state.currentUser);
  const degreeProgram = currentUser?.degreeProgram || "";
  const targetPosition = currentUser?.targetPosition || "";

  const activeAnalysis = useResumeStore((state) => state.activeAnalysis);
  const activeResume = useResumeStore((state) => state.activeResume);
  const fetchActiveResume = useResumeStore((state) => state.fetchActiveResume);

  // State for search query
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [storedRatings, setStoredRatings] = useState<{uid?: string; ratings: Record<string, string>}>({ ratings: {} });
  const selfRatings = storedRatings.uid === currentUser?.uid ? storedRatings.ratings : {};

  // Sync stored self-assessments for personalization
  useEffect(() => {
    let isMounted = true;
    getStoredSelfAssessments(currentUser?.uid).then((ratings) => {
      if (isMounted && ratings) {
        setStoredRatings({ uid: currentUser?.uid, ratings });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeAnalysis, currentUser?.uid]);

  // Resume analysis sync
  useEffect(() => {
    if (currentUser?.uid && currentUser?.activeResumeId && !activeAnalysis) {
      fetchActiveResume(currentUser.uid, currentUser.activeResumeId);
    }
  }, [currentUser]);

  // First-paint cached load + background refresh
  useEffect(() => {
    let isMounted = true;

    async function initCatalog() {
      // 1. Load local cache
      const cached = await loadCachedCatalog();
      if (isMounted) {
        setCatalogResources(cached.resources);
        setCatalogCategories(
          cached.categories.length > 0 ? cached.categories : DEFAULT_LEARNING_CATEGORIES
        );
      }

      // 2. Background non-blocking refresh from Firestore
      setIsRefreshing(true);
      try {
        const fresh = await refreshCatalog();
        if (isMounted) {
          setCatalogResources(fresh.resources);
          setCatalogCategories(
            fresh.categories.length > 0 ? fresh.categories : DEFAULT_LEARNING_CATEGORIES
          );
        }
      } catch (err) {
        console.log("Background catalog refresh error:", err);
      } finally {
        if (isMounted) {
          setIsRefreshing(false);
        }
      }
    }

    initCatalog();

    // 3. Subscribe to background updates
    const unsubscribe = subscribeToCatalog((updated) => {
      if (isMounted) {
        setCatalogResources(updated.resources);
        setCatalogCategories(
          updated.categories.length > 0 ? updated.categories : DEFAULT_LEARNING_CATEGORIES
        );
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Compute recommendations dynamically based on active category tab
  const rawMatchedRecommendations = useMemo(() => {
    const learningSnap = activeAnalysis?.learningSnapshot;
    const items = matchLearningRecommendations({
      targetPosition: targetPosition || currentUser?.targetPosition || "",
      degreeProgram: degreeProgram || currentUser?.degreeProgram || "",
      collegeDomain: currentUser?.college || "",
      department: currentUser?.department || "",
      skillGaps: learningSnap?.skillGaps,
      skillsToLearn: learningSnap?.skillsToLearn,
      detectedSkills: learningSnap?.careerContext?.detectedSkills,
      missingSkills: learningSnap?.careerContext?.missingSkills,
      learningSnapshot: learningSnap,
      categoryId: selectedCategoryId,
      resourceType: "all",
      customCatalog: catalogResources,
      rawResumeText: activeResume?.rawText,
      structuredResumeData: activeResume?.structuredData,
      selfAssessmentRatings: selfRatings,
    });

    if (selectedCategoryId === "for_you" && items && items.length > 0) {
      logForYouRecommendations(
        currentUser?.uid || "Student",
        targetPosition || "General Track",
        learningSnap?.skillGaps,
        items
      );
    }

    return items;
  }, [
    catalogResources,
    selectedCategoryId,
    targetPosition,
    degreeProgram,
    currentUser?.college,
    currentUser?.department,
    activeAnalysis,
    activeResume,
    selfRatings,
  ]);

  // Apply search filtering on the matched recommendations
  const displayedResources = useMemo(() => {
    if (!searchQuery.trim()) {
      return rawMatchedRecommendations;
    }
    const q = searchQuery.toLowerCase().trim();
    return rawMatchedRecommendations.filter((item) => {
      const inTitle = item.title.toLowerCase().includes(q);
      const inDesc = item.description.toLowerCase().includes(q);
      const inProvider = item.provider.toLowerCase().includes(q);
      const inSkills = (item.skills || []).some((s) => s.toLowerCase().includes(q));
      const inTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
      return inTitle || inDesc || inProvider || inSkills || inTags;
    });
  }, [rawMatchedRecommendations, searchQuery]);

  const [downloadingTemplate, setDownloadingTemplate] = useState<string | null>(null);
  const handleDownloadTemplate = async (template: OfficialResumeTemplate) => {
    if (downloadingTemplate) return;
    if (template.unavailableReason) {
      Alert.alert("Official template unavailable", template.unavailableReason);
      return;
    }
    setDownloadingTemplate(template.id);
    try {
      const result = await downloadOfficialResumeTemplate(template.id);
      if (!result.shared) Alert.alert("Template saved", `Original file saved in app storage: ${template.fileName}`);
    } catch (error) {
      Alert.alert("Download Error", error instanceof Error ? error.message : "The original template could not be saved or shared. Please try again.");
    } finally {
      setDownloadingTemplate(null);
    }
  };

  const learningSnap = activeAnalysis?.learningSnapshot;

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-5" edges={["top", "left", "right"]}>
      {/* SCREEN HEADER */}
      <View className="flex-row items-center justify-between py-3 mb-1">
        <TouchableOpacity
          onPress={() => router.push("/(student)/(tabs)/dashboard" as any)}
          className="h-10 w-10 items-center justify-center rounded-full bg-white border border-[#BFD6EA]"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
        >
          <Ionicons name="arrow-back" size={20} color="#1F3A5F" />
        </TouchableOpacity>
        <Text className="text-2xl font-extrabold text-[#1F3A5F]">Knowledge Hub</Text>
        <View className="w-10 items-center justify-center">
          {isRefreshing && <ActivityIndicator size="small" color="#CA5D25" />}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* HERO BANNER */}
        <View
          className="flex-row items-center justify-between mt-1 mb-4 bg-white p-4 rounded-2xl border border-[#BFD6EA]"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
        >
          <View className="flex-1 pr-3">
            <Text className="text-base font-bold text-[#1F3A5F] mb-0.5">Lessons picked for your job goal</Text>
            <Text className="text-xs font-medium text-[#4F6B82] leading-4">
              Interview practice, resume guides, and career roadmaps.
            </Text>
          </View>
          <View className="h-12 w-12 rounded-full bg-[#EAF2F7] items-center justify-center border border-[#BFD6EA]">
            <Ionicons name="book" size={20} color="#79D5C8" />
          </View>
        </View>

        {/* TOPICS HEADER */}
        <Text className="text-xs font-bold text-[#1F3A5F] mb-3 uppercase tracking-wider">
          Browse topics
        </Text>

        {/* PRIMARY CATEGORY NAVIGATION PILLS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-5"
          contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingVertical: 2 }}
        >
          {catalogCategories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => {
                  setSelectedCategoryId(cat.id as PrimaryLearnCategory);
                  setSearchQuery("");
                }}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                className={`flex-row items-center px-4 py-2.5 rounded-full border ${
                  isSelected
                    ? "bg-[#FEF5F1] border-[#F4A47A]"
                    : "bg-white border-[#BFD6EA]"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isSelected ? 0.08 : 0.03,
                  shadowRadius: 1,
                  elevation: 1,
                }}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={18}
                  color={isSelected ? "#CA5D25" : "#4F6B82"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className={`text-sm font-bold ${
                    isSelected ? "text-[#CA5D25]" : "text-[#4F6B82]"
                  }`}
                  style={{ maxWidth: 140, flexShrink: 1 }}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* SEARCH BAR */}
        <View
          className="flex-row items-center rounded-xl bg-white border border-[#BFD6EA] px-3.5 h-12 mb-4"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }}
        >
          <Ionicons name="search-outline" size={18} color="#8B95A5" style={{ marginRight: 8 }} />
          <TextInput
            className="flex-1 text-sm text-[#1F3A5F] h-full"
            style={{ paddingTop: 0, paddingBottom: 0, paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
            placeholder="Search resources, topics, skills..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} className="p-1.5">
              <Ionicons name="close-circle" size={18} color="#8B95A5" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* PERSONALIZED COACH ROADMAP OVERVIEW (RENDERED ON "FOR YOU" TAB WHEN NOT SEARCHING) */}
        {selectedCategoryId === "for_you" && !searchQuery && (
          <View className="bg-white border border-[#BFD6EA] rounded-2xl p-4 mb-4 shadow-sm">
            <View className="flex-row flex-wrap items-start gap-2 mb-3">
              <View className="bg-[#FEF5F1] px-2.5 py-0.5 rounded-full border border-[#F4A47A]">
                <Text className="text-[9px] font-black uppercase tracking-widest text-[#CA5D25]">
                  Personalized Roadmap
                </Text>
              </View>
              <Text className="text-xs font-bold text-[#4F6B82] flex-grow flex-shrink" style={{ minWidth: 140 }}>
                Goal: {learningSnap?.targetPosition || targetPosition || "Pick a job goal in Profile"}
              </Text>
            </View>

            {learningSnap && (
              <Text className="text-xs font-medium leading-5 text-[#4F6B82] mb-3">
                Analysis guidance (unverified). Check these suggestions against your original resume before treating them as facts.
              </Text>
            )}

            {learningSnap?.careerSummary ? (
              <Text className="text-xs font-medium leading-5 text-[#1F3A5F] mb-3">
                {learningSnap.careerSummary}
              </Text>
            ) : (
              <Text className="text-xs font-medium leading-5 text-[#4F6B82] mb-3">
                Resources support your selected goal and competencies not clearly demonstrated in the extracted resume.
              </Text>
            )}

            {learningSnap?.skillGaps && learningSnap.skillGaps.length > 0 && (
              <View className="pt-2.5 border-t border-[#EAF2F7]">
                <Text className="text-[9px] font-bold text-[#CA5D25] uppercase tracking-wider mb-1.5">
                  Resume evidence to review
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {learningSnap.skillGaps.map((gap, gIdx) => (
                    <Tag key={gIdx} label={formatSkillDisplayName(gap.skill)} variant="warning" />
                  ))}
                </View>
              </View>
            )}

            {learningSnap?.strengths && learningSnap.strengths.length > 0 && (
              <View className="mt-2 pt-2 border-t border-[#EAF2F7]">
  <Text className="text-[9px] font-bold text-[#4F6B82] uppercase tracking-wider mb-1.5">
    Inferred strengths (unverified)
  </Text>

  <View className="flex-row flex-wrap gap-1.5">
    {learningSnap.strengths.map((str, sIdx) => (
      <Tag key={sIdx} label={formatSkillDisplayName(str)} variant="neutral" />
    ))}
  </View>
</View>
            )}
          </View>
        )}

        {/* ATS TEMPLATES SECTION (RENDERED ON "RESUME" TAB WHEN NOT SEARCHING) */}
        {selectedCategoryId === "resume" && !searchQuery && (
          <View className="bg-white border border-[#BFD6EA] rounded-2xl p-4 mb-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-sm font-bold text-[#1F3A5F]">Resume templates</Text>
              <View className="bg-[#EAF2F7] px-2 py-0.5 rounded-full border border-[#BFD6EA]">
                <Text className="text-[9px] font-bold text-[#1F3A5F]">Original files</Text>
              </View>
            </View>
            <Text className="text-xs font-medium text-[#4F6B82] leading-4 mb-3">
              Original university resources. Downloads preserve the publisher’s file; no candidate details are generated.
            </Text>
            <View className="gap-2">
              {OFFICIAL_RESUME_TEMPLATES.map((tpl) => (
                <TouchableOpacity
                  key={tpl.id}
                  onPress={() => handleDownloadTemplate(tpl)}
                  disabled={!!downloadingTemplate}
                  accessibilityRole="button"
                  accessibilityLabel={tpl.unavailableReason ? `${tpl.name}: official file unavailable` : `Download ${tpl.name}`}
                  activeOpacity={0.8}
                  className="flex-row items-center justify-between bg-[#F4F8FB] border border-[#EAF2F7] p-3 rounded-xl"
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-xs font-bold text-[#1F3A5F]">{tpl.name}</Text>
                    <Text className="text-[11px] font-medium text-[#4F6B82] mt-0.5">{tpl.description}</Text>
                    <Text className="text-[10px] text-[#4F6B82] mt-1">{tpl.publisher}</Text>
                    <Text className="text-[9px] font-bold text-[#79D5C8] mt-1 uppercase tracking-wider">
                      {tpl.unavailableReason ? 'Official file unavailable' : 'Original PDF • Available offline'}
                    </Text>
                  </View>
                  <View className="h-9 w-9 bg-white rounded-full items-center justify-center shadow-sm border border-[#BFD6EA]">
                    <Ionicons name={tpl.unavailableReason ? "information-circle-outline" : "download-outline"} size={16} color="#CA5D25" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="text-[10px] text-[#4F6B82] mt-3">Original documents remain credited to their publishers. AIRIS is not affiliated with Harvard or Oxford.</Text>
            {OFFICIAL_RESUME_TEMPLATES.map(template => <TouchableOpacity key={`source-${template.id}`} accessibilityRole="link" onPress={() => { void Linking.openURL(template.sourcePage).catch(() => Alert.alert("Source unavailable", "The publisher’s website could not be opened.")); }} className="mt-2 py-1"><Text className="text-xs text-[#1F3A5F] underline">{template.name}: publisher source</Text></TouchableOpacity>)}
          </View>
        )}

        {/* SECTION HEADER */}
        <View className="flex-row items-center justify-between mb-3 px-0.5">
          <Text className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wider">
            {selectedCategoryId === "for_you"
              ? "Picked for you"
              : selectedCategoryId === "interviews"
              ? "Interview practice"
              : selectedCategoryId === "resume"
              ? "Resume writing"
              : "Professional Communication"}
          </Text>
          <Text className="text-[11px] font-bold text-[#4F6B82]">
            {displayedResources.length} {displayedResources.length === 1 ? "resource" : "resources"}
          </Text>
        </View>

        {/* RESOURCE CARDS FEED */}
        <View className="gap-1">
          {displayedResources.length > 0 ? (
            displayedResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))
          ) : isRefreshing ? (
            <View className="gap-2">
              <SkeletonResourceCard />
              <SkeletonResourceCard />
              <SkeletonResourceCard />
            </View>
          ) : (
            <View className="py-12 items-center justify-center bg-white rounded-2xl border border-[#BFD6EA] px-6">
              <View className="h-14 w-14 bg-[#EAF2F7] rounded-full items-center justify-center mb-2">
                <Ionicons name="search-outline" size={26} color="#BFD6EA" />
              </View>
              <Text className="text-sm text-[#1F3A5F] font-bold text-center">
                Nothing matches that search
              </Text>
              <Text className="text-xs text-[#4F6B82] font-medium text-center mt-1 leading-4">
                Try a different word or pick another topic above.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
