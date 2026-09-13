import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";

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

  if (!isTipEmail(normalizedEmail)) {
    throw new Error("Only TIP email addresses are allowed.");
  }

  const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

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

  await setDoc(doc(db, USERS_COLLECTION, user.uid), newUser);

  await sendEmailVerification(user);

  await signOut(auth);

  return newUser;
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
  const userData = docExists ? (userDoc.data() as AppUser) : null;
  const lifecycle = determineAccountLifecycleState(docExists, userData);

  if (lifecycle === "DELETED_REMOVED") {
    await signOut(auth);
    throw new Error(ACCOUNT_REMOVED_MSG);
  }

  if (lifecycle === "DISABLED_PAUSED") {
    await signOut(auth);
    throw new Error(ACCOUNT_PAUSED_MSG);
  }

  if (lifecycle === "MISSING_PROFILE" || !userData) {
    await signOut(auth);
    throw new Error(ACCOUNT_MISSING_PROFILE_MSG);
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
