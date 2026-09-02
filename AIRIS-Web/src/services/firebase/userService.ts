import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import {
  StudentListItem,
  StudentFullProfile,
  ScoreHistoryEvent,
  StudentActivityEvent,
} from "../../types/user.types";
import { logAuditEvent } from "./auditService";

const USERS_COLLECTION = "users";
const RESUMES_SUBCOLLECTION = "resumes";
const RESUME_ANALYSES_SUBCOLLECTION = "resumeAnalyses";
const INTERVIEWS_SUBCOLLECTION = "interviews";
const ACTIVITIES_SUBCOLLECTION = "activities";

function parseTimestamp(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === "string") return ts;
  if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toISOString();
  return new Date().toISOString();
}

/**
 * Deterministically calculates the canonical Employability Preparedness Score.
 * Formula: (Interview Score × 0.60) + (Resume ATS Score × 0.40)
 *
 * Strict Rules:
 * 1. Requires BOTH valid Resume ATS score (> 0) and valid Interview score (> 0).
 * 2. If interviewStatus is "not_started" or no completed interview session exists, returns undefined ("Not Yet Evaluated").
 * 3. Never substitutes single scores (e.g. resume score alone) into Employability Score.
 * 4. Never uses orphan/stale user document scores when 0 completed interview sessions exist.
 */
export function calculateEmployabilityScore(
  resumeScore?: number,
  interviewScore?: number,
  interviewStatus?: string
): number | undefined {
  if (
    resumeScore &&
    resumeScore > 0 &&
    interviewScore &&
    interviewScore > 0 &&
    interviewStatus === "completed"
  ) {
    return Math.round(resumeScore * 0.40 + interviewScore * 0.60);
  }
  return undefined;
}

/**
 * Fetches all registered students from the Firestore database.
 * Derives current scores and activity status directly from subcollections.
 */
export async function fetchStudentsList(): Promise<StudentListItem[]> {
  const usersCol = collection(db, USERS_COLLECTION);
  const snapshot = await getDocs(usersCol);

  const students: StudentListItem[] = [];

  for (const docSnap of snapshot.docs) {
    const userData = docSnap.data();
    if (userData.role === "admin") continue;

    const studentId = docSnap.id;
    let resumeScore = 0;
    let interviewScore = 0;
    let resumeStatus: StudentListItem["resumeStatus"] = userData.hasUploadedResume ? "success" : "missing";
    let interviewStatus: StudentListItem["interviewStatus"] = "not_started";
    let resumesCount = 0;
    let interviewsCount = 0;
    let lastActivityDate = parseTimestamp(userData.updatedAt || userData.createdAt);

    // 1. Check resumes subcollection
    try {
      const resumesColRef = collection(db, USERS_COLLECTION, studentId, RESUMES_SUBCOLLECTION);
      const resumesSnap = await getDocs(resumesColRef);
      resumesCount = resumesSnap.size;

      if (resumesCount > 0) {
        resumeStatus = "success";
      }

      // Fetch latest analysis
      const analysesColRef = collection(db, USERS_COLLECTION, studentId, RESUME_ANALYSES_SUBCOLLECTION);
      const analysesSnap = await getDocs(analysesColRef);
      if (!analysesSnap.empty) {
        let latestScore = 0;
        let latestDate = 0;
        analysesSnap.forEach((aDoc) => {
          const aData = aDoc.data();
          const score = aData.result?.atsScore?.overallScore ?? aData.result?.overallScore ?? 0;
          const aTime = new Date(parseTimestamp(aData.createdAt)).getTime();
          if (aTime > latestDate) {
            latestDate = aTime;
            latestScore = score;
          }
        });
        resumeScore = latestScore;
      }
    } catch (e) {
      console.warn(`Failed to parse resume analyses for ${studentId}:`, e);
    }

    // 2. Check interviews subcollection
    try {
      const interviewsColRef = collection(db, USERS_COLLECTION, studentId, INTERVIEWS_SUBCOLLECTION);
      const interviewsSnap = await getDocs(interviewsColRef);
      interviewsCount = interviewsSnap.size;

      if (interviewsCount > 0) {
        interviewStatus = "completed";
        let latestIntScore = 0;
        let latestIntDate = 0;
        interviewsSnap.forEach((iDoc) => {
          const iData = iDoc.data();
          const score = iData.overallScore ?? iData.score ?? 0;
          const iTime = new Date(parseTimestamp(iData.completedAt || iData.createdAt)).getTime();
          if (iTime > latestIntDate) {
            latestIntDate = iTime;
            latestIntScore = score;
          }
        });
        if (latestIntScore > 0) {
          interviewScore = latestIntScore;
        }
      }
    } catch (e) {
      console.warn(`Failed to parse interviews for ${studentId}:`, e);
    }

    // Calculate canonical composite employability score (returns undefined if inputs incomplete)
    const employabilityScore = calculateEmployabilityScore(resumeScore, interviewScore, interviewStatus);

    students.push({
      uid: studentId,
      email: userData.email || "No email",
      fullName: userData.fullName || "Unnamed Student",
      role: "student",
      college: userData.college || "General",
      degreeProgram: userData.degreeProgram || "Unspecified Program",
      targetPosition: userData.targetPosition || "Not set",
      activeResumeId: userData.activeResumeId || "",
      hasUploadedResume: userData.hasUploadedResume || resumesCount > 0,
      isProfileComplete: userData.isProfileComplete || false,
      isDisabled: userData.isDisabled || false,
      createdAt: parseTimestamp(userData.createdAt),
      updatedAt: parseTimestamp(userData.updatedAt),
      employabilityScore,
      resumeScore,
      interviewScore: interviewStatus === "completed" ? interviewScore : 0,
      resumeStatus,
      interviewStatus,
      resumesCount,
      interviewsCount,
      lastActivityDate,
    });
  }

  // Sort students by creation date descending
  return students.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Retrieves the complete details of a specific student, including their complete resume,
 * analyses history, interview history, activity logs, and chronological score timeline.
 */
export async function fetchStudentDetails(studentId: string): Promise<StudentFullProfile> {
  const userRef = doc(db, USERS_COLLECTION, studentId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("Student account was not found.");
  }

  const userData = userSnap.data();

  // 1. Fetch Resumes & Resume Analyses
  const resumesList: any[] = [];
  const analysesList: any[] = [];
  try {
    const resumesColRef = collection(db, USERS_COLLECTION, studentId, RESUMES_SUBCOLLECTION);
    const resumesSnap = await getDocs(resumesColRef);
    resumesSnap.forEach((d) => resumesList.push({ id: d.id, ...d.data() }));

    const analysesColRef = collection(db, USERS_COLLECTION, studentId, RESUME_ANALYSES_SUBCOLLECTION);
    const analysesSnap = await getDocs(analysesColRef);
    analysesSnap.forEach((d) => analysesList.push({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("Failed to fetch student resumes/analyses:", e);
  }

  // Sort analyses by date ascending to calculate chronological score deltas strictly within metric
  analysesList.sort((a, b) => new Date(parseTimestamp(a.createdAt)).getTime() - new Date(parseTimestamp(b.createdAt)).getTime());

  // 2. Fetch Interviews
  const interviewsList: any[] = [];
  try {
    const interviewsColRef = collection(db, USERS_COLLECTION, studentId, INTERVIEWS_SUBCOLLECTION);
    const interviewsSnap = await getDocs(interviewsColRef);
    interviewsSnap.forEach((d) => interviewsList.push({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("Failed to fetch student interviews:", e);
  }

  interviewsList.sort((a, b) => new Date(parseTimestamp(a.completedAt || a.createdAt)).getTime() - new Date(parseTimestamp(b.completedAt || b.createdAt)).getTime());

  // 3. Fetch Activity Logs
  const activityLogs: StudentActivityEvent[] = [];
  try {
    const actColRef = collection(db, USERS_COLLECTION, studentId, ACTIVITIES_SUBCOLLECTION);
    const actSnap = await getDocs(actColRef);
    actSnap.forEach((d) => {
      const data = d.data();
      activityLogs.push({
        id: d.id,
        action: data.title || data.type || "Activity",
        details: data.details || `Score: ${data.score ?? "N/A"}`,
        timestamp: parseTimestamp(data.completedAt || data.timestamp),
        type: data.type,
      });
    });
  } catch (e) {
    console.warn("Failed to fetch student activities:", e);
  }

  activityLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 4. Build Chronological Score History Timeline
  const scoreHistory: ScoreHistoryEvent[] = [];

  // Resume score history (Delta calculated ONLY within Resume metric)
  let prevResumeScore: number | undefined = undefined;
  analysesList.forEach((a, idx) => {
    const score = a.result?.atsScore?.overallScore ?? a.result?.overallScore ?? 0;
    const version = idx + 1;
    let delta: number | undefined = undefined;
    if (prevResumeScore !== undefined) {
      delta = score - prevResumeScore;
    }
    prevResumeScore = score;

    scoreHistory.push({
      id: a.id || `resume_eval_${idx}`,
      type: "resume",
      title: `Resume Evaluation (v${version})`,
      version,
      score,
      previousScore: prevResumeScore,
      delta,
      date: parseTimestamp(a.createdAt),
      targetPosition: a.targetPosition || userData.targetPosition,
      details: `Evaluated against ${a.targetPosition || userData.targetPosition || "Target Position"}`,
    });
  });

  // Interview score history (Delta calculated ONLY within Interview metric)
  let prevInterviewScore: number | undefined = undefined;
  interviewsList.forEach((i, idx) => {
    const score = i.overallScore ?? i.score ?? 0;
    let delta: number | undefined = undefined;
    if (prevInterviewScore !== undefined) {
      delta = score - prevInterviewScore;
    }
    prevInterviewScore = score;

    scoreHistory.push({
      id: i.id || `interview_eval_${idx}`,
      type: "interview",
      title: `Mock Interview Session #${idx + 1}`,
      version: idx + 1,
      score,
      previousScore: prevInterviewScore,
      delta,
      date: parseTimestamp(i.completedAt || i.createdAt),
      targetPosition: i.targetPosition || userData.targetPosition,
      details: i.roleTitle ? `Target Role: ${i.roleTitle}` : "Interactive Voice Simulation",
    });
  });

  // Sort score history timeline by date descending for presentation
  scoreHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Derive latest Scores & Statuses
  const latestAnalysis = analysesList.length > 0 ? analysesList[analysesList.length - 1] : null;
  const latestResume = resumesList.length > 0 ? resumesList[resumesList.length - 1] : null;
  const latestInterview = interviewsList.length > 0 ? interviewsList[interviewsList.length - 1] : null;

  const resumeScore = latestAnalysis ? (latestAnalysis.result?.atsScore?.overallScore ?? latestAnalysis.result?.overallScore ?? 0) : 0;
  const interviewStatus = interviewsList.length > 0 ? "completed" : "not_started";
  const interviewScore = latestInterview ? (latestInterview.overallScore ?? latestInterview.score ?? 0) : 0;

  const employabilityScore = calculateEmployabilityScore(resumeScore, interviewScore, interviewStatus);

  const student: StudentListItem = {
    uid: studentId,
    email: userData.email || "No email",
    fullName: userData.fullName || "Unnamed Student",
    role: "student",
    college: userData.college || "General",
    degreeProgram: userData.degreeProgram || "Unspecified Program",
    targetPosition: userData.targetPosition || "Not set",
    activeResumeId: userData.activeResumeId || "",
    hasUploadedResume: userData.hasUploadedResume || resumesList.length > 0,
    isProfileComplete: userData.isProfileComplete || false,
    isDisabled: userData.isDisabled || false,
    createdAt: parseTimestamp(userData.createdAt),
    updatedAt: parseTimestamp(userData.updatedAt),
    employabilityScore,
    resumeScore,
    interviewScore: interviewStatus === "completed" ? interviewScore : 0,
    resumeStatus: resumesList.length > 0 ? "success" : "missing",
    interviewStatus,
    resumesCount: resumesList.length,
    interviewsCount: interviewsList.length,
    lastActivityDate: parseTimestamp(userData.updatedAt || userData.createdAt),
  };

  return {
    student,
    latestResumeAnalysis: latestAnalysis,
    latestResume,
    latestInterview,
    scoreHistory,
    activityLogs,
    resumesList,
    interviewsList,
  };
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
    `${adminName} ${statusLabel} a student account.`,
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
    `${adminName} permanently deleted a student profile.`,
    adminName
  );
}
