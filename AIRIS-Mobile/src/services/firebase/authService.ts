import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "../../config/firebase";
import type { AppUser } from "../../types/user.types";

const USERS_COLLECTION = "users";

export class EmailNotVerifiedError extends Error {
  constructor(message = "Please verify your TIP email before logging in.") {
    super(message);
    this.name = "EmailNotVerifiedError";
  }
}

export const getUserById = async (uid: string): Promise<AppUser | null> => {
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));

  if (!userDoc.exists()) {
    return null;
  }

  return userDoc.data() as AppUser;
};

const isTipEmail = (email: string) => {
  return email.trim().toLowerCase().endsWith("@tip.edu.ph");
};

/**
 * Register a new student account.
 * 1. Creates Firebase Auth account.
 * 2. Sends Firebase email verification.
 * 3. Creates Firestore users/{uid} document.
 * 4. Signs out immediately — user must verify email before first login.
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

  await sendEmailVerification(user);

  const newUser: AppUser = {
    uid: user.uid,
    email: user.email ?? normalizedEmail,
    fullName: fullName.trim(),
    role: "student",
    isProfileComplete: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    hasCompletedOnboarding: false,
    hasCompletedInitialSetup: false,
  };

  await setDoc(doc(db, USERS_COLLECTION, user.uid), newUser);

  await signOut(auth);

  return newUser;
};

/**
 * Login an existing user.
 * 1. Signs in with email/password.
 * 2. Reloads the Firebase user to get fresh emailVerified status.
 * 3. If email is not verified, throws EmailNotVerifiedError (UI shows modal).
 * 4. If verified, reads the Firestore user document and returns it.
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

  const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));

  if (!userDoc.exists()) {
    await signOut(auth);
    throw new Error("User record not found.");
  }

  return userDoc.data() as AppUser;
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

export const changePassword = async (newPassword: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No authenticated user found.");
  }
  await updatePassword(user, newPassword);
};
