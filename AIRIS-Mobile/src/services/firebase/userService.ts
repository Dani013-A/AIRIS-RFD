import { doc, serverTimestamp, updateDoc, runTransaction } from "firebase/firestore";

import { db } from "../../config/firebase";
import type { AppUser } from "../../types/user.types";

const USERS_COLLECTION = "users";

export const createProfileTransaction = async (uid: string, profile: AppUser): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (userSnap.exists()) {
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
  const { deleteDoc } = await import("firebase/firestore");
  const { deleteUser } = await import("firebase/auth");
  const { auth } = await import("../../config/firebase");

  console.log(`[AUTH][ACCOUNT_DELETE][START] Initiating account cascade deletion for user UID: ${uid}`);

  if (!auth.currentUser) {
    console.error(`[AUTH][ACCOUNT_DELETE][ERROR] No active Firebase Auth session for UID: ${uid}`);
    const err = new Error("auth/user-not-found");
    (err as any).code = "auth/user-not-found";
    throw err;
  }

  // 1. First delete Firestore user document while user is still authenticated
  console.log(`[AUTH][ACCOUNT_DELETE][FIRESTORE_DELETE] Deleting Firestore user document users/${uid}...`);
  const userRef = doc(db, USERS_COLLECTION, uid);
  await deleteDoc(userRef);

  // 2. Delete Firebase Auth user record
  console.log(`[AUTH][ACCOUNT_DELETE][AUTH_DELETE] Deleting Firebase Auth user account...`);
  try {
    await deleteUser(auth.currentUser);

    // 3. Clean up local persistent profile photo for this account
    const { deleteLocalProfilePhoto } = await import("./profilePhotoService");
    await deleteLocalProfilePhoto(uid);

    console.log(`[AUTH][ACCOUNT_DELETE][SUCCESS] Account cascade deletion finished cleanly for ${uid}`);
  } catch (authErr: any) {
    console.error(`[AUTH][ACCOUNT_DELETE][ERROR] Auth deletion failed:`, authErr?.code || authErr?.message);
    throw authErr;
  }
};
