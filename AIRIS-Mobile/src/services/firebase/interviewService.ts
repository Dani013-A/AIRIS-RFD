import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { InterviewSession } from "../../store/interviewStore";

const USERS_COLLECTION = "users";
const INTERVIEWS_SUBCOLLECTION = "interviews";

/**
 * Clean up any undefined values from the information before sending it to the database so Firestore doesn't complain.
 */
function cleanUndefined(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  const clean: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      clean[key] = cleanUndefined(obj[key]);
    }
  }
  return clean;
}

/**
 * Save a completed interview session to Firestore.
 */
export async function saveInterviewSession(userId: string, session: InterviewSession): Promise<void> {
  const interviewsColRef = collection(db, USERS_COLLECTION, userId, INTERVIEWS_SUBCOLLECTION);
  
  // Use the session ID from Zustand, or create a new document reference
  const docRef = doc(interviewsColRef, session.sessionId);
  
  // Exclude raw heavy objects if necessary, but keep history and evaluations
  const sanitizedSession = cleanUndefined({
    ...session,
    createdAt: serverTimestamp(),
  });
  
  await setDoc(docRef, sanitizedSession, { merge: true });
}

/**
 * Fetch the most recent completed interview for a given user.
 */
export async function fetchLatestInterviewSession(userId: string): Promise<InterviewSession | null> {
  const interviewsColRef = collection(db, USERS_COLLECTION, userId, INTERVIEWS_SUBCOLLECTION);
  
  // Query by completedAt descending to get the most recent completed interview
  const q = query(interviewsColRef, orderBy("completedAt", "desc"), limit(1));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  return querySnapshot.docs[0].data() as InterviewSession;
}
