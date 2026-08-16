import { Ionicons } from "@expo/vector-icons";
import { documentDirectory, EncodingType, writeAsStringAsync } from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAiRecommendationsForResume } from "../../data/learningRecommendations";
import {
  fetchLearningMaterials,
  LearningMaterial,
  searchLearningMaterials,
} from "../../services/firebase/learningService";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import { generatePdfFromMarkdown } from "../../utils/pdfGenerator";

interface ResumeTemplate {
  id: string;
  name: string;
  badge: string;
  atsRate: string;
  description: string;
  rationale: string;
  content: string;
}

const TEMPLATES: ResumeTemplate[] = [
  {
    id: "harvard",
    name: "Harvard Professional",
    badge: "Recruiter Baseline",
    atsRate: "99% ATS Compliant",
    description: "The gold standard for general business, finance, and corporate applications.",
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
- Task & Tool: Built responsive frontend elements using React Native and Tailwind CSS.
- Metric Result: Decreased screen load latency by 15% and improved user test score by 10%.
- Task & Tool: Developed and tested back-end REST API pathways using Node.js and Express.
- Metric Result: Integrated Firebase auth token checks, securing sessions for 500+ active users.

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
    id: "google",
    name: "Google Software Developer",
    badge: "Tech Cohort",
    atsRate: "98% ATS Compliant",
    description: "Highly optimized for software engineering, data science, and IT roles.",
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
- Task & Tool: Engineered serverless backend functions in Node.js and deployed to AWS Lambda.
- Metric Result: Reduced database read latency by 20% and resolved 15+ backend API bottleneck bugs.
- Task & Tool: Maintained secure MongoDB schema designs and wrote clean integration test suites.
- Metric Result: Achieved 92% unit test code path coverage across core authentication endpoints.

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

type CategoryType =
  | "Interview Preparation"
  | "Resume Writing"
  | "Professional Communication"
  | "Curated Learning Materials";

export default function LearningScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ search?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("Interview Preparation");
  const [searchQuery, setSearchQuery] = useState("");
  const [resources, setResources] = useState<LearningMaterial[]>([]);
  const [loading, setLoading] = useState(false);

  const currentUser = useAuthStore((state) => state.currentUser);
  const degreeProgram = currentUser?.degreeProgram || "";

  const activeAnalysis = useResumeStore((state) => state.activeAnalysis);
  const fetchActiveResume = useResumeStore((state) => state.fetchActiveResume);

  useEffect(() => {
    if (currentUser?.uid && currentUser?.activeResumeId && !activeAnalysis) {
      fetchActiveResume(currentUser.uid, currentUser.activeResumeId);
    }
  }, [currentUser]);

  const loadResources = async (queryText = "", category = selectedCategory) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      if (category === "Curated Learning Materials") {
        const allRecs =
          activeAnalysis?.recommendations ||
          getAiRecommendationsForResume(
            activeAnalysis,
            degreeProgram,
            currentUser?.targetPosition || "",
          );

        if (queryText.trim()) {
          const normQuery = queryText.toLowerCase().trim();
          const filtered = allRecs.filter(
            (r) =>
              r.title.toLowerCase().includes(normQuery) ||
              r.description.toLowerCase().includes(normQuery) ||
              r.provider.toLowerCase().includes(normQuery),
          );
          setResources(filtered as any);
        } else {
          setResources(allRecs as any);
        }
      } else {
        let data: LearningMaterial[] = [];
        if (queryText.trim()) {
          data = await searchLearningMaterials(queryText, category as any, degreeProgram);
        } else {
          data = await fetchLearningMaterials(category as any, degreeProgram);
        }
        setResources(data);
      }
    } catch {
      Alert.alert("Load Error", "Failed to retrieve learning materials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    if (params.search) {
      setSearchQuery(params.search);
      loadResources(params.search, selectedCategory);
    } else {
      loadResources("", selectedCategory);
    }
  }, [selectedCategory, degreeProgram, activeAnalysis, params.search, currentUser]);

  const handleSearchSubmit = () => {
    loadResources(searchQuery, selectedCategory);
  };

  const handleResourcePress = async (item: any) => {
    try {
      await WebBrowser.openBrowserAsync(item.url);
    } catch {
      Alert.alert("Error", "An error occurred while trying to launch this resource.");
    }
  };

  const handleDownloadTemplate = async (template: ResumeTemplate) => {
    try {
      const pdfContent = generatePdfFromMarkdown(template.name, template.content);
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

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between py-4">
        <TouchableOpacity
          onPress={() => router.push("/(student)/(tabs)/dashboard" as any)}
          className="h-10 w-10 items-center justify-center rounded-full bg-white border border-[#BFD6EA]"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
        >
          <Ionicons name="arrow-back" size={20} color="#1F3A5F" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-[#1F3A5F]">Learning</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="flex-row items-center justify-between mt-2 mb-8 bg-white p-5 rounded-2xl border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <View className="flex-1 pr-4">
            <Text className="text-lg font-bold text-[#1F3A5F] mb-1">Knowledge Hub</Text>
            <Text className="text-sm font-medium text-[#4F6B82] leading-5">
              Curated resources and templates for your employment preparation.
            </Text>
          </View>
          <View className="h-14 w-14 rounded-full bg-[#EAF2F7] items-center justify-center border-2 border-white shadow-sm">
            <Ionicons name="book" size={24} color="#79D5C8" />
          </View>
        </View>

        <Text className="text-sm font-bold text-[#1F3A5F] mb-3 uppercase tracking-wider">Browse Topics</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row mb-6"
          contentContainerStyle={{ gap: 10 }}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategory("Interview Preparation")}
            className={`flex-row items-center px-5 py-3 rounded-full border ${
              selectedCategory === "Interview Preparation"
                ? "bg-[#FEF5F1] border-[#F4A47A]"
                : "bg-white border-[#BFD6EA]"
            }`}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={18}
              color={selectedCategory === "Interview Preparation" ? "#CA5D25" : "#4F6B82"}
              style={{ marginRight: 8 }}
            />
            <Text
              className={`text-sm font-bold ${
                selectedCategory === "Interview Preparation" ? "text-[#CA5D25]" : "text-[#4F6B82]"
              }`}
            >
              Interviews
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedCategory("Resume Writing")}
            className={`flex-row items-center px-5 py-3 rounded-full border ${
              selectedCategory === "Resume Writing"
                ? "bg-[#FEF5F1] border-[#F4A47A]"
                : "bg-white border-[#BFD6EA]"
            }`}
          >
            <Ionicons
              name="document-text-outline"
              size={18}
              color={selectedCategory === "Resume Writing" ? "#CA5D25" : "#4F6B82"}
              style={{ marginRight: 8 }}
            />
            <Text
              className={`text-sm font-bold ${
                selectedCategory === "Resume Writing" ? "text-[#CA5D25]" : "text-[#4F6B82]"
              }`}
            >
              Resume Writing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedCategory("Professional Communication")}
            className={`flex-row items-center px-5 py-3 rounded-full border ${
              selectedCategory === "Professional Communication"
                ? "bg-[#FEF5F1] border-[#F4A47A]"
                : "bg-white border-[#BFD6EA]"
            }`}
          >
            <Ionicons
              name="people-outline"
              size={18}
              color={selectedCategory === "Professional Communication" ? "#CA5D25" : "#4F6B82"}
              style={{ marginRight: 8 }}
            />
            <Text
              className={`text-sm font-bold ${
                selectedCategory === "Professional Communication"
                  ? "text-[#CA5D25]"
                  : "text-[#4F6B82]"
              }`}
            >
              Communication
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedCategory("Curated Learning Materials")}
            className={`flex-row items-center px-5 py-3 rounded-full border ${
              selectedCategory === "Curated Learning Materials"
                ? "bg-[#FEF5F1] border-[#F4A47A]"
                : "bg-white border-[#BFD6EA]"
            }`}
          >
            <Ionicons
              name="sparkles-outline"
              size={18}
              color={selectedCategory === "Curated Learning Materials" ? "#CA5D25" : "#4F6B82"}
              style={{ marginRight: 8 }}
            />
            <Text
              className={`text-sm font-bold ${
                selectedCategory === "Curated Learning Materials"
                  ? "text-[#CA5D25]"
                  : "text-[#4F6B82]"
              }`}
            >
              AI Curated
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View className="flex-row items-center rounded-xl bg-white border border-[#BFD6EA] px-4 py-1 h-14 mb-8" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <Ionicons name="search-outline" size={20} color="#8B95A5" style={{ marginRight: 10 }} />
          <TextInput
            className="flex-1 text-base text-[#1F3A5F] h-full"
            placeholder="Search resources, templates..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                loadResources("", selectedCategory);
              }}
              className="p-2 -mr-2"
            >
              <Ionicons name="close-circle" size={20} color="#8B95A5" />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color="#F4A47A" />
            <Text className="mt-4 text-sm text-[#4F6B82] font-bold">
              Loading materials...
            </Text>
          </View>
        ) : (
          <View className="gap-5">
            {selectedCategory === "Resume Writing" && searchQuery === "" && (
              <View className="bg-white border border-[#BFD6EA] rounded-2xl p-5 mb-2" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                <Text className="text-base font-extrabold text-[#1F3A5F] mb-1">
                  ATS Template Library
                </Text>
                <Text className="text-sm font-medium text-[#4F6B82] leading-5 mb-5">
                  Recruiter-approved templates for TIP students. Exported as standard PDF.
                </Text>
                <View className="gap-3">
                  {TEMPLATES.map((tpl) => (
                    <TouchableOpacity
                      key={tpl.id}
                      onPress={() => handleDownloadTemplate(tpl)}
                      className="flex-row items-center justify-between bg-[#F4F8FB] border border-[#EAF2F7] p-4 rounded-xl"
                    >
                      <View className="flex-1 mr-4">
                        <Text className="text-sm font-bold text-[#1F3A5F]">{tpl.name}</Text>
                        <Text className="text-xs font-bold text-[#79D5C8] mt-1 uppercase tracking-wider">
                          {tpl.atsRate}
                        </Text>
                      </View>
                      <View className="h-10 w-10 bg-white rounded-full items-center justify-center shadow-sm">
                        <Ionicons name="download-outline" size={20} color="#F4A47A" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {resources.length > 0 ? (
              resources.map((item: any) => {
                const isRecommendation = !!item.provider;
                return (
                  <TouchableOpacity
                    key={item.id || item.title}
                    onPress={() => handleResourcePress(item)}
                    activeOpacity={0.85}
                    className="rounded-2xl bg-white border border-[#BFD6EA] overflow-hidden"
                    style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
                  >
                    {item.thumbnailUrl ? (
                      <Image
                        source={{ uri: item.thumbnailUrl }}
                        className="w-full h-44"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full h-32 bg-[#F4F8FB] items-center justify-center border-b border-[#EAF2F7]">
                        <Ionicons
                          name={
                            item.type === "video"
                              ? "logo-youtube"
                              : item.type === "pdf"
                                ? "document-text"
                                : item.type === "certification"
                                  ? "ribbon"
                                  : "school"
                          }
                          size={40}
                          color="#BFD6EA"
                        />
                      </View>
                    )}

                    <View className="p-5">
                      <View className="flex-row flex-wrap items-center gap-2 mb-3">
                        <View
                          className={`px-3 py-1 rounded-full ${
                            item.type === "video"
                              ? "bg-red-50 border border-red-100"
                              : item.type === "pdf"
                                ? "bg-blue-50 border border-blue-100"
                                : item.type === "certification"
                                  ? "bg-amber-50 border border-amber-100"
                                  : "bg-[#EAF2F7] border border-[#BFD6EA]"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              item.type === "video"
                                ? "text-red-600"
                                : item.type === "pdf"
                                  ? "text-blue-600"
                                  : item.type === "certification"
                                    ? "text-amber-600"
                                    : "text-[#1F3A5F]"
                            }`}
                          >
                            {item.type === "video"
                              ? "YouTube Video"
                              : item.type === "pdf"
                                ? "PDF Document"
                                : item.type === "certification"
                                  ? "Certification"
                                  : "Study Course"}
                          </Text>
                        </View>

                        {isRecommendation && item.isAiSuggestedGap && (
                          <View className="px-3 py-1 rounded-full bg-[#FEF5F1] border border-[#F4A47A]">
                            <Text className="text-[10px] font-bold uppercase tracking-wider text-[#CA5D25]">
                              Skill Gap Target
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text className="text-base font-extrabold text-[#1F3A5F]">{item.title}</Text>

                      {isRecommendation && (
                        <Text className="text-xs font-bold text-[#79D5C8] uppercase tracking-wider mt-1.5">
                          {item.provider}
                        </Text>
                      )}

                      <Text className="text-sm font-medium leading-5 text-[#4F6B82] mt-2">
                        {item.description}
                      </Text>

                      {isRecommendation && item.gapRationale && (
                        <View className="mt-4 p-4 bg-[#FEF5F1] rounded-xl border border-[#FDEEE6]">
                          <View className="flex-row items-center gap-2 mb-1.5">
                            <Ionicons name="sparkles" size={16} color="#F4A47A" />
                            <Text className="text-xs font-bold text-[#CA5D25] uppercase tracking-wider">
                              AI Recommendation
                            </Text>
                          </View>
                          <Text className="text-xs font-medium leading-5 text-[#4F6B82]">
                            {item.gapRationale}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View className="py-16 items-center justify-center">
                <View className="h-16 w-16 bg-[#EAF2F7] rounded-full items-center justify-center mb-4">
                  <Ionicons name="search" size={32} color="#BFD6EA" />
                </View>
                <Text className="text-base text-[#1F3A5F] font-bold text-center">
                  No resources found for "{searchQuery}".
                </Text>
                <Text className="text-sm text-[#4F6B82] font-medium text-center mt-2">
                  Try adjusting your search terms.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
