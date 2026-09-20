import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { AuditLogEntry, AuditAction, AuditResult } from "../../types/audit.types";

const AUDIT_LOGS_COLLECTION = "auditLogs";

export interface LogAuditParams {
  action: AuditAction;
  details: string;
  actor: string;
  actorId?: string;
  role: string;
  target?: string;
  result?: AuditResult;
}

/**
 * Creates an immutable audit log entry in Firestore to document privileged administrative operations.
 */
export async function logAuditEvent(
  actionOrParams: AuditAction | LogAuditParams,
  details?: string,
  performedBy?: string,
  target?: string
): Promise<void> {
  let entry: Omit<AuditLogEntry, "id" | "timestamp"> & { timestamp: any };

  if (typeof actionOrParams === "object") {
    entry = {
      action: actionOrParams.action,
      details: actionOrParams.details,
      actor: actionOrParams.actor,
      actorId: actionOrParams.actorId || "unknown",
      role: actionOrParams.role || "admin",
      target: actionOrParams.target || "System",
      result: actionOrParams.result || "SUCCESS",
      timestamp: serverTimestamp(),
    };
  } else {
    entry = {
      action: actionOrParams,
      details: details || "",
      actor: performedBy || "Administrator",
      actorId: "unknown",
      role: "admin",
      target: target || "System",
      result: "SUCCESS",
      timestamp: serverTimestamp(),
    };
  }

  try {
    const logsCol = collection(db, AUDIT_LOGS_COLLECTION);
    await addDoc(logsCol, entry);
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

function parseAuditTimestamp(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === "string") return ts;
  if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toISOString();
  return new Date().toISOString();
}

/**
 * Fetches the latest system audit logs ordered by timestamp descending.
 */
export async function fetchAuditLogs(maxLogs = 100): Promise<AuditLogEntry[]> {
  const logsCol = collection(db, AUDIT_LOGS_COLLECTION);
  const q = query(logsCol, orderBy("timestamp", "desc"), limit(maxLogs));
  const snapshot = await getDocs(q);

  const logs: AuditLogEntry[] = [];
  snapshot.forEach((docSnap) => {
    const logData = docSnap.data();
    logs.push({
      id: docSnap.id,
      action: logData.action || "AuthenticationEvents",
      details: logData.details || "",
      actor: logData.actor || logData.performedBy || "Administrator",
      actorId: logData.actorId || "unknown",
      role: logData.role || "admin",
      target: logData.target || "System",
      result: logData.result || "SUCCESS",
      timestamp: parseAuditTimestamp(logData.timestamp),
    });
  });

  return logs;
}
