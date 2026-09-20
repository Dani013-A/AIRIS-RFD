export type AuditAction =
  | "AdminLogin"
  | "AdminLogout"
  | "UserBlocked"
  | "UserUnblocked"
  | "UserDeleted"
  | "StudentUpdated"
  | "ReportsGenerated"
  | "StudentProfileViewed"
  | "LearningMaterialChanges"
  | "AuthenticationEvents";

export type AuditResult = "SUCCESS" | "FAILURE";

export interface AuditLogEntry {
  id: string;
  actor: string;
  actorId: string;
  role: string;
  action: AuditAction;
  target: string;
  timestamp: string;
  result: AuditResult;
  details: string;
  ipAddress?: string;
}
