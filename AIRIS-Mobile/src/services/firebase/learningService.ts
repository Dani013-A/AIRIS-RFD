import { collection, getDocs, addDoc, query, where, writeBatch } from "firebase/firestore";
import { db } from "../../config/firebase";
import {
  LearningMaterial,
  getDepartmentFromProgram,
  DYNAMIC_LEARNING_LIBRARY,
} from "../../data/dynamicLearningMaterials";
import { searchYouTubeVideos, YouTubeVideoResult } from "../youtube/youtubeService";

export { LearningMaterial };

const MATERIALS_COLLECTION = "learning_materials";

/** Convert a YouTube API result into a LearningMaterial shape. */
function youtubeResultToMaterial(
  result: YouTubeVideoResult,
  category: LearningMaterial["category"],
  department: LearningMaterial["department"]
): LearningMaterial {
  return {
    id: result.videoId,
    title: result.title,
    description: result.description || `${result.channelTitle} — YouTube`,
    type: "video",
    url: result.url,
    category,
    thumbnailUrl: result.thumbnailUrl,
    department,
  };
}

/**
 * Build the YouTube search query for a given category and degree program.
 */
function buildYouTubeQuery(category: string, degreeProgram: string): string {
  const dept = degreeProgram ? getDepartmentFromProgram(degreeProgram) : "GEN";

  const deptContext: Record<string, string> = {
    CCS: "software engineering computer science IT",
    ENG: "civil mechanical electrical engineering",
    ARCH: "architecture design revit portfolio",
    CBA: "accounting business finance management",
    EDU: "teaching education classroom pedagogy",
    ARTS: "communications writing liberal arts political science",
    GEN: "career professional development",
  };

  const categoryContext: Record<string, string> = {
    "Interview Preparation": "job interview tips questions answers",
    "Resume Writing": "resume CV writing tips",
    "Professional Communication": "workplace professional communication skills",
    "Curated Learning Materials": "online course tutorial beginner guide",
  };

  const deptStr = deptContext[dept] ?? deptContext["GEN"];
  const catStr = categoryContext[category] ?? "career development";
  return `${deptStr} ${catStr}`;
}

/**
 * Seed database with standard departmental learning materials.
 * Self-healing: Clears and re-seeds if it contains outdated categories or placeholder URLs.
 */
export const seedLearningMaterialsIfEmpty = async (): Promise<void> => {
  const materialsCol = collection(db, MATERIALS_COLLECTION);
  const snapshot = await getDocs(materialsCol);

  let needsReseed = false;
  if (snapshot.empty) {
    needsReseed = true;
  } else {
    const validUrls = new Set(DYNAMIC_LEARNING_LIBRARY.map((item) => item.url));
    if (snapshot.size !== DYNAMIC_LEARNING_LIBRARY.length) {
      needsReseed = true;
    } else {
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        if (
          data.category === "Curated Learning Modules" ||
          !validUrls.has(data.url)
        ) {
          needsReseed = true;
        }
      });
    }
  }

  if (needsReseed) {
    const batch = writeBatch(db);
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    for (const item of DYNAMIC_LEARNING_LIBRARY) {
      await addDoc(materialsCol, item);
    }
  }
};

/**
 * Fetch learning materials:
 *  1. Query YouTube API for top 4 videos matching category + department context.
 *  2. Append static non-video resources (PDFs, modules) from Firestore.
 *  3. Fall back entirely to static library if YouTube API is unavailable.
 */
export const fetchLearningMaterials = async (
  category?: string,
  degreeProgram?: string
): Promise<LearningMaterial[]> => {
  const dept = degreeProgram ? getDepartmentFromProgram(degreeProgram) : "GEN";

  // Check YouTube first to display the most relevant video tutorials.
  let youtubeItems: LearningMaterial[] = [];
  if (category) {
    try {
      const ytQuery = buildYouTubeQuery(category, degreeProgram ?? "");
      const ytResults = await searchYouTubeVideos(ytQuery, 4);
      youtubeItems = ytResults.map((r) =>
        youtubeResultToMaterial(
          r,
          category as LearningMaterial["category"],
          dept as LearningMaterial["department"]
        )
      );
    } catch {
      // If YouTube is offline or fails, skip directly to static database resources.
    }
  }

  // Retrieve reading documents (like PDFs and worksheets) from our database.
  await seedLearningMaterialsIfEmpty();
  const materialsCol = collection(db, MATERIALS_COLLECTION);
  const q = category
    ? (query(materialsCol, where("category", "==", category)) as any)
    : materialsCol;

  const snapshot = await getDocs(q);
  const staticItems: LearningMaterial[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data() as any;
    if (data.type === "video") return; // Ignore static video placeholders here, since live videos are fetched from YouTube.
    const itemDept: string = data.department || "GEN";
    if (dept === "GEN" || itemDept === "GEN" || itemDept === dept) {
      staticItems.push({ id: doc.id, ...data } as LearningMaterial);
    }
  });

  // If YouTube fails to return any videos, load our offline backup video list.
  if (youtubeItems.length === 0) {
    const fallbackVideos: LearningMaterial[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as any;
      if (data.type !== "video") return;
      const itemDept: string = data.department || "GEN";
      if (dept === "GEN" || itemDept === "GEN" || itemDept === dept) {
        fallbackVideos.push({ id: doc.id, ...data } as LearningMaterial);
      }
    });
    return [...fallbackVideos, ...staticItems];
  }

  return [...youtubeItems, ...staticItems];
};

/**
 * Search learning materials by keyword across YouTube API + static library.
 */
export const searchLearningMaterials = async (
  keyword: string,
  category?: string,
  degreeProgram?: string
): Promise<LearningMaterial[]> => {
  const dept = degreeProgram ? getDepartmentFromProgram(degreeProgram) : "GEN";
  const normalizedKeyword = keyword.trim().toLowerCase();

  // Search YouTube for live videos matching the keyword typed by the student.
  let youtubeItems: LearningMaterial[] = [];
  try {
    const deptContext: Record<string, string> = {
      CCS: "programming technology",
      ENG: "engineering",
      ARCH: "architecture design",
      CBA: "business finance",
      EDU: "education teaching",
      ARTS: "communications arts",
      GEN: "",
    };
    const ytQuery = `${keyword} ${deptContext[dept] ?? ""}`.trim();
    const ytResults = await searchYouTubeVideos(ytQuery, 4);
    youtubeItems = ytResults.map((r) =>
      youtubeResultToMaterial(
        r,
        (category ?? "Interview Preparation") as LearningMaterial["category"],
        dept as LearningMaterial["department"]
      )
    );
  } catch {

  }

  // Search our local list of reading guides and cheat sheets for matches.
  await seedLearningMaterialsIfEmpty();
  const allStatic = await fetchLearningMaterials(category, degreeProgram);
  const matchedStatic = allStatic.filter(
    (item) =>
      item.type !== "video" &&
      (item.title.toLowerCase().includes(normalizedKeyword) ||
        item.description.toLowerCase().includes(normalizedKeyword))
  );

  return [...youtubeItems, ...matchedStatic];
};
