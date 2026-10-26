import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { InterviewSession } from "../../store/interviewStore";

const USERS_COLLECTION = "users";
const INTERVIEWS_SUBCOLLECTION = "interviews";

export async function fetchSavedInterviewSession(userId: string, sessionId: string): Promise<InterviewSession | null> {
  if (!userId || auth.currentUser?.uid !== userId) throw new Error('Please sign in again to view your interview.');
  if (!sessionId || sessionId.includes('/') || userId.includes('/')) throw new Error('The interview reference is invalid.');
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, userId, INTERVIEWS_SUBCOLLECTION, sessionId));
  if (auth.currentUser?.uid !== userId) throw new Error('The signed-in account changed.');
  if (!snapshot.exists()) return null;
  const record = snapshot.data();
  if (record.userId && record.userId !== userId) throw new Error('The interview is unavailable for this account.');
  return { ...record, sessionId } as InterviewSession;
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
