import { isManilaStudentEmail, MANILA_EMAIL_MESSAGE } from "../../utils/institutionalEmail";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  linkWithCredential,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../../config/firebase";
import type { AppUser } from "../../types/user.types";
import { validatePassword } from "../../utils/passwordPolicy";

const USERS_COLLECTION = "users";

export class EmailNotVerifiedError extends Error {
  constructor(message = "Please verify your TIP email before logging in.") {
    super(message);
    this.name = "EmailNotVerifiedError";
  }
}

export const getUserById = async (uid: string): Promise<AppUser | null> => {
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));

  if (!userDoc || !userDoc.exists()) {
    return null;
  }

  return userDoc.data() as AppUser;
};

const isTipEmail = (email: string) => {
  return email.trim().toLowerCase().endsWith("@tip.edu.ph");
};

import {
  determineAccountLifecycleState,
  ACCOUNT_PAUSED_MSG,
  ACCOUNT_REMOVED_MSG,
  ACCOUNT_MISSING_PROFILE_MSG,
} from "../../utils/accountLifecycle";
import { createProfileTransaction } from "./userService";

/**
 * Register a new student with email/password.
 * 1. Validates the email ends with @tip.edu.ph.
 * 2. Creates the user in Firebase Auth.
 * 3. Synchronizes ID token.
 * 4. Authoritatively creates the Firestore profile via createProfileTransaction.
 * 5. Sends a verification email.
 * 6. Signs out immediately — user must verify email before first login.
 */
export const registerStudent = async (
  email: string,
  password: string,
  fullName: string,
): Promise<AppUser> => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isManilaStudentEmail(normalizedEmail)) {
    throw new Error(MANILA_EMAIL_MESSAGE);
  }

  // Firebase owns credential uniqueness; the lifecycle server owns email restrictions and profile creation.
  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  } catch (err: any) {
    if (
      err?.code === "auth/email-already-in-use" ||
      (typeof err?.message === "string" && err.message.includes("email-already-in-use"))
    ) {
      throw new Error(
        "An account with this TIP email already exists. Try logging in instead, or use Google Sign-In if you registered with Google."
      );
    }
    throw err;
  }
  const user = userCredential.user;

  if (typeof user.getIdToken === "function") {
    await user.getIdToken(true);
  }

  const newUser: AppUser = {
    uid: user.uid,
    email: user.email ?? normalizedEmail,
    fullName: fullName.trim(),
    role: "student",
    isProfileComplete: false,
    accountState: "ACTIVE",
    isDeleted: false,
    isDisabled: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    hasCompletedOnboarding: false,
    hasCompletedInitialSetup: false,
  };

  try {
    const profile = await createProfileTransaction(user.uid, newUser);
    await sendEmailVerification(user);
    return profile;
  } catch (err) {
    try {
      if (typeof user?.delete === "function") {
        await user.delete();
      } else {
        await deleteUser(user);
      }
    } catch (_) {}
    throw err;
  } finally {
    // Keep the credential on uncertain server failures; sign-in can safely recover without deleting a committed profile.
    if (auth.currentUser?.uid === user.uid) await signOut(auth);
  }
};

/**
 * Safely links a Google credential to an existing email/password account after authenticating ownership of both credentials.
 * Preserves the original Firebase UID, profile, resume data, interview history, activities, and role assignments.
 */
export const linkGoogleToExistingEmailAccount = async (
  email: string,
  password: string,
  googleCredential: any
): Promise<AppUser> => {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Authenticate ownership of existing email/password account
  const userCred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  const user = userCred.user;

  // 2. Link Google credential
  await linkWithCredential(user, googleCredential);

  // 3. Fetch existing user profile to preserve original UID and all associated records
  const profile = await getUserById(user.uid);
  if (!profile) {
    throw new Error("Unable to locate existing profile after linking.");
  }

  return profile;
};

/**
 * Login an existing user.
 * 1. Signs in with email/password.
 * 2. Reloads the Firebase user to get fresh emailVerified status.
 * 3. If email is not verified, throws EmailNotVerifiedError (UI shows modal).
 * 4. If verified, reads the Firestore user document and checks account lifecycle state.
 */
export const loginUser = async (email: string, password: string): Promise<AppUser> => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isTipEmail(normalizedEmail)) {
    throw new Error("Only TIP email addresses are allowed.");
  }

  const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);

  const user = userCredential.user;

  await user.reload();

  if (!user.emailVerified) {
    throw new EmailNotVerifiedError();
  }

  if (!user.email || !isTipEmail(user.email)) {
    await signOut(auth);
    throw new Error("Only TIP email addresses are allowed.");
  }

  const userDocRef = doc(db, USERS_COLLECTION, user.uid);
  const userDoc = await getDoc(userDocRef);

  const docExists = userDoc.exists();
  let userData = docExists ? (userDoc.data() as AppUser) : null;
  const lifecycle = determineAccountLifecycleState(docExists, userData);
  if ((!userData || userData.role === "student") && !isManilaStudentEmail(user.email)) {
    await signOut(auth);
    throw new Error(MANILA_EMAIL_MESSAGE);
  }

  if (lifecycle === "DELETED_REMOVED") {
    await signOut(auth);
    throw new Error(ACCOUNT_REMOVED_MSG);
  }

  if (lifecycle === "DISABLED_PAUSED") {
    await signOut(auth);
    throw new Error(ACCOUNT_PAUSED_MSG);
  }

  if (lifecycle === "MISSING_PROFILE" || !userData) {
    if (typeof user.getIdToken === "function") {
      await user.getIdToken(true);
    }
    const recoveredProfile: AppUser = {
      uid: user.uid,
      email: normalizedEmail,
      fullName: user.displayName?.trim() || "TIP Student",
      role: "student",
      isProfileComplete: false,
      accountState: "ACTIVE",
      isDeleted: false,
      isDisabled: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      hasCompletedOnboarding: false,
      hasCompletedInitialSetup: false,
      college: "",
      degreeProgram: "",
      targetPosition: "",
      acceptedTerms: false,
      acceptedPrivacy: false,
      termsVersion: "",
      privacyVersion: "",
      activeResumeId: null,
    };
    try {
      userData = await createProfileTransaction(user.uid, recoveredProfile);
    } catch (profileErr: any) {
      console.warn("Failed to recover missing profile during login:", profileErr);
      await signOut(auth);
      throw new Error(ACCOUNT_MISSING_PROFILE_MSG);
    }
  }

  return userData as AppUser;
};

/**
 * Resend the Firebase email verification to the currently authenticated user.
 * Called when a user logs in but their email is not yet verified.
 * Signs out after sending so unverified users don't remain authenticated.
 */
export const resendVerificationEmail = async (): Promise<void> => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No authenticated user found. Please log in again.");
  }

  await sendEmailVerification(user);

  await signOut(auth);
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const resetUserPassword = async (email: string): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isTipEmail(normalizedEmail)) {
    throw new Error("Only TIP email addresses are allowed.");
  }

  await sendPasswordResetEmail(auth, normalizedEmail);
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No authenticated user session found.");
  }

  const valResult = validatePassword(newPassword);
  if (!valResult.isValid) {
    throw new Error(valResult.message);
  }

  // Reauthenticate with current credential before changing password
  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  } catch (reauthErr: any) {
    console.error("[AUTH][PASSWORD_CHANGE][REAUTH_FAILED]", reauthErr?.code || reauthErr);
    throw new Error("Incorrect current password. Please verify your current password and try again.");
  }

  await updatePassword(user, newPassword);
};
