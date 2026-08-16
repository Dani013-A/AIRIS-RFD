export interface AuditLogEntry {
  id: string;
  action:
    | "AdminLogin"
    | "UserLogin"
    | "UserDeleted"
    | "StudentUpdated"
    | "ReportsGenerated"
    | "LearningMaterialChanges"
    | "AuthenticationEvents";
  details: string;
  performedBy: string;
  ipAddress?: string;
  timestamp: any;
}
