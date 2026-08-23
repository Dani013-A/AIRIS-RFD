import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";

const USERS_COLLECTION = "users";
const ACTIVITIES_SUBCOLLECTION = "activities";

export type ActivityType = "Resume Analysis" | "Mock Interview";

export interface UserActivity {
  id: string; // The activity document ID (maps to analysisId or sessionId)
  title: string;
  type: ActivityType;
  score: number;
  completedAt: any; // Firestore server timestamp or Date
  resumeId?: string;
  analysisId?: string;
  targetPosition?: string;
  fileName?: string;
  metadata?: {
    resumeId?: string;
    analysisId?: string;
    targetPosition?: string;
    fileName?: string;
    [key: string]: any;
  };
}

/**
 * Save an activity to the user's activities subcollection.
 */
export async function saveUserActivity(
  userId: string,
  activityId: string,
  activityData: Omit<UserActivity, "id" | "completedAt">
): Promise<void> {
  const activitiesColRef = collection(db, USERS_COLLECTION, userId, ACTIVITIES_SUBCOLLECTION);
  const docRef = doc(activitiesColRef, activityId);

  await setDoc(docRef, {
    id: activityId,
    ...activityData,
    completedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Fetch all activities for a user, ordered by completion time descending.
 */
export async function fetchUserActivities(userId: string): Promise<UserActivity[]> {
  const activitiesColRef = collection(db, USERS_COLLECTION, userId, ACTIVITIES_SUBCOLLECTION);
  const q = query(activitiesColRef, orderBy("completedAt", "desc"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => doc.data() as UserActivity);
}
