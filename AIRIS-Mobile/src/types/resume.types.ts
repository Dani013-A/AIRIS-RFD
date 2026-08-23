import type { FieldValue, Timestamp } from "firebase/firestore";

export type ResumeExtractionStatus = "pending" | "success" | "failed";

export type ResumeProcessingStatus =
  | "idle"
  | "file_selected"
  | "awaiting_manual_text"
  | "extracting"
  | "validating"
  | "parsing"
  | "analyzing"
  | "saving"
  | "completed"
  | "failed";

export type ResumeSourceFileType = "pdf" | "image" | "txt" | "docx" | "manual";

export type ResumeExtractionMethod =
  | "txt_direct"
  | "manual_paste"
  | "pdf_text"
  | "image_ocr"
  | "docx_text";

export interface ResumeContactInformation {
  email: string;
  phone: string;
  name?: string;
  linkedin?: string;
  github?: string;
}

export interface ResumeEducation {
  school: string;
  degree: string;
  gpa?: string;
  graduationYear?: string;
}

export interface ResumeWorkExperience {
  company: string;
  role: string;
  description: string;
  duration?: string;
}

export interface ResumeProject {
  name: string;
  description: string;
  technologies?: string[];
}

export interface ResumeCertification {
  name: string;
  issuer?: string;
  date?: string;
}

export interface ResumeOrganization {
  name: string;
  role: string;
  description?: string;
}

export interface ResumeAchievement {
  title: string;
  description?: string;
}

export interface ResumeTraining {
  title: string;
  provider?: string;
  date?: string;
}

export interface StructuredResumeData {
  contactInformation?: ResumeContactInformation;
  professionalSummary?: string;
  education?: ResumeEducation[];
  skills?: string[];
  workExperience?: ResumeWorkExperience[];
  projects?: ResumeProject[];
  certifications?: ResumeCertification[];
  organizations?: ResumeOrganization[];
  achievements?: ResumeAchievement[];
  languages?: string[];
  trainings?: ResumeTraining[];
}

export interface Resume {
  resumeId: string;
  userId: string;
  originalFileName: string;
  fileType: string;
  sourceFileType: ResumeSourceFileType;
  extractionMethod: ResumeExtractionMethod;
  uploadedAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
  extractionStatus: ResumeExtractionStatus;
  parsingStatus: ResumeExtractionStatus;
  rawText: string;
  resumeVersion: number;
  structuredData: StructuredResumeData;
  analysisStatus: ResumeExtractionStatus;
  latestAnalysisId: string | null;
}

export type {
  LearningSnapshot,
  ImprovementAreaItem,
  SkillGapItem,
  SkillToLearnItem,
  TopicAndConceptItem,
  RecommendedCourseItem,
  CertificationItem,
  InterviewPrepItem,
} from "../services/resume/resumeAnalysisEngine";
