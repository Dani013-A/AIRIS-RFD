import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import {
  StudentListItem,
  StudentFullProfile,
  ScoreHistoryEvent,
  StudentActivityEvent,
  StoredResumeAnalysis,
  StoredInterviewSession,
  EmployabilityStatus,
} from "../../types/user.types";
import { AdminRole } from "../../types/auth.types";
import { logAuditEvent } from "./auditService";
import { findCollegeByProgramName, matchesCoordinator } from "../../config/tipManilaAcademic";
import { recordedTimestamp } from "./recordedTimestamp.mjs";

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
 * Deterministically computes the canonical composite Employability Preparedness Score.
 * Formula: round(Resume ATS Score × 0.40 + Interview Score × 0.60)
 *
 * Strict Rule:
 * Returns undefined ("Incomplete Data") if either score is missing/zero or interview is incomplete.
 * Never synthesizes fake scores or partial substitutes.
 */
export function calculateEmployabilityScore(
  resumeScore?: number,
  interviewScore?: number,
  interviewStatus?: string
): number | undefined {
  if (
    resumeScore !== undefined &&
    resumeScore > 0 &&
    interviewScore !== undefined &&
    interviewScore > 0 &&
    interviewStatus === "completed"
  ) {
    return Math.round(resumeScore * 0.40 + interviewScore * 0.60);
  }
  return undefined;
}

export interface StudentFilterOptions {
  program?: string;
  coordinator?: string;
  status?: string;
  userRole?: AdminRole;
  assignedProgram?: string;
  excludeDemo?: boolean;
  datasetScope?: "all" | "genuine" | "demo";
}

/**
 * Fetches all registered students from Firestore, respecting role-based scoping and filters.
 * Consumes authoritative stored subcollection records without synthesizing scores.
 */
export async function fetchStudentsList(filters?: StudentFilterOptions): Promise<StudentListItem[]> {
  const usersCol = collection(db, USERS_COLLECTION);
  const snapshot = await getDocs(usersCol);

  // OJT Coordinator program scoping boundary
  const effectiveProgramFilter =
    filters?.userRole === "ojt_coordinator" && filters.assignedProgram
      ? filters.assignedProgram
      : filters?.program && filters.program !== "all"
      ? filters.program
      : undefined;

  // Unify all eligible participants: both institutional and UAT participants are included together under All Participants.
  // Internal provenance markers (isDefenseDemo, isSyntheticUat) remain intact on records for auditability.
  const eligibleDocs = snapshot.docs.filter((docSnap) => {
    const userData = docSnap.data();
    if (userData.role === "admin" || userData.role === "career_center" || userData.role === "ojt_coordinator") {
      return false;
    }
    if (userData.isDeleted === true || userData.accountState === "DELETED") {
      return false;
    }

    // Role-based program filter enforcement
    if (effectiveProgramFilter && userData.degreeProgram !== effectiveProgramFilter) {
      return false;
    }

    // Coordinator filter enforcement (department/college coordinator)
    if (filters?.coordinator && filters.coordinator !== "all") {
      const col = findCollegeByProgramName(userData.degreeProgram || "");
      if (!matchesCoordinator(filters.coordinator, col?.id, userData.coordinator)) {
        return false;
      }
    }

    // Account status filter enforcement
    if (filters?.status === "active" && userData.isDisabled) {
      return false;
    }
    if (filters?.status === "disabled" && !userData.isDisabled) {
      return false;
    }

    return true;
  });

  // Fetch all student subcollections concurrently in parallel rather than blocking sequentially
  const studentPromises = eligibleDocs.map(async (docSnap): Promise<StudentListItem> => {
    const studentId = docSnap.id;
    const userData = docSnap.data();
    let resumeScore: number | undefined = undefined;
    let interviewScore: number | undefined = undefined;
    let resumeStatus: StudentListItem["resumeStatus"] = userData.hasUploadedResume ? "success" : "missing";
    let interviewStatus: StudentListItem["interviewStatus"] = "not_started";
    let resumesCount = 0;
    let interviewsCount = 0;
    const lastActivityDate = parseTimestamp(userData.updatedAt || userData.createdAt);

    const resumesColRef = collection(db, USERS_COLLECTION, studentId, RESUMES_SUBCOLLECTION);
    const analysesColRef = collection(db, USERS_COLLECTION, studentId, RESUME_ANALYSES_SUBCOLLECTION);
    const interviewsColRef = collection(db, USERS_COLLECTION, studentId, INTERVIEWS_SUBCOLLECTION);

    const [resumesRes, analysesRes, interviewsRes] = await Promise.allSettled([
      getDocs(resumesColRef),
      getDocs(analysesColRef),
      getDocs(interviewsColRef),
    ]);

    if (resumesRes.status === "fulfilled") {
      resumesCount = resumesRes.value.size;
      if (resumesCount > 0) {
        resumeStatus = "success";
      }
    }

    if (analysesRes.status === "fulfilled" && !analysesRes.value.empty) {
      let latestScore: number | undefined = undefined;
      let latestDate = 0;
      analysesRes.value.forEach((aDoc) => {
        const aData = aDoc.data();
        const score =
          aData.result?.resumeScore?.overallScore ??
          aData.result?.overallScore ??
          aData.result?.atsScore?.overallScore ??
          aData.resumeScore?.overallScore ??
          aData.overallScore ??
          aData.atsScore?.overallScore;
        const aTime = new Date(parseTimestamp(aData.createdAt || aData.analyzedAt)).getTime();
        if (aTime >= latestDate && score !== undefined && score !== null) {
          latestDate = aTime;
          latestScore = Number(score);
        }
      });
      resumeScore = latestScore;
    }

    if (interviewsRes.status === "fulfilled" && !interviewsRes.value.empty) {
      interviewsCount = interviewsRes.value.size;
      let latestIntScore: number | undefined = undefined;
      let latestIntDate = 0;
      let hasCompletedInterview = false;
      interviewsRes.value.forEach((iDoc) => {
        const iData = iDoc.data();
        if (iData.completedAt) hasCompletedInterview = true;
        const score =
          iData.finalReport?.overallPerformance ??
          iData.overallPerformance ??
          iData.overallScore ??
          iData.score;
        const iTime = new Date(parseTimestamp(iData.completedAt || iData.createdAt)).getTime();
        if (iData.completedAt && iTime >= latestIntDate && score !== undefined && score !== null) {
          latestIntDate = iTime;
          latestIntScore = Number(score);
        }
      });

      if (hasCompletedInterview) {
        interviewScore = latestIntScore;
        interviewStatus = "completed";
      } else {
        interviewStatus = "in_progress";
      }
    }

    // Calculate canonical composite employability score (strictly undefined if incomplete)
    const employabilityScore = calculateEmployabilityScore(resumeScore, interviewScore, interviewStatus);

    let employabilityStatus: EmployabilityStatus = "not_started";
    if (employabilityScore !== undefined) {
      employabilityStatus = "completed";
    } else if (resumeScore !== undefined && interviewScore === undefined) {
      employabilityStatus = "interview_pending";
    } else if (interviewScore !== undefined && resumeScore === undefined) {
      employabilityStatus = "resume_pending";
    }

    return {
      uid: studentId,
      email: userData.email || "No email",
      fullName: userData.fullName || "Unnamed Student",
      role: "student",
      college: userData.college || "General",
      degreeProgram: userData.degreeProgram || "Unspecified Program",
      targetPosition: userData.targetPosition || "Not set",
      coordinator: userData.coordinator,
      activeResumeId: userData.activeResumeId || "",
      hasUploadedResume: userData.hasUploadedResume || resumesCount > 0,
      isProfileComplete: userData.isProfileComplete || false,
      isDisabled: userData.isDisabled || false,
      isDefenseDemo: userData.isDefenseDemo === true,
      isSyntheticUat: userData.isSyntheticUat === true,
      createdAt: parseTimestamp(userData.createdAt),
      updatedAt: parseTimestamp(userData.updatedAt),
      employabilityScore,
      employabilityStatus,
      resumeScore,
      interviewScore,
      resumeStatus,
      interviewStatus,
      resumesCount,
      interviewsCount,
      lastActivityDate,
    };
  });

  const students = await Promise.all(studentPromises);
  // Sort students by creation date descending
  return students.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Retrieves the complete profile of a specific student, including their complete resume,
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
  analysesList.sort(
    (a, b) =>
      new Date(parseTimestamp(a.createdAt || a.analyzedAt)).getTime() -
      new Date(parseTimestamp(b.createdAt || b.analyzedAt)).getTime()
  );

  // 2. Fetch Interviews
  const interviewsList: StoredInterviewSession[] = [];
  try {
    const interviewsColRef = collection(db, USERS_COLLECTION, studentId, INTERVIEWS_SUBCOLLECTION);
    const interviewsSnap = await getDocs(interviewsColRef);
    interviewsSnap.forEach((d) => interviewsList.push({ sessionId: d.id, ...d.data() } as any));
  } catch (e) {
    console.warn("Failed to fetch student interviews:", e);
  }

  interviewsList.sort(
    (a, b) =>
      new Date(parseTimestamp(a.completedAt || a.startedAt)).getTime() -
      new Date(parseTimestamp(b.completedAt || b.startedAt)).getTime()
  );

  // 3. Fetch Activity Logs
  const activityLogs: StudentActivityEvent[] = [];
  try {
    const actColRef = collection(db, USERS_COLLECTION, studentId, ACTIVITIES_SUBCOLLECTION);
    const actSnap = await getDocs(actColRef);
    actSnap.forEach((d) => {
      const data = d.data();
      const timestamp = recordedTimestamp(data.completedAt ?? data.timestamp);
      if (!timestamp) return;
      activityLogs.push({
        id: d.id,
        action: data.title || data.type || "Activity",
        details: data.details || (typeof data.score === "number" && Number.isFinite(data.score)
          ? `Score: ${data.score}/100`
          : ""),
        timestamp,
        type: data.type,
      });
    });
  } catch (e) {
    console.warn("Failed to fetch student activities:", e);
  }

  activityLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 4. Build Chronological Score History Timeline
  const scoreHistory: ScoreHistoryEvent[] = [];

  let prevResumeScore: number | undefined = undefined;
  analysesList.forEach((a, idx) => {
    const score =
      a.result?.resumeScore?.overallScore ??
      a.result?.overallScore ??
      a.result?.atsScore?.overallScore ??
      a.resumeScore?.overallScore ??
      a.overallScore;

    const date = recordedTimestamp(a.createdAt ?? a.analyzedAt);
    if (score !== undefined && score !== null && date) {
      const numScore = Number(score);
      const version = a.version || idx + 1;
      let delta: number | undefined = undefined;
      if (prevResumeScore !== undefined) {
        delta = numScore - prevResumeScore;
      }
      prevResumeScore = numScore;

      scoreHistory.push({
        id: a.id || `resume_eval_${idx}`,
        type: "resume",
        title: `Resume Evaluation (v${version})`,
        version,
        score: numScore,
        previousScore: prevResumeScore,
        delta,
        date,
        targetPosition: a.targetPosition || userData.targetPosition,
        details: `Evaluated against ${a.targetPosition || userData.targetPosition || "Target Position"}`,
      });
    }
  });

  let prevInterviewScore: number | undefined = undefined;
  interviewsList.forEach((i, idx) => {
    const score =
      i.finalReport?.overallPerformance ??
      i.overallScore ??
      (i as any).score;

    const date = recordedTimestamp(i.completedAt);
    if (score !== undefined && score !== null && date) {
      const numScore = Number(score);
      let delta: number | undefined = undefined;
      if (prevInterviewScore !== undefined) {
        delta = numScore - prevInterviewScore;
      }
      prevInterviewScore = numScore;

      scoreHistory.push({
        id: i.sessionId || `interview_eval_${idx}`,
        type: "interview",
        title: `Mock Interview Session #${idx + 1}`,
        version: idx + 1,
        score: numScore,
        previousScore: prevInterviewScore,
        delta,
        date,
        targetPosition: i.targetRole || userData.targetPosition,
        details: i.targetRole ? `Target Role: ${i.targetRole}` : "Interactive Voice Simulation",
      });
    }
  });

  scoreHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Derive latest canonical analysis & evaluation
  const latestRawAnalysis = analysesList.length > 0 ? analysesList[analysesList.length - 1] : null;
  const latestAnalysis: StoredResumeAnalysis | null = latestRawAnalysis
    ? (latestRawAnalysis.result ?? latestRawAnalysis)
    : null;
  const latestResume = resumesList.length > 0 ? resumesList[resumesList.length - 1] : null;
  const latestInterview = interviewsList.filter((interview) => interview.completedAt).at(-1) || null;

  const resumeScore: number | undefined = latestAnalysis
    ? latestAnalysis.resumeScore?.overallScore ?? latestAnalysis.overallScore ?? latestAnalysis.atsScore?.overallScore
    : undefined;

  const interviewStatus: StudentListItem["interviewStatus"] = latestInterview
    ? "completed"
    : interviewsList.length > 0 ? "in_progress" : "not_started";

  const interviewScore: number | undefined =
    latestInterview && interviewStatus === "completed"
      ? latestInterview.finalReport?.overallPerformance ?? latestInterview.overallScore
      : undefined;

  const employabilityScore = calculateEmployabilityScore(resumeScore, interviewScore, interviewStatus);

  let employabilityStatus: EmployabilityStatus = "not_started";
  if (employabilityScore !== undefined) {
    employabilityStatus = "completed";
  } else if (resumeScore !== undefined && interviewScore === undefined) {
    employabilityStatus = "interview_pending";
  } else if (interviewScore !== undefined && resumeScore === undefined) {
    employabilityStatus = "resume_pending";
  }

  const student: StudentListItem = {
    uid: studentId,
    email: userData.email || "No email",
    fullName: userData.fullName || "Unnamed Student",
    role: "student",
    college: userData.college || "General",
    degreeProgram: userData.degreeProgram || "Unspecified Program",
    targetPosition: userData.targetPosition || "Not set",
    coordinator: userData.coordinator,
    activeResumeId: userData.activeResumeId || "",
    hasUploadedResume: userData.hasUploadedResume || resumesList.length > 0,
    isProfileComplete: userData.isProfileComplete || false,
    isDisabled: userData.isDisabled || false,
    createdAt: parseTimestamp(userData.createdAt),
    updatedAt: parseTimestamp(userData.updatedAt),
    employabilityScore,
    employabilityStatus,
    resumeScore,
    interviewScore,
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
 * Toggle the disabled state of a student's account and log an audit trail.
 */
export async function toggleStudentAccountState(
  studentId: string,
  isDisabled: boolean,
  actor: { name: string; uid: string; role: string }
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, studentId);
  await updateDoc(userRef, { isDisabled });

  const action = isDisabled ? "UserBlocked" : "UserUnblocked";
  await logAuditEvent({
    action,
    details: `${actor.name} (${actor.role}) ${isDisabled ? "blocked" : "unblocked"} student account ${studentId}.`,
    actor: actor.name,
    actorId: actor.uid,
    role: actor.role,
    target: studentId,
    result: "SUCCESS",
  });
}

/**
 * Delete a student account permanently from Firestore while retaining a minimal tombstone.
 * Strictly restricted to System Administrators.
 */
export async function deleteStudentAccount(
  studentId: string,
  actor: { name: string; uid: string; role: string }
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, studentId);
  await setDoc(userRef, {
    uid: studentId,
    accountState: "DELETED",
    isDeleted: true,
    isDisabled: true,
    deletedAt: serverTimestamp(),
    deletedBy: actor.name,
    updatedAt: serverTimestamp(),
  });

  await logAuditEvent({
    action: "UserDeleted",
    details: `${actor.name} (${actor.role}) permanently deleted student profile ${studentId}.`,
    actor: actor.name,
    actorId: actor.uid,
    role: actor.role,
    target: studentId,
    result: "SUCCESS",
  });
}
