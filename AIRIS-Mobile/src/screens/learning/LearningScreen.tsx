import { Ionicons } from "@expo/vector-icons";
import { documentDirectory, EncodingType, writeAsStringAsync } from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../../components/ui/AppText";
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
import { generatePdfFromMarkdown } from "../../utils/pdfGenerator";
import { downloadAirisResumeTemplate } from "../../utils/airisResumeTemplate";

interface ResumeTemplate {
  id: string;
  name: string;
  badge: string;
  standard: string;
  description: string;
  rationale: string;
  content: string;
}

const ATS_TEMPLATES: ResumeTemplate[] = [
  {
    id: "airis_standard",
    name: "AIRIS Standard Resume",
    badge: "Recommended",
    standard: "Single-column ATS-readable format",
    description: "A clean, text-based guide with conventional sections for graduating students across programs.",
    rationale: "Keeps contact, education, skills, and experience readable without relying on images or tables.",
    content: "",
  },
  {
    id: "harvard",
    name: "Harvard Standard",
    badge: "Corporate & Business",
    standard: "Standard ATS Formatting",
    description: "The gold standard for general business, finance, management, and corporate applications.",
    rationale:
      "Clean, single-column, reverse-chronological template utilizing standard font hierarchy, prominent headers, and metric-based bullets.",
    content: `# JUAN DELA CRUZ
+63 917 123 4567 | juan.dela.cruz@gmail.com | Manila, Philippines | linkedin.com/in/juandelacruz

## EDUCATION
Technological Institute of the Philippines – Manila, Philippines
Bachelor of Science in Computer Science | Graduation: June 2026
- Achievements: Dean's List (2022-2026), 1st Place College Programming Competition
- Relevant Coursework: Data Structures, Algorithms, Systems Analysis, Web Development
- Description: Focus on software engineering methodologies, database design, and cloud architecture.

## EXPERIENCE
Global Tech Solutions – Makati, Metro Manila
Software Developer Intern | January 2025 – May 2025
- Built responsive frontend elements using React Native and Tailwind CSS.
- Decreased screen load latency by 15% and improved user test score by 10%.
- Developed and tested back-end REST API pathways using Node.js and Express.
- Integrated Firebase auth token checks, securing sessions for 500+ active users.

## PROJECTS
AIRIS Mobile Application – Lead Developer | Capstone Project | July 2025 – Present
- Built cross-platform mobile client in Expo and React Native utilizing Zustand and Tailwind CSS.
- Designed deterministic resume parsing parser matching sections against local scoring indexes.

## SKILLS & CERTIFICATIONS
- Technical Skills: JavaScript, TypeScript, Python, HTML/CSS, Git, MySQL, Firebase
- Soft Skills: Agile Project Management, Team Collaboration, Technical Writing
- Certifications: AWS Certified Cloud Practitioner (2025)
`,
  },
  {
    id: "tech_cohort",
    name: "Tech Cohort Standard",
    badge: "Engineering & IT",
    standard: "Technical ATS Formatting",
    description: "Optimized for software engineering, data science, cybersecurity, and cloud IT roles.",
    rationale:
      "Emphasizes technical stack context immediately below contact details, grouping projects, code contributions, and languages.",
    content: `# JUAN DELA CRUZ
juan.dela.cruz@gmail.com | +63 917 123 4567 | github.com/juandelacruz | linkedin.com/in/juandelacruz

## TECHNICAL SKILLS
- Languages: JavaScript, TypeScript, Python, SQL, C++
- Frameworks & Tools: React Native, Node.js, Git, Docker, Firebase, Tailwind CSS
- Databases & Cloud: PostgreSQL, MySQL, AWS (S3, EC2), Google Cloud Platform

## TECHNICAL EXPERIENCE
Innovate Technologies – Quezon City, Metro Manila
Backend Software Intern | January 2025 – May 2025
- Engineered serverless backend functions in Node.js and deployed to AWS Lambda.
- Reduced database read latency by 20% and resolved 15+ backend API bottleneck bugs.
- Maintained secure MongoDB schema designs and wrote clean integration test suites.
- Achieved 92% unit test code path coverage across core authentication endpoints.

## ENGINEERING PROJECTS
AIRIS Automated Resume Parser | Capstone Project | July 2025 – Present
- Developed native text normalization algorithms, parsing unstructured OCR layouts into JSON.
- Linked Zustand stores with Firestore listeners, caching user resume records for offline loading.

## EDUCATION
Technological Institute of the Philippines – Manila, Philippines
Bachelor of Science in Information Technology | Graduation: June 2026
`,
  },
];

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
  const [selfRatings, setSelfRatings] = useState<Record<string, string>>({});

  // Sync stored self-assessments for personalization
  useEffect(() => {
    let isMounted = true;
    getStoredSelfAssessments().then((ratings) => {
      if (isMounted && ratings) {
        setSelfRatings(ratings);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeAnalysis]);

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

  const handleDownloadTemplate = async (template: ResumeTemplate) => {
    try {
      if (template.id === "airis_standard") {
        await downloadAirisResumeTemplate();
        return;
      }
      const name = currentUser?.fullName || "YOUR NAME";
      const program = currentUser?.degreeProgram || "Degree Program";
      const target = currentUser?.targetPosition || targetPosition || "Target Position";

      const cleanTemplateContent = `# ${name.toUpperCase()}
Phone: +63 9XX XXX XXXX | Email: student@tip.edu.ph | Location: Manila, Philippines

## PROFESSIONAL SUMMARY
Motivated ${program} graduate preparing for entry-level opportunities as a ${target}. Demonstrates foundational domain knowledge, analytical problem solving, and professional teamwork.

## EDUCATION
Technological Institute of the Philippines – Manila, Philippines
${program} | Expected Graduation: 2026
- Relevant Coursework: Core Academic & Professional Discipline Modules

## CORE COMPETENCIES & SKILLS
- Technical & Domain Skills: [List relevant discipline skills]
- Tools & Software: [List software, tools, or frameworks]
- Soft Skills: Problem Solving, Team Collaboration, Communication

## PROJECTS & RELEVANT EXPERIENCE
[Project Title or Internship Role] | Technological Institute of the Philippines
- Applied core principles to solve practical challenges and achieve project goals.
- Documented methodology, collaborated with project team members, and delivered final presentation.

## CERTIFICATIONS & ACHIEVEMENTS
- [List professional certifications, academic honors, or campus leadership roles]
`;

      const pdfContent = generatePdfFromMarkdown(template.name, cleanTemplateContent);
      const fileName = `${template.id}_ats_template.pdf`;
      const localUri = `${documentDirectory || ""}${fileName}`;

      await writeAsStringAsync(localUri, pdfContent, {
        encoding: EncodingType.UTF8,
      });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(localUri, {
          mimeType: "application/pdf",
          dialogTitle: `Download ${template.name}`,
        });
      } else {
        Alert.alert("Downloaded", `Template saved locally to device storage: ${fileName}`);
      }
    } catch {
      Alert.alert("Download Error", "Failed to save or share template file.");
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
        <Text className="text-xl font-extrabold text-[#1F3A5F]">Knowledge Hub</Text>
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
            <Text className="text-base font-bold text-[#1F3A5F] mb-0.5">Career Knowledge Center</Text>
            <Text className="text-xs font-medium text-[#4F6B82] leading-4">
              Curated learning materials, interview prep, resume guides, and career roadmaps.
            </Text>
          </View>
          <View className="h-12 w-12 rounded-full bg-[#EAF2F7] items-center justify-center border border-[#BFD6EA]">
            <Ionicons name="book" size={20} color="#79D5C8" />
          </View>
        </View>

        {/* BROWSE TOPICS HEADER */}
        <Text className="text-xs font-bold text-[#1F3A5F] mb-3 uppercase tracking-wider">
          BROWSE TOPICS
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
                Target: {learningSnap?.targetPosition || targetPosition || "General Track"}
              </Text>
            </View>

            {learningSnap?.careerSummary ? (
              <Text className="text-xs font-medium leading-5 text-[#1F3A5F] mb-3">
                {learningSnap.careerSummary}
              </Text>
            ) : (
              <Text className="text-xs font-medium leading-5 text-[#4F6B82] mb-3">
                Resources curated specifically for your {targetPosition || "career"} track and detected skill growth areas.
              </Text>
            )}

            {learningSnap?.skillGaps && learningSnap.skillGaps.length > 0 && (
              <View className="pt-2.5 border-t border-[#EAF2F7]">
                <Text className="text-[9px] font-bold text-[#CA5D25] uppercase tracking-wider mb-1.5">
                  Priority Skill Gaps
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {learningSnap.skillGaps.map((gap, gIdx) => (
                    <View key={gIdx} className="bg-[#FEF5F1] border border-[#F4A47A] px-2.5 py-0.5 rounded-full flex-row items-center max-w-full">
                      <Ionicons name="alert-circle" size={11} color="#CA5D25" style={{ marginRight: 3 }} />
                      <Text className="text-[10px] font-bold text-[#CA5D25] flex-shrink">{gap.skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {learningSnap?.strengths && learningSnap.strengths.length > 0 && (
              <View className="mt-2 pt-2 border-t border-[#EAF2F7]">
  <Text className="text-[9px] font-bold text-[#4F6B82] uppercase tracking-wider mb-1.5">
    Resume Strengths
  </Text>

  <View className="flex-row flex-wrap gap-1.5">
    {learningSnap.strengths.map((str, sIdx) => (
      <View
        key={sIdx}
        className="bg-[#D7F1ED]/40 border border-[#79D5C8]/50 px-2.5 py-1.5 rounded-full flex-row items-start max-w-full"
      >
        <Ionicons
          name="checkmark-circle"
          size={11}
          color="#1E5D53"
          style={{ marginRight: 4, marginTop: 1 }}
        />

        <Text
          className="text-[10px] font-bold text-[#1E5D53] flex-shrink"
          style={{ maxWidth: 300 }}
        >
          {str}
        </Text>
      </View>
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
              <Text className="text-sm font-bold text-[#1F3A5F]">Standard ATS Templates</Text>
              <View className="bg-[#EAF2F7] px-2 py-0.5 rounded-full border border-[#BFD6EA]">
                <Text className="text-[9px] font-bold text-[#1F3A5F]">PDF Export</Text>
              </View>
            </View>
            <Text className="text-xs font-medium text-[#4F6B82] leading-4 mb-3">
              Clean, single-column resume templates designed to comply with ATS parsers.
            </Text>
            <View className="gap-2">
              {ATS_TEMPLATES.map((tpl) => (
                <TouchableOpacity
                  key={tpl.id}
                  onPress={() => handleDownloadTemplate(tpl)}
                  activeOpacity={0.8}
                  className="flex-row items-center justify-between bg-[#F4F8FB] border border-[#EAF2F7] p-3 rounded-xl"
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-xs font-bold text-[#1F3A5F]">{tpl.name}</Text>
                    <Text className="text-[11px] font-medium text-[#4F6B82] mt-0.5">{tpl.description}</Text>
                    <Text className="text-[9px] font-bold text-[#79D5C8] mt-1 uppercase tracking-wider">
                      {tpl.standard}
                    </Text>
                  </View>
                  <View className="h-9 w-9 bg-white rounded-full items-center justify-center shadow-sm border border-[#BFD6EA]">
                    <Ionicons name="download-outline" size={16} color="#CA5D25" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* SECTION HEADER */}
        <View className="flex-row items-center justify-between mb-3 px-0.5">
          <Text className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wider">
            {selectedCategoryId === "for_you"
              ? "Recommended for Your Career Growth"
              : selectedCategoryId === "interviews"
              ? "Interview Preparation & Strategy"
              : selectedCategoryId === "resume"
              ? "Resume Development & Writing"
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
                No matching resources found
              </Text>
              <Text className="text-xs text-[#4F6B82] font-medium text-center mt-1 leading-4">
                Try searching for a different keyword or switch categories.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
