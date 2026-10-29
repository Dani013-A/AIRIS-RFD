export type AdminRole = "admin" | "career_center" | "ojt_coordinator";

export interface AdminUser {
  uid: string;
  email: string;
  fullName: string;
  role: AdminRole;
  assignedProgram?: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export function formatAdminRoleLabel(role: AdminRole): string {
  switch (role) {
    case "admin":
      return "System Administrator";
    case "career_center":
      return "Career Center";
    case "ojt_coordinator":
      return "OJT Coordinator";
    default:
      return "Administrator";
  }
}
