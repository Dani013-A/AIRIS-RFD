import { doc, serverTimestamp, updateDoc, runTransaction } from "firebase/firestore";

import { db } from "../../config/firebase";
import type { AppUser } from "../../types/user.types";

const USERS_COLLECTION = "users";

export const createProfileTransaction = async (uid: string, profile: AppUser): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (userSnap.exists()) {
      const existingData = userSnap.data() as AppUser;
      if (existingData?.isDeleted || existingData?.accountState === "DELETED") {
        throw new Error("Cannot initialize profile for a deleted account.");
      }
      if (existingData?.isDisabled || existingData?.accountState === "DISABLED") {
        throw new Error("Cannot initialize profile for a disabled account.");
      }
      throw new Error("Firestore profile already exists.");
    }
    transaction.set(userRef, profile);
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
  const { setDoc } = await import("firebase/firestore");
  const { deleteUser } = await import("firebase/auth");
  const { auth } = await import("../../config/firebase");

  console.log(`[AUTH][ACCOUNT_DELETE][START] Initiating account cascade deletion for user UID: ${uid}`);

  // 1. Record minimal non-sensitive tombstone record (no personal data retained)
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

  // 2. Clean up local persistent profile photo for this account
  try {
    const { deleteLocalProfilePhoto } = await import("./profilePhotoService");
    await deleteLocalProfilePhoto(uid);
  } catch (photoErr) {
    console.warn(`[AUTH][ACCOUNT_DELETE][PHOTO_WARN] Local profile photo delete notice:`, photoErr);
  }

  // 3. Delete Firebase Auth user record if active
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
