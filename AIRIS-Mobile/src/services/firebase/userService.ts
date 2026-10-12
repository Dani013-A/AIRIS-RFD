import { doc, serverTimestamp, updateDoc, runTransaction } from "firebase/firestore";

import { db } from "../../config/firebase";
import type { AppUser } from "../../types/user.types";
import { ACCOUNT_PAUSED_MSG, ACCOUNT_REMOVED_MSG } from "../../utils/accountLifecycle";

const USERS_COLLECTION = "users";

export const createProfileTransaction = async (uid: string, profile: AppUser): Promise<AppUser> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  return await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (userSnap.exists()) {
      const existingData = userSnap.data() as AppUser;
      if (existingData?.isDeleted || existingData?.accountState === "DELETED") {
        throw new Error(ACCOUNT_REMOVED_MSG);
      }
      if (existingData?.isDisabled || existingData?.accountState === "DISABLED") {
        throw new Error(ACCOUNT_PAUSED_MSG);
      }
      // Idempotent recovery / concurrent creation: return existing valid active profile
      return existingData;
    }
    transaction.set(userRef, profile);
    return profile;
  });
};

export const completeUserOnboarding = async (uid: string) => {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    hasCompletedOnboarding: true,
    isProfileComplete: true,
    updatedAt: serverTimestamp(),
  });
};

export const completeUserOnboardingWithConsents = async (
  uid: string,
  acceptedTerms: boolean,
  acceptedPrivacy: boolean,
  termsVersion: string,
  privacyVersion: string
) => {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    acceptedTerms,
    acceptedPrivacy,
    acceptedTermsAt: serverTimestamp(),
    acceptedPrivacyAt: serverTimestamp(),
    termsVersion,
    privacyVersion,
    hasCompletedOnboarding: true,
    isProfileComplete: true,
    updatedAt: serverTimestamp(),
  });
};

export const completeInitialSetup = async (
  uid: string,
  college: string,
  degreeProgram: string,
  targetPosition: string
) => {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    college,
    degreeProgram,
    targetPosition,
    hasCompletedInitialSetup: true,
    hasCompletedOnboarding: true,
    isProfileComplete: true,
    updatedAt: serverTimestamp(),
  });
};

export const updateCollegeSelection = async (uid: string, college: string) => {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    college,
    degreeProgram: "",
    targetPosition: "",
    hasCompletedInitialSetup: false,
    updatedAt: serverTimestamp(),
  });
};

export const updateProgramSelection = async (uid: string, degreeProgram: string) => {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    degreeProgram,
    targetPosition: "",
    hasCompletedInitialSetup: false,
    updatedAt: serverTimestamp(),
  });
};

export const updateAcceptedConsents = async (
  uid: string,
  acceptedTerms: boolean,
  acceptedPrivacy: boolean,
  termsVersion: string,
  privacyVersion: string
) => {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    acceptedTerms,
    acceptedPrivacy,
    acceptedTermsAt: serverTimestamp(),
    acceptedPrivacyAt: serverTimestamp(),
    termsVersion,
    privacyVersion,
    updatedAt: serverTimestamp(),
  });
};

export const updateHasUploadedResume = async (uid: string, hasUploadedResume: boolean) => {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    hasUploadedResume,
    updatedAt: serverTimestamp(),
  });
};

export const updateHasCompletedProductTour = async (uid: string, hasCompletedProductTour: boolean) => {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    hasCompletedProductTour,
    updatedAt: serverTimestamp(),
  });
};

export const updateProfileDetails = async (
  uid: string,
  fullName: string,
  college: string,
  degreeProgram: string,
  targetPosition: string
): Promise<void> => {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    fullName: fullName.trim(),
    college,
    degreeProgram,
    targetPosition,
    updatedAt: serverTimestamp(),
  });
};

export const deleteUserAccountCascade = async (uid: string): Promise<void> => {
  const { setDoc, collection, getDocs, deleteDoc } = await import("firebase/firestore");
  const { deleteUser } = await import("firebase/auth");
  const { auth } = await import("../../config/firebase");

  console.log(`[AUTH][ACCOUNT_DELETE][START] Initiating account cascade deletion for user UID: ${uid}`);

  // 1. Delete user-owned subcollections (resumes, resumeAnalyses, interviews, activities)
  const subcollections = ["resumes", "resumeAnalyses", "interviews", "activities"];
  for (const subcol of subcollections) {
    try {
      const colRef = collection(db, USERS_COLLECTION, uid, subcol);
      const snap = await getDocs(colRef);
      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }
      console.log(`[AUTH][ACCOUNT_DELETE][SUBCOL] Cleared ${snap.docs.length} docs from ${subcol}.`);
    } catch (subErr: any) {
      console.warn(`[AUTH][ACCOUNT_DELETE][SUBCOL_WARN] Subcollection ${subcol} deletion notice:`, subErr?.message || subErr);
    }
  }

  // 2. Record minimal non-sensitive tombstone record (no personal data retained)
  try {
    console.log(`[AUTH][ACCOUNT_DELETE][TOMBSTONE] Writing minimal non-sensitive lifecycle tombstone for users/${uid}...`);
    const userRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(userRef, {
      uid,
      accountState: "DELETED",
      isDeleted: true,
      isDisabled: true,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`[AUTH][ACCOUNT_DELETE][TOMBSTONE_SUCCESS] Minimal lifecycle tombstone recorded.`);
  } catch (fsErr: any) {
    console.warn(`[AUTH][ACCOUNT_DELETE][TOMBSTONE_WARN] Firestore tombstone write notice:`, fsErr?.message || fsErr);
  }

  // 3. Clean up local persistent profile photo and local cached resume files
  try {
    const { deleteLocalProfilePhoto } = await import("./profilePhotoService");
    await deleteLocalProfilePhoto(uid);
  } catch (photoErr) {
    console.warn(`[AUTH][ACCOUNT_DELETE][PHOTO_WARN] Local profile photo delete notice:`, photoErr);
  }

  try {
    const { deleteLocalResumeData } = await import("../resume/localResumeStorage");
    await deleteLocalResumeData(uid);
  } catch (resumeErr) {
    console.warn(`[AUTH][ACCOUNT_DELETE][LOCAL_RESUME_WARN] Local resume delete notice:`, resumeErr);
  }

  // 4. Delete Firebase Auth user record if active
  if (auth.currentUser) {
    console.log(`[AUTH][ACCOUNT_DELETE][AUTH_DELETE] Deleting Firebase Auth user account...`);
    try {
      await deleteUser(auth.currentUser);
      console.log(`[AUTH][ACCOUNT_DELETE][SUCCESS] Account cascade deletion finished cleanly for ${uid}`);
    } catch (authErr: any) {
      const errCode = authErr?.code || "";
      if (errCode === "auth/user-not-found" || errCode === "auth/null-user") {
        console.warn(`[AUTH][ACCOUNT_DELETE][WARN] Auth user already deleted on server.`);
      } else {
        console.error(`[AUTH][ACCOUNT_DELETE][ERROR] Auth deletion failed:`, authErr?.code || authErr?.message);
        throw authErr;
      }
    }
  } else {
    console.warn(`[AUTH][ACCOUNT_DELETE][WARN] No active auth.currentUser found, proceeding with local cleanup.`);
  }
};
