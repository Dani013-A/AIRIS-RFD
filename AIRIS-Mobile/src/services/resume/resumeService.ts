import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import type { Resume, StructuredResumeData, ResumeSourceFileType, ResumeExtractionMethod } from "../../types/resume.types";
import type { ResumeAnalysisResult } from "./resumeAnalysisEngine";
import { getAiRecommendationsForResume } from "../../data/learningRecommendations";

const USERS_COLLECTION = "users";
const RESUMES_SUBCOLLECTION = "resumes";
const ANALYSES_SUBCOLLECTION = "resumeAnalyses";

/**
 * Clean up any undefined values from the information before sending it to the database so Firestore doesn't complain.
 */
function cleanUndefined(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  const clean: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      clean[key] = cleanUndefined(obj[key]);
    }
  }
  return clean;
}

/**
 * Save both the resume text and the score analysis to the database in one secure, unified step, incrementing the resume version.
 */
export async function saveResumeAndAnalysisTransaction(
  userId: string,
  originalFileName: string,
  fileType: string,
  sourceFileType: ResumeSourceFileType,
  extractionMethod: ResumeExtractionMethod,
  rawText: string,
  structuredData: StructuredResumeData,
  analysisResult: ResumeAnalysisResult
): Promise<{ resume: Resume; analysisDoc: any }> {
  const userRef = doc(db, USERS_COLLECTION, userId);

  return runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("User document does not exist.");
    }
    const userData = userSnap.data();
    const currentCounter = userData.resumeVersionCounter || 0;
    const nextVersion = currentCounter + 1;

    const resumesColRef = collection(db, USERS_COLLECTION, userId, RESUMES_SUBCOLLECTION);
    const resumeDocRef = doc(resumesColRef);

    const analysesColRef = collection(db, USERS_COLLECTION, userId, ANALYSES_SUBCOLLECTION);
    const analysisDocRef = doc(analysesColRef);

    const recommendations = getAiRecommendationsForResume(
      analysisResult,
      userData.degreeProgram || "",
      userData.targetPosition || ""
    );

    const resumeData: Resume = {
      resumeId: resumeDocRef.id,
      userId,
      originalFileName,
      fileType,
      sourceFileType,
      extractionMethod,
      uploadedAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
      extractionStatus: "success",
      parsingStatus: "success",
      rawText,
      resumeVersion: nextVersion,
      structuredData: cleanUndefined(structuredData),
      analysisStatus: "success",
      latestAnalysisId: analysisDocRef.id,
    };

    const analysisDoc = {
      analysisId: analysisDocRef.id,
      userId,
      resumeId: resumeDocRef.id,
      targetPosition: userData.targetPosition || "",
      scoringModelVersion: "1.0.0",
      result: cleanUndefined({
        ...analysisResult,
        recommendations,
      }),
      createdAt: serverTimestamp() as any,
    };

    transaction.set(resumeDocRef, resumeData);
    transaction.set(analysisDocRef, analysisDoc);
    transaction.update(userRef, {
      activeResumeId: resumeDocRef.id,
      resumeVersionCounter: nextVersion,
      hasUploadedResume: true,
      updatedAt: serverTimestamp(),
    });

    const localTime = { toDate: () => new Date() } as any;

    return {
      resume: {
        ...resumeData,
        uploadedAt: localTime,
        updatedAt: localTime,
      },
      analysisDoc: {
        ...analysisDoc,
        createdAt: localTime,
      },
    };
  });
}

/**
 * Retrieves a specific resume document by its ID.
 */
export async function fetchActiveResumeFromDb(
  userId: string,
  activeResumeId: string
): Promise<Resume | null> {
  const docRef = doc(db, USERS_COLLECTION, userId, RESUMES_SUBCOLLECTION, activeResumeId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docSnap.data() as Resume;
}

/**
 * Retrieves a specific resume analysis document by its ID.
 */
export async function fetchAnalysisByIdFromDb(
  userId: string,
  analysisId: string
): Promise<any | null> {
  const docRef = doc(db, USERS_COLLECTION, userId, ANALYSES_SUBCOLLECTION, analysisId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docSnap.data();
}

/**
 * Saves a new role-targeted analysis document for an existing resume in a single atomic transaction.
 * - Does NOT mutate rawText, structuredData, or resumeVersion.
 * - Appends a new analysis document under users/{userId}/resumeAnalyses/{newAnalysisId}.
 * - Updates latestAnalysisId on users/{userId}/resumes/{resumeId}.
 * - Updates targetPosition on users/{userId}.
 */
export async function saveRetargetedAnalysisTransaction(
  userId: string,
  resumeId: string,
  targetPosition: string,
  analysisResult: ResumeAnalysisResult
): Promise<{ analysisId: string; analysisDoc: any }> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const resumeDocRef = doc(db, USERS_COLLECTION, userId, RESUMES_SUBCOLLECTION, resumeId);

  return runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("User document does not exist.");
    }
    const userData = userSnap.data();

    const resumeSnap = await transaction.get(resumeDocRef);
    if (!resumeSnap.exists()) {
      throw new Error("Resume document does not exist.");
    }

    const analysesColRef = collection(db, USERS_COLLECTION, userId, ANALYSES_SUBCOLLECTION);
    const analysisDocRef = doc(analysesColRef);

    const recommendations = getAiRecommendationsForResume(
      analysisResult,
      userData.degreeProgram || "",
      targetPosition
    );

    const analysisDoc = {
      analysisId: analysisDocRef.id,
      userId,
      resumeId,
      targetPosition,
      scoringModelVersion: "1.0.0",
      result: cleanUndefined({
        ...analysisResult,
        recommendations,
      }),
      createdAt: serverTimestamp() as any,
    };

    transaction.set(analysisDocRef, analysisDoc);
    transaction.update(resumeDocRef, {
      latestAnalysisId: analysisDocRef.id,
      updatedAt: serverTimestamp(),
    });
    transaction.update(userRef, {
      targetPosition,
      updatedAt: serverTimestamp(),
    });

    const localTime = { toDate: () => new Date() } as any;

    return {
      analysisId: analysisDocRef.id,
      analysisDoc: {
        ...analysisDoc,
        createdAt: localTime,
      },
    };
  });
}
