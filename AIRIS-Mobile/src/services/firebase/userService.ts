import { doc, serverTimestamp, updateDoc, runTransaction } from "firebase/firestore";

import { auth, db } from "../../config/firebase";
import type { AppUser } from "../../types/user.types";
import { ACCOUNT_PAUSED_MSG, ACCOUNT_REMOVED_MSG } from "../../utils/accountLifecycle";
import { accountLifecycleRequest } from "../api/accountLifecycleService";

const USERS_COLLECTION = "users";

export const createProfileTransaction = async (uid: string, profile: AppUser): Promise<AppUser> => {
  if (auth.currentUser?.uid !== uid) throw new Error("Account identity changed. Please sign in again.");

  try {
    const result = await accountLifecycleRequest('register', profile.fullName);
    if (result?.profile) return result.profile;
  } catch (lifecycleErr: any) {
    if (lifecycleErr?.code === 'ACCOUNT_DISABLED') {
      throw lifecycleErr;
    }
    if (lifecycleErr?.code === 'ACCOUNT_REMOVED') {
      throw lifecycleErr;
    }
    console.warn(`[AUTH][REGISTER][LIFECYCLE_FALLBACK] Server lifecycle endpoint unavailable (${lifecycleErr?.message || lifecycleErr}), falling back to direct Firestore profile transaction.`);
  }

  const userRef = doc(db, USERS_COLLECTION, uid);
  return await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (userSnap.exists()) {
      const existingData = userSnap.data() as AppUser;
      if (existingData?.isDisabled || existingData?.accountState === "DISABLED") {
        throw new Error(ACCOUNT_PAUSED_MSG);
      }
      if (existingData?.accountState === "DELETED" || existingData?.isDeleted) {
        if (existingData?.deletionOrigin === "ADMIN") {
          throw new Error(ACCOUNT_REMOVED_MSG);
        }
      } else {
        return existingData;
      }
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
  if (auth.currentUser?.uid !== uid) throw new Error("Account identity changed. Please sign in again.");
  try {
    await accountLifecycleRequest('self_delete');
  } catch (lifecycleErr: any) {
    if (lifecycleErr?.code === 'RECENT_LOGIN_REQUIRED' || String(lifecycleErr?.message || '').includes('sign in again')) {
      throw lifecycleErr;
    }
    console.warn(`[AUTH][ACCOUNT_DELETE][LIFECYCLE_FALLBACK] Server lifecycle endpoint unavailable (${lifecycleErr?.message || lifecycleErr}), proceeding with direct client auth deletion.`);
    const { collection, getDocs, deleteDoc, setDoc } = await import("firebase/firestore");
    const subcollections = ["resumes", "resumeAnalyses", "interviews", "activities"];
    for (const subcol of subcollections) {
      try {
        const colRef = collection(db, USERS_COLLECTION, uid, subcol);
        const snap = await getDocs(colRef);
        for (const docSnap of snap.docs) {
          await deleteDoc(docSnap.ref);
        }
      } catch (subErr: any) {
        console.warn(`[AUTH][ACCOUNT_DELETE][SUBCOL_WARN] Subcollection ${subcol} deletion notice:`, subErr?.message || subErr);
      }
    }
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      await setDoc(userRef, {
        uid,
        accountState: "DELETED",
        isDeleted: true,
        isDisabled: true,
        deletionOrigin: "SELF",
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (fsErr: any) {
      console.warn(`[AUTH][ACCOUNT_DELETE][TOMBSTONE_WARN] Firestore tombstone write notice:`, fsErr?.message || fsErr);
    }
    const { deleteUser } = await import("firebase/auth");
    if (auth.currentUser) {
      await deleteUser(auth.currentUser);
    }
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

  const { signOut } = await import("firebase/auth");
  if (auth.currentUser?.uid === uid) await signOut(auth);
};
