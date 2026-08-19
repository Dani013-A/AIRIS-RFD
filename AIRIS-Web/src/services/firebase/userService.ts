import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { StudentListItem } from "../../types/user.types";
import { logAuditEvent } from "./auditService";

const USERS_COLLECTION = "users";
const RESUMES_SUBCOLLECTION = "resumes";
const RESUME_ANALYSES_SUBCOLLECTION = "resumeAnalyses";

/**
 * Fetches all registered students from the Firestore database.
 * Includes their active resume details and scores.
 */
export async function fetchStudentsList(): Promise<StudentListItem[]> {
  const usersCol = collection(db, USERS_COLLECTION);
  const q = query(usersCol, where("role", "==", "student"));
  const snapshot = await getDocs(q);

  const students: StudentListItem[] = [];

  for (const docSnap of snapshot.docs) {
    const userData = docSnap.data();
    let employabilityScore = 0;
    let resumeStatus: StudentListItem["resumeStatus"] = "missing";

    if (userData.hasUploadedResume && userData.activeResumeId) {
      resumeStatus = "success";
      try {
        // 1. Fetch the resume document first to get latestAnalysisId
      // 1. Fetch parsed resume document first
        const resumeRef = doc(
          db,
          USERS_COLLECTION,
          docSnap.id,
          RESUMES_SUBCOLLECTION,
          userData.activeResumeId
        );
        const resumeSnap = await getDoc(resumeRef);
        if (resumeSnap.exists()) {
          const resumeData = resumeSnap.data();
          const latestAnalysisId = resumeData.latestAnalysisId;

          if (latestAnalysisId) {
            // 2. Fetch the analysis document using the actual latestAnalysisId
            const analysisRef = doc(
              db,
              USERS_COLLECTION,
              docSnap.id,
              RESUME_ANALYSES_SUBCOLLECTION,
              latestAnalysisId
            );
            const analysisSnap = await getDoc(analysisRef);
            if (analysisSnap.exists()) {
              const analysisData = analysisSnap.data();
              const resumeScore = analysisData.result?.atsScore?.overallScore || 0;
              const interviewScore = userData.interviewScore || 0;
              employabilityScore = Math.round((interviewScore * 0.60) + (resumeScore * 0.40));
            }
          }
        }
      } catch (error) {
        console.warn("Failed to fetch analysis score for student:", docSnap.id, error);
      }
    }

    students.push({
      uid: docSnap.id,
      email: userData.email,
      fullName: userData.fullName || "Unnamed Student",
      role: "student",
      college: userData.college || "General",
      degreeProgram: userData.degreeProgram || "Unspecified",
      targetPosition: userData.targetPosition || "Not set",
      activeResumeId: userData.activeResumeId || "",
      hasUploadedResume: userData.hasUploadedResume || false,
      isProfileComplete: userData.isProfileComplete || false,
      isDisabled: userData.isDisabled || false,
      createdAt: userData.createdAt ? userData.createdAt.toDate().toISOString() : new Date().toISOString(),
      updatedAt: userData.updatedAt ? userData.updatedAt.toDate().toISOString() : new Date().toISOString(),
      employabilityScore,
      resumeStatus,
      interviewStatus: "not_started",
    });
  }

  return students;
}

/**
 * Retrieves the complete details of a specific student, including their resume and analysis.
 */
export async function fetchStudentDetails(
  studentId: string
): Promise<{ student: StudentListItem; resumeAnalysis: any | null; resume: any | null }> {
  const userRef = doc(db, USERS_COLLECTION, studentId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("Student account was not found.");
  }

  const userData = userSnap.data();
  let resumeAnalysis: any | null = null;
  let resume: any | null = null;
  let employabilityScore = 0;

  if (userData.hasUploadedResume && userData.activeResumeId) {
    try {
      const resumeRef = doc(
        db,
        USERS_COLLECTION,
        studentId,
        RESUMES_SUBCOLLECTION,
        userData.activeResumeId
      );
      const resumeSnap = await getDoc(resumeRef);
      if (resumeSnap.exists()) {
        resume = resumeSnap.data();

        // 2. Fetch analysis document using latestAnalysisId from resume document
        const latestAnalysisId = resume?.latestAnalysisId;
        if (latestAnalysisId) {
          const analysisRef = doc(
            db,
            USERS_COLLECTION,
            studentId,
            RESUME_ANALYSES_SUBCOLLECTION,
            latestAnalysisId
          );
          const analysisSnap = await getDoc(analysisRef);
          if (analysisSnap.exists()) {
            resumeAnalysis = analysisSnap.data();
            const resumeScore = resumeAnalysis.result?.atsScore?.overallScore || 0;
            const interviewScore = userData.interviewScore || 0;
            employabilityScore = Math.round((interviewScore * 0.60) + (resumeScore * 0.40));
          }
        }
      }
    } catch (error) {
      console.warn("Failed to fetch resume/analysis details:", error);
    }
  }

  const student: StudentListItem = {
    uid: studentId,
    email: userData.email,
    fullName: userData.fullName || "Unnamed Student",
    role: "student",
    college: userData.college || "General",
    degreeProgram: userData.degreeProgram || "Unspecified",
    targetPosition: userData.targetPosition || "Not set",
    activeResumeId: userData.activeResumeId || "",
    hasUploadedResume: userData.hasUploadedResume || false,
    isProfileComplete: userData.isProfileComplete || false,
    isDisabled: userData.isDisabled || false,
    createdAt: userData.createdAt ? userData.createdAt.toDate().toISOString() : new Date().toISOString(),
    updatedAt: userData.updatedAt ? userData.updatedAt.toDate().toISOString() : new Date().toISOString(),
    employabilityScore,
    resumeStatus: userData.hasUploadedResume ? "success" : "missing",
    interviewStatus: "not_started",
  };

  return { student, resumeAnalysis, resume };
}

/**
 * Toggle the disabled state of a student's account.
 */
export async function toggleStudentAccountState(
  studentId: string,
  isDisabled: boolean,
  adminName: string
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, studentId);
  await updateDoc(userRef, { isDisabled });

  const statusLabel = isDisabled ? "disabled" : "enabled";
  await logAuditEvent(
    "StudentUpdated",
    `Administrator ${adminName} ${statusLabel} user account: ${studentId}.`,
    adminName
  );
}

/**
 * Delete a student account permanently from Firestore.
 */
export async function deleteStudentAccount(studentId: string, adminName: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, studentId);
  await deleteDoc(userRef);

  await logAuditEvent(
    "UserDeleted",
    `Administrator ${adminName} permanently deleted student profile: ${studentId}.`,
    adminName
  );
}
