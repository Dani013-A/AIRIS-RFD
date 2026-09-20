/**
 * AIRIS Centralized Institutional Metric Definitions
 *
 * Establishes consistent semantic definitions, formulas, population boundaries,
 * and null behaviors across the Dashboard, Student Directory, Reports, and PDF exports.
 * Aligned with the September 11, 2026 Career Center Minutes of the Meeting (MOM).
 */

export interface MetricDefinition {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  source: string;
  population: string;
  calculation: string;
  nullBehavior: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  registeredStudents: {
    id: "registeredStudents",
    name: "Registered Students",
    shortLabel: "Registered",
    description: "Total student accounts created in the platform within the selected program and coordinator scope.",
    source: "Firestore /users collection where role == 'student'",
    population: "All registered students within active scope filters",
    calculation: "Count of student profile documents",
    nullBehavior: "Defaults to 0 if no student documents exist",
  },
  activeStudents: {
    id: "activeStudents",
    name: "Active Students",
    shortLabel: "Active Accounts",
    description: "Registered students whose account status is active and not disabled by campus administrators.",
    source: "Firestore /users collection where role == 'student' and isDisabled != true",
    population: "Registered students eligible to participate in evaluations",
    calculation: "Count of student profiles where isDisabled == false",
    nullBehavior: "Defaults to 0",
  },
  resumeSubmissions: {
    id: "resumeSubmissions",
    name: "Resume Submissions",
    shortLabel: "Submissions",
    description: "Total resume documents submitted across all iterations and versions by students.",
    source: "Firestore /users/{uid}/resumes subcollections",
    population: "All uploaded resume files",
    calculation: "Sum of resume documents uploaded by scoped students",
    nullBehavior: "Defaults to 0",
  },
  studentsWithResume: {
    id: "studentsWithResume",
    name: "Students with Resume",
    shortLabel: "Resume Submitted",
    description: "Distinct student accounts who have submitted at least one resume document.",
    source: "Firestore /users/{uid}/resumes or hasUploadedResume flag",
    population: "Unique registered students with uploaded documents",
    calculation: "Count of students where resumesCount > 0 or hasUploadedResume == true",
    nullBehavior: "Defaults to 0",
  },
  resumeAnalyses: {
    id: "resumeAnalyses",
    name: "Resume Analyzed",
    shortLabel: "Analyzed",
    description: "Students who have received an authoritative ATS and semantic role alignment evaluation.",
    source: "Firestore /users/{uid}/resumeAnalyses subcollection",
    population: "Unique students with completed AI resume evaluations",
    calculation: "Count of students with at least one completed resumeAnalyses record",
    nullBehavior: "Missing evaluation remains undefined (Pending/Incomplete), never zero",
  },
  interviewStarted: {
    id: "interviewStarted",
    name: "Interview Started",
    shortLabel: "Interview Started",
    description: "Students who have initiated an interactive voice mock interview simulation session.",
    source: "Firestore /users/{uid}/interviews subcollection with startedAt timestamp",
    population: "Unique students who began an interview",
    calculation: "Count of students where interviewStatus in ['in_progress', 'completed']",
    nullBehavior: "Defaults to 0",
  },
  interviewCompleted: {
    id: "interviewCompleted",
    name: "Interview Completed",
    shortLabel: "Interview Completed",
    description: "Students who have finalized a mock interview simulation and received a comprehensive evaluation report.",
    source: "Firestore /users/{uid}/interviews subcollection with completedAt and finalReport",
    population: "Unique students with finalized interview reports",
    calculation: "Count of students where interviewStatus == 'completed'",
    nullBehavior: "Missing evaluation remains undefined, never zero",
  },
  fullyPrepared: {
    id: "fullyPrepared",
    name: "Fully Prepared Students",
    shortLabel: "Fully Prepared",
    description: "Students who have successfully completed both an AI resume analysis and a finalized mock interview evaluation.",
    source: "Dual completion: valid resume analysis AND completed interview report",
    population: "Unique students meeting both Career Center graduation readiness milestones",
    calculation: "Count of students where resumeScore != undefined AND interviewScore != undefined AND interviewStatus == 'completed'",
    nullBehavior: "Explicitly marked 'Incomplete Data' if either requirement is missing",
  },
  completionRate: {
    id: "completionRate",
    name: "Overall Completion Rate",
    shortLabel: "Completion Rate",
    description: "Percentage of registered students within scope who have achieved Fully Prepared status.",
    source: "Derived from fullyPrepared / registeredStudents",
    population: "Scoped student cohort",
    calculation: "Math.round((fullyPreparedCount / registeredStudentsCount) * 100)",
    nullBehavior: "0% if registeredStudents == 0",
  },
  employabilityIndex: {
    id: "employabilityIndex",
    name: "Composite Employability Index",
    shortLabel: "Employability Index",
    description: "Weighted composite evaluation score: 40% Resume ATS Score + 60% Mock Interview Performance.",
    source: "Authoritative evaluation records in resumeAnalyses and interviews subcollections",
    population: "Students with both completed evaluations",
    calculation: "Math.round(resumeScore * 0.40 + interviewScore * 0.60)",
    nullBehavior: "Strictly undefined ('Incomplete Data') if either evaluation is incomplete; never converted to 0",
  },
};
