import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../config/firebase";
import { AuditLogEntry } from "../../types/audit.types";

const AUDIT_LOGS_COLLECTION = "auditLogs";

/**
 * Creates a new log entry in Firestore to document admin or student operations.
 */
export async function logAuditEvent(
  action: AuditLogEntry["action"],
  details: string,
  performedBy: string
): Promise<void> {
  try {
    const logsCol = collection(db, AUDIT_LOGS_COLLECTION);
    await addDoc(logsCol, {
      action,
      details,
      performedBy,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

/**
 * Fetches the latest system audit logs ordered by timestamp.
 */
export async function fetchAuditLogs(maxLogs = 50): Promise<AuditLogEntry[]> {
  const logsCol = collection(db, AUDIT_LOGS_COLLECTION);
  const q = query(logsCol, orderBy("timestamp", "desc"), limit(maxLogs));
  const snapshot = await getDocs(q);

  const logs: AuditLogEntry[] = [];
  snapshot.forEach((docSnap) => {
    const logData = docSnap.data();
    logs.push({
      id: docSnap.id,
      action: logData.action,
      details: logData.details,
      performedBy: logData.performedBy,
      timestamp: logData.timestamp ? logData.timestamp.toDate().toISOString() : new Date().toISOString(),
    } as AuditLogEntry);
  });

  return logs;
}
