import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { AdminUser, AdminRole } from "../../types/auth.types";
import { logAuditEvent } from "./auditService";

const USERS_COLLECTION = "users";
const ALLOWED_ADMIN_ROLES: AdminRole[] = ["admin", "career_center", "ojt_coordinator"];

function isInstitutionalEmail(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  // Exact domain validation only — no substring matching
  return (
    normalized.endsWith("@tip.edu.ph") ||
    normalized.endsWith("@airis.edu.ph")
  );
}

/**
 * Signs in an administrative user (System Admin, Career Center, or OJT Coordinator).
 * Checks the user's role in Firestore and enforces institutional identity requirements.
 */
export async function signInAdmin(email: string, password: string): Promise<AdminUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Retrieve user document to verify admin / staff permissions
  const userDocRef = doc(db, USERS_COLLECTION, user.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists() || userDocSnap.data().isDisabled === true) {
    await firebaseSignOut(auth);
    throw new Error("Your account has been paused or disabled by the administrator.");
  }

  const userData = userDocSnap.data();
  const userRole = userData.role as AdminRole;

  if (!ALLOWED_ADMIN_ROLES.includes(userRole)) {
    await firebaseSignOut(auth);
    throw new Error("Access Denied: You do not have administrator or staff privileges.");
  }

  // Institutional email validation per September 11 Career Center MOM
  const userEmail = user.email ?? email;
  if ((userRole === "career_center" || userRole === "ojt_coordinator") && !isInstitutionalEmail(userEmail)) {
    await firebaseSignOut(auth);
    throw new Error("Access Denied: Career Center and OJT Coordinator accounts require an authorized institutional (@tip.edu.ph) email.");
  }

  const adminUser: AdminUser = {
    uid: user.uid,
    email: userEmail,
    fullName: userData.fullName || "Staff Member",
    role: userRole,
    assignedProgram: userData.assignedProgram,
    createdAt: userData.createdAt,
    updatedAt: userData.updatedAt,
  };

  await logAuditEvent({
    action: "AdminLogin",
    details: `${adminUser.role.toUpperCase()} ${adminUser.fullName} (${adminUser.email}) authenticated successfully.`,
    actor: adminUser.fullName,
    actorId: adminUser.uid,
    role: adminUser.role,
    target: "AdminWeb",
    result: "SUCCESS",
  });

  return adminUser;
}

/**
 * Dispatches a password reset link to the specified staff/admin email.
 * First verifies if the email corresponds to an active authorized account in Firestore.
 */
export async function sendAdminPasswordReset(email: string): Promise<void> {
  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(usersRef, where("email", "==", email));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error("Access Denied: Account not found in our database.");
  }

  let isAuthorized = false;
  querySnapshot.forEach((docSnap) => {
    const role = docSnap.data().role as AdminRole;
    if (ALLOWED_ADMIN_ROLES.includes(role)) {
      isAuthorized = true;
    }
  });

  if (!isAuthorized) {
    throw new Error("Access Denied: You do not have administrator privileges.");
  }

  await sendPasswordResetEmail(auth, email);
}

/**
 * Signs out the current admin/staff session.
 */
export async function signOutAdmin(admin: AdminUser): Promise<void> {
  await logAuditEvent({
    action: "AdminLogout",
    details: `${admin.role.toUpperCase()} ${admin.fullName} signed out.`,
    actor: admin.fullName,
    actorId: admin.uid,
    role: admin.role,
    target: "AdminWeb",
    result: "SUCCESS",
  });
  await firebaseSignOut(auth);
}

/**
 * Subscribes to Firebase Authentication state updates.
 * Loads the user profile details if they are authenticated and authorized as staff or admin.
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

      if (userDocSnap.exists() && !userDocSnap.data().isDisabled) {
        const userData = userDocSnap.data();
        const role = userData.role as AdminRole;

        if (ALLOWED_ADMIN_ROLES.includes(role)) {
          // Enforce institutional email validation for privileged roles
          const userEmail = user.email ?? "";
          if ((role === "career_center" || role === "ojt_coordinator") && !isInstitutionalEmail(userEmail)) {
            await firebaseSignOut(auth);
            callback(null);
            return;
          }

          callback({
            uid: user.uid,
            email: userEmail,
            fullName: userData.fullName || "Staff Member",
            role,
            assignedProgram: userData.assignedProgram,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt,
          });
          return;
        }
      }

      await firebaseSignOut(auth);
      callback(null);
    } catch {
      callback(null);
    }
  });
}
