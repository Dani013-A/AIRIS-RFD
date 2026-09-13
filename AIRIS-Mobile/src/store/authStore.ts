import { create } from "zustand";
import { Alert } from "react-native";

import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
  getAdditionalUserInfo,
  deleteUser,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";

import {
  EmailNotVerifiedError,
  loginUser,
  logoutUser,
  registerStudent,
  resendVerificationEmail,
  getUserById,
  resetUserPassword,
  changePassword,
} from "../services/firebase/authService";
import type { AppUser } from "../types/user.types";

import {
  completeInitialSetup,
  completeUserOnboardingWithConsents,
  updateCollegeSelection,
  updateProgramSelection,
  updateAcceptedConsents,
  updateHasUploadedResume,
  createProfileTransaction,
  updateProfileDetails,
} from "../services/firebase/userService";
import { useOnboardingStore } from "./onboardingStore";
import { clearLearningMemoryCache } from "../services/learning/learningCatalogService";
import { mapAuthError, sanitizeErrorForLogging } from "../utils/errorMapper";

import {
  determineAccountLifecycleState,
  AccountLifecycleState,
  AuthTransactionState,
  ACCOUNT_PAUSED_MSG,
  ACCOUNT_REMOVED_MSG,
  ACCOUNT_MISSING_PROFILE_MSG,
  MSG_PROFILE_INIT_FAILED,
} from "../utils/accountLifecycle";

export {
  determineAccountLifecycleState,
  AccountLifecycleState,
  AuthTransactionState,
  ACCOUNT_PAUSED_MSG,
  ACCOUNT_REMOVED_MSG,
  ACCOUNT_MISSING_PROFILE_MSG,
  MSG_PROFILE_INIT_FAILED,
};

// Backward-compatibility constant for tests and external callers
export const ACCOUNT_SUSPENDED_OR_DELETED_MSG = ACCOUNT_PAUSED_MSG;

let GoogleSignin: any = null;
let statusCodes: any = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const googleModule = require("@react-native-google-signin/google-signin");
  GoogleSignin = googleModule.GoogleSignin;
  statusCodes = googleModule.statusCodes;
} catch {
  // Handle simulation environments.
}

let isLoggingOutDueToSuspension = false;
let userDocUnsubscribe: (() => void) | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function stopUserRealtimeListener() {
  if (userDocUnsubscribe) {
    userDocUnsubscribe();
    userDocUnsubscribe = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

export async function handleAccountTermination(
  reason: "DISABLED_PAUSED" | "DELETED_REMOVED",
  customSet?: (state: Partial<AuthState> | ((prev: AuthState) => Partial<AuthState>)) => void
) {
  if (isLoggingOutDueToSuspension) return;
  isLoggingOutDueToSuspension = true;

  stopUserRealtimeListener();

  let title = "Account Inactive";
  let message = ACCOUNT_PAUSED_MSG;

  if (reason === "DELETED_REMOVED") {
    title = "Account Removed";
    message = ACCOUNT_REMOVED_MSG;
  }

  try {
    await signOut(auth).catch(() => {});
    if (GoogleSignin) {
      await GoogleSignin.signOut().catch(() => {});
    }
  } catch (err) {
    console.warn("SignOut error during account lifecycle cleanup:", err);
  } finally {
    useOnboardingStore.getState().reset();
    try {
      clearLearningMemoryCache();
    } catch {}

    const updater = customSet || useAuthStore.setState;
    updater({
      currentUser: null,
      loading: false,
      isGoogleLoading: false,
      authTransactionState: "FAILED",
      error: message,
      registrationSuccess: false,
      emailNotVerified: false,
    });

    try {
      Alert.alert(
        title,
        message,
        [{ text: "OK" }],
        { cancelable: false }
      );
    } catch (alertErr) {
      console.warn("Could not display Alert:", alertErr);
    }

    isLoggingOutDueToSuspension = false;
  }
}

export async function handleAccountSuspendedOrDeleted(
  customSet?: (state: Partial<AuthState> | ((prev: AuthState) => Partial<AuthState>)) => void
) {
  return handleAccountTermination("DISABLED_PAUSED", customSet);
}

export function startUserRealtimeListener(uid: string) {
  stopUserRealtimeListener();
  if (!uid) return;

  try {
    const userDocRef = doc(db, "users", uid);
    userDocUnsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        const lifecycle = determineAccountLifecycleState(snapshot.exists(), snapshot.data() as AppUser);
        if (lifecycle === "DELETED_REMOVED") {
          console.warn(`[AUTH] User document for ${uid} is marked deleted in Firestore. Logging out immediately.`);
          handleAccountTermination("DELETED_REMOVED");
          return;
        }
        if (lifecycle === "DISABLED_PAUSED") {
          console.warn(`[AUTH] User document for ${uid} is disabled/paused in Firestore. Logging out immediately.`);
          handleAccountTermination("DISABLED_PAUSED");
          return;
        }
      },
      (err) => {
        if (err?.code === "permission-denied") {
          handleAccountTermination("DISABLED_PAUSED");
        }
      }
    );
  } catch (listenerErr) {
    console.warn("Failed to attach Firestore user onSnapshot listener:", listenerErr);
  }

  // Heartbeat check for Firebase Auth user deletion/disabling
  heartbeatInterval = setInterval(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await user.reload();
    } catch (err: any) {
      const code = err?.code || "";
      const str = String(err || "");
      if (
        code === "auth/user-not-found" ||
        code === "auth/user-disabled" ||
        str.includes("user-not-found") ||
        str.includes("user-disabled")
      ) {
        console.warn(`[AUTH] Heartbeat detected user ${user.uid} was deleted/disabled in Firebase Auth.`);
        handleAccountSuspendedOrDeleted();
      }
    }
  }, 5000);
}

interface AuthState {
  currentUser: AppUser | null;
  loading: boolean;
  isGoogleLoading: boolean;
  isInitialized: boolean;
  isRegistering: boolean;
  authTransactionState: AuthTransactionState;
  setAuthTransactionState: (state: AuthTransactionState) => void;
  error: string | null;

  registrationSuccess: boolean;

  emailNotVerified: boolean;
  passwordResetSuccess: boolean;

  initializeAuth: () => () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resendVerification: () => Promise<void>;
  clearError: () => void;
  clearRegistrationSuccess: () => void;
  clearEmailNotVerified: () => void;
  sendPasswordReset: (email: string) => Promise<void>;
  clearPasswordResetSuccess: () => void;
  updateProfile: (fullName: string, college: string, degreeProgram: string, targetPosition: string) => Promise<void>;
  updatePasswordAction: (currentPassword: string, newPassword: string) => Promise<void>;
  completeOnboarding: (
    acceptedTerms: boolean,
    acceptedPrivacy: boolean,
    termsVersion: string,
    privacyVersion: string
  ) => Promise<void>;
  completeInitialSetup: (
    college: string,
    degreeProgram: string,
    targetPosition: string,
  ) => Promise<void>;
  saveCollegeSelection: (college: string) => Promise<void>;
  saveProgramSelection: (degreeProgram: string) => Promise<void>;
  saveAcceptedConsents: (
    acceptedTerms: boolean,
    acceptedPrivacy: boolean,
    termsVersion: string,
    privacyVersion: string
  ) => Promise<void>;
  saveHasUploadedResume: (uploaded: boolean) => Promise<void>;
  saveProductTourCompletion: (completed: boolean) => Promise<void>;
  updateProfilePhotoAction: () => Promise<boolean>;
  deleteAccountAction: (currentPassword?: string) => Promise<void>;
  checkSessionValidity: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  loading: true,
  isGoogleLoading: false,
  isInitialized: false,
  isRegistering: false,
  authTransactionState: "IDLE",
  setAuthTransactionState: (authTransactionState) => set({ authTransactionState }),
  error: null,
  registrationSuccess: false,
  emailNotVerified: false,
  passwordResetSuccess: false,

  login: async (email, password) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      set({ authTransactionState: "AUTHENTICATING", loading: true, error: null, emailNotVerified: false });

      const user = await loginUser(normalizedEmail, password);
      startUserRealtimeListener(user.uid);

      set({
        currentUser: user,
        authTransactionState: "COMPLETED",
        loading: false,
        error: null,
        emailNotVerified: false,
      });
    } catch (error) {
      if (error instanceof EmailNotVerifiedError) {
        set({
          currentUser: null,
          authTransactionState: "FAILED",
          loading: false,
          error: null,
          emailNotVerified: true,
        });
        return;
      }

      set({
        currentUser: null,
        authTransactionState: "FAILED",
        loading: false,
        error: mapAuthError(error),
        emailNotVerified: false,
      });
    }
  },

  register: async (email, password, fullName) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      set({
        authTransactionState: "AUTHENTICATING",
        loading: true,
        error: null,
        registrationSuccess: false,
        isRegistering: true,
      });

      await registerStudent(normalizedEmail, password, fullName);

      set({
        currentUser: null,
        authTransactionState: "COMPLETED",
        loading: false,
        error: null,
        registrationSuccess: true,
        isRegistering: false,
      });
    } catch (error) {
      set({
        currentUser: null,
        authTransactionState: "FAILED",
        loading: false,
        registrationSuccess: false,
        error: mapAuthError(error),
        isRegistering: false,
      });
    }
  },

  loginWithGoogle: async () => {
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!webClientId) {
      console.error("[AUTH][CONFIG] Google Sign-In is not configured: Client ID is missing.");
      const err = new Error("Google Sign-In is currently unavailable. Please try again later.");
      set({ error: err.message, isGoogleLoading: false, authTransactionState: "FAILED" });
      throw err;
    }

    set({ authTransactionState: "AUTHENTICATING", isGoogleLoading: true, error: null, isRegistering: true });
    let firebaseSessionCreated = false;

    const clearAuthSessionSafely = async () => {
      try {
        await signOut(auth);
        try {
          if (GoogleSignin) {
            await GoogleSignin.signOut();
          }
        } catch (googleErr) {
          console.warn("Google Sign-In signOut failed during session cleanup:", sanitizeErrorForLogging(googleErr));
        }
      } catch (err) {
        console.warn(
          "Cleanup error during failed Google authentication:",
          sanitizeErrorForLogging(err)
        );
      } finally {
        useOnboardingStore.getState().reset();
        set({
          currentUser: null,
          loading: false,
          isRegistering: false,
        });
      }
    };

    try {
      if (GoogleSignin) {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      } else {
        throw new Error(
          "Google Sign-In is not supported in this environment (e.g. Expo Go). Please run a native development build instead."
        );
      }

      const userInfo = await GoogleSignin.signIn();
      if (userInfo.type !== "success") {
        set({ authTransactionState: "IDLE", isRegistering: false });
        return;
      }
      const idToken = userInfo.data.idToken;

      if (!idToken) {
        throw new Error("Failed to obtain Google ID Token.");
      }

      const credential = GoogleAuthProvider.credential(idToken);

      const userCredential = await signInWithCredential(auth, credential);
      firebaseSessionCreated = true;
      const firebaseUser = userCredential.user;

      if (!firebaseUser || !firebaseUser.email) {
        throw new Error("No user email was returned by Google authentication.");
      }

      const emailLower = firebaseUser.email.trim().toLowerCase();

      // Validate school domain email.
      if (!firebaseUser.emailVerified || !emailLower.endsWith("@tip.edu.ph")) {
        const isNewUser = getAdditionalUserInfo(userCredential)?.isNewUser;
        if (isNewUser) {
          try {
            await deleteUser(firebaseUser);
          } catch (deleteErr) {
            console.warn("Failed to delete newly created invalid Firebase Auth user:", sanitizeErrorForLogging(deleteErr));
          }
        }
        await clearAuthSessionSafely();
        const err = new Error(
          "Please use your official @tip.edu.ph account."
        );
        set({ error: err.message, authTransactionState: "FAILED" });
        throw err;
      }

      // Synchronize auth state: force ID token generation to ensure Firestore internal auth credentials provider has the token.
      set({ authTransactionState: "INITIALIZING_PROFILE" });
      if (typeof firebaseUser.getIdToken === "function") {
        await firebaseUser.getIdToken(true);
      }

      const existingProfile = await getUserById(firebaseUser.uid);
      if (existingProfile) {
        const lifecycle = determineAccountLifecycleState(true, existingProfile);
        if (lifecycle === "DELETED_REMOVED") {
          await clearAuthSessionSafely();
          set({ error: ACCOUNT_REMOVED_MSG, authTransactionState: "FAILED" });
          throw new Error(ACCOUNT_REMOVED_MSG);
        }
        if (lifecycle === "DISABLED_PAUSED") {
          await clearAuthSessionSafely();
          set({ error: ACCOUNT_PAUSED_MSG, authTransactionState: "FAILED" });
          throw new Error(ACCOUNT_PAUSED_MSG);
        }
        startUserRealtimeListener(firebaseUser.uid);
        set({
          currentUser: existingProfile,
          authTransactionState: "COMPLETED",
          loading: false,
          isGoogleLoading: false,
          isRegistering: false,
          error: null,
        });
        return;
      }

      const newProfile: AppUser = {
        uid: firebaseUser.uid,
        email: emailLower,
        fullName: firebaseUser.displayName?.trim() || "TIP Student",
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

      let activeProfile: AppUser;
      try {
        activeProfile = await createProfileTransaction(firebaseUser.uid, newProfile);
      } catch (dbErr: any) {
        await clearAuthSessionSafely();
        throw dbErr;
      }

      startUserRealtimeListener(firebaseUser.uid);
      set({
        currentUser: activeProfile,
        authTransactionState: "COMPLETED",
        loading: false,
        isGoogleLoading: false,
        isRegistering: false,
        error: null,
      });
    } catch (error: unknown) {
      const errorCode =
        error && typeof error === "object" && "code" in error
          ? (error as { code: unknown }).code
          : undefined;

      if (errorCode === statusCodes.SIGN_IN_CANCELLED) {
        set({ authTransactionState: "IDLE", isRegistering: false });
        return;
      }
      if (errorCode === statusCodes.IN_PROGRESS) {
        return;
      }
      if (errorCode === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        set({
          error: "Google Play Services are not available or outdated on this device.",
          authTransactionState: "FAILED",
          isRegistering: false,
        });
        return;
      }

      if (firebaseSessionCreated) {
        await clearAuthSessionSafely();
      }

      const friendlyMsg = mapAuthError(error);
      set({
        error: friendlyMsg,
        authTransactionState: "FAILED",
        isRegistering: false,
      });
      throw new Error(friendlyMsg);
    } finally {
      set({ isGoogleLoading: false });
    }
  },

  logout: async () => {
    stopUserRealtimeListener();
    set({ loading: true, error: null, authTransactionState: "IDLE" });
    try {
      await logoutUser();
      try {
        await GoogleSignin.signOut();
      } catch (googleErr) {
        console.warn("Google Sign-In signOut failed during logout:", sanitizeErrorForLogging(googleErr));
      }
    } catch (error) {
      console.warn(
        "Firebase logoutUser threw an error; cleaning up local store anyway:",
        sanitizeErrorForLogging(error)
      );
    } finally {
      useOnboardingStore.getState().reset();
      try {
        clearLearningMemoryCache();
      } catch (learningCacheErr) {
        console.warn("Failed to clear learning cache on logout:", learningCacheErr);
      }
      set({
        currentUser: null,
        loading: false,
        isGoogleLoading: false,
        authTransactionState: "IDLE",
        error: null,
        registrationSuccess: false,
        emailNotVerified: false,
      });
    }
  },

  /**
   * Resend Firebase verification email to the currently authenticated (but unverified) user.
   * The service function signs out after sending.
   */
  resendVerification: async () => {
    try {
      set({ loading: true, error: null });

      await resendVerificationEmail();

      set({
        loading: false,
        error: null,
        emailNotVerified: false,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to resend verification email.",
      });
    }
  },

  /**
   * Session persistence handler.
   * On app launch, Firebase restores the auth state from AsyncStorage.
   * - If no user -> stay on login.
   * - If user exists but email not verified -> sign out and go to login.
   * - If user exists and verified -> load Firestore profile and let the route guard handle navigation.
   */
  initializeAuth: () => {
    set({ loading: true, isInitialized: false });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const state = useAuthStore.getState();
      if (
        state.authTransactionState === "AUTHENTICATING" ||
        state.authTransactionState === "INITIALIZING_PROFILE" ||
        state.isRegistering
      ) {
        return;
      }

      if (!firebaseUser) {
        stopUserRealtimeListener();
        set({
          currentUser: null,
          loading: false,
          isInitialized: true,
          error: null,
        });
        return;
      }

      try {
        await firebaseUser.reload();

        if (!firebaseUser.emailVerified) {
          stopUserRealtimeListener();
          await signOut(auth);
          set({
            currentUser: null,
            loading: false,
            isInitialized: true,
            error: null,
          });
          return;
        }

        const appUser = await getUserById(firebaseUser.uid);
        const lifecycle = determineAccountLifecycleState(!!appUser, appUser);

        if (lifecycle === "DELETED_REMOVED") {
          await handleAccountTermination("DELETED_REMOVED", set);
          return;
        }
        if (lifecycle === "DISABLED_PAUSED") {
          await handleAccountTermination("DISABLED_PAUSED", set);
          return;
        }

        if (lifecycle === "MISSING_PROFILE" || !appUser) {
          const email = firebaseUser.email?.trim().toLowerCase() || "";
          if (email.endsWith("@tip.edu.ph")) {
            const recoveredProfile: AppUser = {
              uid: firebaseUser.uid,
              email: email,
              fullName: firebaseUser.displayName?.trim() || "TIP Student",
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
              await firebaseUser.getIdToken(true);
              const activeProfile = await createProfileTransaction(firebaseUser.uid, recoveredProfile);
              startUserRealtimeListener(firebaseUser.uid);
              set({
                currentUser: activeProfile,
                loading: false,
                isInitialized: true,
                error: null,
              });
              return;
            } catch (recoveryErr: any) {
              if (recoveryErr?.message === ACCOUNT_REMOVED_MSG) {
                await handleAccountTermination("DELETED_REMOVED", set);
                return;
              }
              if (recoveryErr?.message === ACCOUNT_PAUSED_MSG) {
                await handleAccountTermination("DISABLED_PAUSED", set);
                return;
              }
              set({
                currentUser: null,
                loading: false,
                isInitialized: true,
                error: MSG_PROFILE_INIT_FAILED,
              });
              return;
            }
          } else {
            await signOut(auth);
            set({
              currentUser: null,
              loading: false,
              isInitialized: true,
              error: "Please use your official @tip.edu.ph account.",
            });
            return;
          }
        }

        startUserRealtimeListener(firebaseUser.uid);
        set({
          currentUser: appUser,
          loading: false,
          isInitialized: true,
          error: null,
        });
      } catch (err: any) {
        const errCode = err?.code || "";
        const errStr = String(err || "");
        if (
          errCode === "auth/user-not-found" ||
          errCode === "auth/user-disabled" ||
          errStr.includes("user-not-found") ||
          errStr.includes("user-disabled")
        ) {
          console.warn("[AUTH] User deleted or disabled in Firebase Auth on reload");
          await handleAccountTermination(errCode === "auth/user-disabled" ? "DISABLED_PAUSED" : "DELETED_REMOVED", set);
          return;
        }

        if (
          errCode === "auth/network-request-failed" ||
          errCode === "auth/timeout" ||
          errStr.includes("network-request-failed") ||
          errStr.includes("Network Error")
        ) {
          console.warn("Auth initialization encountered a transient network error; preserving current session state:", errStr);
          set({ loading: false, isInitialized: true });
          return;
        }

        console.error("Auth initialization error during session load:", sanitizeErrorForLogging(err));
        stopUserRealtimeListener();
        try {
          await signOut(auth);
        } catch (signOutErr) {
          console.error("SignOut failed during initialization recovery:", sanitizeErrorForLogging(signOutErr));
        }
        set({
          currentUser: null,
          loading: false,
          isInitialized: true,
          error: MSG_PROFILE_INIT_FAILED,
        });
      }
    });

    return () => {
      unsubscribe();
      stopUserRealtimeListener();
    };
  },

  clearError: () => {
    set({ error: null });
  },

  clearRegistrationSuccess: () => {
    set({ registrationSuccess: false });
  },

  clearEmailNotVerified: () => {
    set({ emailNotVerified: false });
  },

  sendPasswordReset: async (email) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      set({ loading: true, error: null, passwordResetSuccess: false });

      await resetUserPassword(normalizedEmail);

      set({
        loading: false,
        error: null,
        passwordResetSuccess: true,
      });
    } catch (error) {
      set({
        loading: false,
        passwordResetSuccess: false,
        error: mapAuthError(error),
      });
      throw error;
    }
  },

  clearPasswordResetSuccess: () => {
    set({ passwordResetSuccess: false });
  },

  updateProfile: async (fullName, college, degreeProgram, targetPosition) => {
    const currentUser = useAuthStore.getState().currentUser;
    if (!currentUser) {
      const err = new Error("No user is currently signed in.");
      set({ error: err.message });
      throw err;
    }

    try {
      set({ loading: true, error: null });

      await updateProfileDetails(
        currentUser.uid,
        fullName,
        college,
        degreeProgram,
        targetPosition
      );

      set({
        currentUser: {
          ...currentUser,
          fullName: fullName.trim(),
          college,
          degreeProgram,
          targetPosition,
        },
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to update profile.",
      });
      throw error;
    }
  },

  updateProfilePhotoAction: async () => {
    const currentUser = useAuthStore.getState().currentUser;
    if (!currentUser) {
      const err = new Error("No user is currently signed in.");
      set({ error: err.message });
      throw err;
    }

    try {
      set({ loading: true, error: null });
      const { pickAndUploadProfilePhoto } = await import("../services/firebase/profilePhotoService");
      const result = await pickAndUploadProfilePhoto(currentUser.uid);

      if (result.success && result.photoURL) {
        set({
          currentUser: {
            ...currentUser,
            photoURL: result.photoURL,
          },
          loading: false,
          error: null,
        });
        return true;
      } else {
        set({
          loading: false,
          error: result.message || "Failed to update profile photo.",
        });
        return false;
      }
    } catch (error) {
      set({
        loading: false,
        error: mapAuthError(error),
      });
      return false;
    }
  },

  updatePasswordAction: async (currentPassword, newPassword) => {
    try {
      set({ loading: true, error: null });

      await changePassword(currentPassword, newPassword);

      set({
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        loading: false,
        error: mapAuthError(error),
      });
      throw error;
    }
  },

  deleteAccountAction: async (currentPassword) => {
    const currentUser = useAuthStore.getState().currentUser;
    const activeUid = currentUser?.uid || auth.currentUser?.uid;

    try {
      set({ loading: true, error: null });
      console.log(`[AUTH][ACCOUNT_DELETE][CONFIRM] User confirmed account deletion request for UID: ${activeUid}`);

      // Reauthenticate FIRST if password is provided and Firebase Auth user exists
      if (auth.currentUser && auth.currentUser.email && currentPassword) {
        console.log(`[AUTH][ACCOUNT_DELETE][REAUTH_START] Attempting credential reauthentication...`);
        const { EmailAuthProvider, reauthenticateWithCredential } = await import("firebase/auth");
        const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, cred);
        console.log(`[AUTH][ACCOUNT_DELETE][REAUTH_SUCCESS] Credential reauthentication succeeded.`);
      }

      if (activeUid) {
        const { deleteUserAccountCascade } = await import("../services/firebase/userService");
        await deleteUserAccountCascade(activeUid);
      }

      // Execute full logout & store reset
      await useAuthStore.getState().logout();
      console.log(`[AUTH][ACCOUNT_DELETE][SUCCESS] Account deletion complete and local session cleared.`);
    } catch (error: any) {
      const errCode = error?.code || "";
      if (errCode === "auth/user-not-found" || errCode === "auth/null-user" || String(error).includes("user-not-found")) {
        console.warn(`[AUTH][ACCOUNT_DELETE][INFO] Account already removed from server, forcing local logout.`);
        await useAuthStore.getState().logout();
        return;
      }

      if (errCode === "auth/requires-recent-login" || String(error).includes("requires-recent-login")) {
        console.warn(`[AUTH][ACCOUNT_DELETE][REAUTH_REQUIRED] Reauthentication required for sensitive account deletion operation.`);
      } else {
        console.error(`[AUTH][ACCOUNT_DELETE][ERROR]`, error?.code || error?.message || error);
      }

      const userMsg = mapAuthError(error);
      set({
        loading: false,
        error: userMsg,
      });
      throw error;
    }
  },

  completeOnboarding: async (
    acceptedTerms: boolean,
    acceptedPrivacy: boolean,
    termsVersion: string,
    privacyVersion: string
  ) => {
    const currentUser = useAuthStore.getState().currentUser;

    if (!currentUser) {
      const err = new Error("No user is currently signed in.");
      set({ error: err.message });
      throw err;
    }

    if (acceptedTerms !== true || acceptedPrivacy !== true) {
      const err = new Error("Please accept both Terms of Service and Privacy Policy to proceed.");
      set({ error: err.message });
      throw err;
    }

    try {
      set({ loading: true, error: null });

      await completeUserOnboardingWithConsents(
        currentUser.uid,
        acceptedTerms,
        acceptedPrivacy,
        termsVersion,
        privacyVersion
      );

      set({
        currentUser: {
          ...currentUser,
          acceptedTerms,
          acceptedPrivacy,
          termsVersion,
          privacyVersion,
          hasCompletedOnboarding: true,
          isProfileComplete: true,
        },
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to complete onboarding.",
      });
      throw error;
    }
  },

  completeInitialSetup: async (college: string, degreeProgram: string, targetPosition: string) => {
    const currentUser = useAuthStore.getState().currentUser;

    if (!currentUser) {
      const err = new Error("No user is currently signed in to complete profile setup.");
      set({ error: err.message });
      throw err;
    }

    try {
      set({ loading: true, error: null });

      await completeInitialSetup(currentUser.uid, college, degreeProgram, targetPosition);

      set({
        currentUser: {
          ...currentUser,
          college,
          degreeProgram,
          targetPosition,
          hasCompletedInitialSetup: true,
        },
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to complete initial setup.",
      });
      throw error;
    }
  },

  saveCollegeSelection: async (college: string) => {
    const currentUser = useAuthStore.getState().currentUser;

    if (!currentUser) {
      const err = new Error("No user is currently signed in to save college selection.");
      set({ error: err.message });
      throw err;
    }

    try {
      set({ loading: true, error: null });

      await updateCollegeSelection(currentUser.uid, college);

      set({
        currentUser: {
          ...currentUser,
          college,
          degreeProgram: "",
          targetPosition: "",
          hasCompletedInitialSetup: false,
        },
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to save college selection.",
      });
      throw error;
    }
  },

  saveProgramSelection: async (degreeProgram: string) => {
    const currentUser = useAuthStore.getState().currentUser;

    if (!currentUser) {
      const err = new Error("No user is currently signed in to save program selection.");
      set({ error: err.message });
      throw err;
    }

    try {
      set({ loading: true, error: null });

      await updateProgramSelection(currentUser.uid, degreeProgram);

      set({
        currentUser: {
          ...currentUser,
          degreeProgram,
          targetPosition: "",
          hasCompletedInitialSetup: false,
        },
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to save program selection.",
      });
      throw error;
    }
  },

  saveAcceptedConsents: async (
    acceptedTerms: boolean,
    acceptedPrivacy: boolean,
    termsVersion: string,
    privacyVersion: string
  ) => {
    const currentUser = useAuthStore.getState().currentUser;

    if (!currentUser) {
      const err = new Error("No user is currently signed in to save terms acceptance.");
      set({ error: err.message });
      throw err;
    }

    try {
      set({ loading: true, error: null });

      await updateAcceptedConsents(
        currentUser.uid,
        acceptedTerms,
        acceptedPrivacy,
        termsVersion,
        privacyVersion
      );

      set({
        currentUser: {
          ...currentUser,
          acceptedTerms,
          acceptedPrivacy,
          termsVersion,
          privacyVersion,
        },
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to save terms acceptance.",
      });
      throw error;
    }
  },

  saveHasUploadedResume: async (uploaded: boolean) => {
    const currentUser = useAuthStore.getState().currentUser;

    if (!currentUser) {
      set({ error: "No user is currently signed in to save resume upload status." });
      return;
    }

    try {
      set({ loading: true, error: null });

      await updateHasUploadedResume(currentUser.uid, uploaded);

      set({
        currentUser: {
          ...currentUser,
          hasUploadedResume: uploaded,
        },
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to save resume upload status.",
      });
    }
  },

  saveProductTourCompletion: async (completed: boolean) => {
    const currentUser = useAuthStore.getState().currentUser;
    if (!currentUser) return;

    try {
      set({ loading: true, error: null });
      const { updateHasCompletedProductTour } = await import("../services/firebase/userService");
      await updateHasCompletedProductTour(currentUser.uid, completed);

      set({
        currentUser: {
          ...currentUser,
          hasCompletedProductTour: completed,
        },
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to save product tour status.",
      });
    }
  },

  checkSessionValidity: async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      stopUserRealtimeListener();
      return false;
    }

    try {
      await firebaseUser.reload();
      const appUser = await getUserById(firebaseUser.uid);
      const lifecycle = determineAccountLifecycleState(!!appUser, appUser);
      if (lifecycle === "DELETED_REMOVED") {
        await handleAccountTermination("DELETED_REMOVED");
        return false;
      }
      if (lifecycle === "DISABLED_PAUSED") {
        await handleAccountTermination("DISABLED_PAUSED");
        return false;
      }
      if (lifecycle === "MISSING_PROFILE" || !appUser) {
        const email = firebaseUser.email?.trim().toLowerCase() || "";
        if (email.endsWith("@tip.edu.ph")) {
          const recoveredProfile: AppUser = {
            uid: firebaseUser.uid,
            email: email,
            fullName: firebaseUser.displayName?.trim() || "TIP Student",
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
            await firebaseUser.getIdToken(true);
            const activeProfile = await createProfileTransaction(firebaseUser.uid, recoveredProfile);
            set({ currentUser: activeProfile });
            return true;
          } catch {
            return false;
          }
        }
        return false;
      }
      return true;
    } catch (err: any) {
      const errCode = err?.code || "";
      const errStr = String(err || "");
      if (
        errCode === "auth/user-not-found" ||
        errCode === "auth/user-disabled" ||
        errStr.includes("user-not-found") ||
        errStr.includes("user-disabled")
      ) {
        await handleAccountTermination(errCode === "auth/user-disabled" ? "DISABLED_PAUSED" : "DELETED_REMOVED");
        return false;
      }

      if (
        errCode === "auth/network-request-failed" ||
        errCode === "auth/timeout" ||
        errStr.includes("network-request-failed") ||
        errStr.includes("Network Error")
      ) {
        console.warn("Session validation encountered a transient network error; preserving local session:", errStr);
        return true;
      }

      console.warn("Session validation encountered an unrecoverable auth error; logging out safely:", sanitizeErrorForLogging(err));
      stopUserRealtimeListener();
      try {
        await signOut(auth);
      } catch (signOutErr) {
        console.error("SignOut failed during session invalidation:", sanitizeErrorForLogging(signOutErr));
      }
      set({ currentUser: null });
      return false;
    }
  },
}));
