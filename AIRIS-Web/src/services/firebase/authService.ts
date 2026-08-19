import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { AdminUser } from "../../types/auth.types";
import { logAuditEvent } from "./auditService";

const USERS_COLLECTION = "users";

/**
 * Signs in an admin user using email and password.
 * Checks the user's role in the database to ensure they are an administrator.
 */
export async function signInAdmin(email: string, password: string): Promise<AdminUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Retrieve user document to verify admin permissions
  const userDocRef = doc(db, USERS_COLLECTION, user.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    await firebaseSignOut(auth);
    throw new Error("Access Denied: Account not found in our database.");
  }

  const userData = userDocSnap.data();

  if (userData.role !== "admin") {
    await firebaseSignOut(auth);
    throw new Error("Access Denied: You do not have administrator privileges.");
  }

  const adminUser: AdminUser = {
    uid: user.uid,
    email: user.email ?? email,
    fullName: userData.fullName || "Administrator",
    role: "admin",
    createdAt: userData.createdAt,
    updatedAt: userData.updatedAt,
  };

  await logAuditEvent("AdminLogin", `Administrator ${adminUser.fullName} logged in successfully.`, adminUser.fullName);

  return adminUser;
}

/**
 * Dispatches a password reset link to the specified admin email.
 * First verifies if the email corresponds to an active administrator account in Firestore.
 */
export async function sendAdminPasswordReset(email: string): Promise<void> {
  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(usersRef, where("email", "==", email));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("Access Denied: Account not found in our database.");
  }

  let isAdmin = false;
  querySnapshot.forEach((doc) => {
    if (doc.data().role === "admin") {
      isAdmin = true;
    }
  });

  if (!isAdmin) {
    throw new Error("Access Denied: You do not have administrator privileges.");
  }

  await sendPasswordResetEmail(auth, email);
}

/**
 * Signs out the current admin session.
 */
export async function signOutAdmin(adminName: string): Promise<void> {
  await logAuditEvent("AuthenticationEvents", `Administrator ${adminName} logged out.`, adminName);
  await firebaseSignOut(auth);
}

/**
 * Subscribes to Firebase Authentication state updates.
 * Loads the user profile details if they are authenticated and authorized as an admin.
 */
export function subscribeToAuthState(callback: (admin: AdminUser | null) => void): () => void {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (!user) {
      callback(null);
      return;
    }

    try {
      const userDocRef = doc(db, USERS_COLLECTION, user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists() && userDocSnap.data().role === "admin") {
        const userData = userDocSnap.data();
        callback({
          uid: user.uid,
          email: user.email ?? "",
          fullName: userData.fullName || "Administrator",
          role: "admin",
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        });
      } else {
        callback(null);
      }
    } catch {
      callback(null);
    }
  });
}
