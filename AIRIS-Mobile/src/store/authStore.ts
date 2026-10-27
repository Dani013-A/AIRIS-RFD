import { isManilaStudentEmail, MANILA_EMAIL_MESSAGE } from "../utils/institutionalEmail";
import { create } from "zustand";
import { Alert } from "react-native";

import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  EmailAuthProvider,
  signInWithCredential,
  getAdditionalUserInfo,
  deleteUser,
  reauthenticateWithCredential,
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
  deleteUserAccountCascade,
} from "../services/firebase/userService";
import { useOnboardingStore } from "./onboardingStore";
import { useAppearanceStore } from "./appearanceStore";
import { clearLearningMemoryCache } from "../services/learning/learningCatalogService";
import { mapAuthError, sanitizeErrorForLogging } from "../utils/errorMapper";
import {
  sendStudentOtp,
  verifyStudentOtp,
  storeStudentOtpSession,
  getStoredStudentOtpSession,
  clearStudentOtpSession,
} from "../services/api/otpService";

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
      useAppearanceStore.getState().resetForNewSession();
    } catch {}
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
  loginWithGoogle: (isSignUpContext?: boolean) => Promise<void>;
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
  deleteAccountAction: (confirmationPhrase?: string, currentPassword?: string) => Promise<void>;
  checkSessionValidity: () => Promise<boolean>;

  // Student OTP Verification
  isOtpRequired: boolean;
  otpMaskedEmail: string | null;
  otpCooldownRemaining: number;
  otpError: string | null;
  isOtpVerifying: boolean;
  pendingOtpUser: AppUser | null;
  isOtpVerified: boolean;
  verifyStudentOtpAction: (code: string) => Promise<boolean>;
  resendStudentOtpAction: () => Promise<boolean>;
  cancelStudentOtpAction: () => Promise<void>;
  clearOtpError: () => void;

  // Unregistered Google flow continuation
  pendingGoogleEmail: string | null;
  clearPendingGoogleEmail: () => void;
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

  // Unregistered Google flow continuation
  pendingGoogleEmail: null,
  clearPendingGoogleEmail: () => set({ pendingGoogleEmail: null }),

  // Student OTP Verification State
  isOtpRequired: false,
  otpMaskedEmail: null,
  otpCooldownRemaining: 0,
  otpError: null,
  isOtpVerifying: false,
  pendingOtpUser: null,
  isOtpVerified: false,

  clearOtpError: () => set({ otpError: null }),

  verifyStudentOtpAction: async (code: string) => {
    const { pendingOtpUser } = useAuthStore.getState();
    if (!pendingOtpUser || !auth.currentUser) {
      set({ otpError: "No pending session. Please log in again." });
      return false;
    }

    set({ isOtpVerifying: true, otpError: null });

    try {
      const idToken = await auth.currentUser.getIdToken();
      const verifyRes = await verifyStudentOtp(idToken, code);

      if (!verifyRes.success || !verifyRes.sessionToken) {
        set({
          isOtpVerifying: false,
          otpError: verifyRes.error || "Verification failed. Please check the code.",
        });
        return false;
      }

      // Persist the 8-hour session token bound to UID
      const expiresAt = Date.now() + 8 * 3600 * 1000;
      await storeStudentOtpSession(pendingOtpUser.uid, verifyRes.sessionToken, expiresAt);

      startUserRealtimeListener(pendingOtpUser.uid);

      set({
        currentUser: pendingOtpUser,
        pendingOtpUser: null,
        isOtpRequired: false,
        isOtpVerified: true,
        isOtpVerifying: false,
        otpError: null,
        authTransactionState: "COMPLETED",
        loading: false,
      });

      return true;
    } catch (err: any) {
      set({
        isOtpVerifying: false,
        otpError: err?.message || "Failed to verify code. Please try again.",
      });
      return false;
    }
  },

  resendStudentOtpAction: async () => {
    if (!auth.currentUser) return false;
    set({ loading: true, otpError: null });
    try {
      const idToken = await auth.currentUser.getIdToken();
      const sendRes = await sendStudentOtp(idToken);
      if (!sendRes.success) {
        set({ loading: false, otpError: sendRes.error });
        return false;
      }
      set({
        loading: false,
        otpCooldownRemaining: sendRes.cooldownSeconds || 60,
        otpMaskedEmail: sendRes.maskedEmail || useAuthStore.getState().otpMaskedEmail,
      });
      return true;
    } catch (err: any) {
      set({ loading: false, otpError: err?.message || "Failed to resend code." });
      return false;
    }
  },

  cancelStudentOtpAction: async () => {
    try {
      await signOut(auth);
      if (GoogleSignin && typeof GoogleSignin.signOut === "function") {
        await GoogleSignin.signOut().catch(() => {});
      }
    } catch {
      // safe cleanup
    }
    set({
      isOtpRequired: false,
      pendingOtpUser: null,
      otpMaskedEmail: null,
      otpError: null,
      authTransactionState: "IDLE",
      loading: false,
    });
  },

  login: async (email, password) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      set({ authTransactionState: "AUTHENTICATING", loading: true, error: null, emailNotVerified: false });

      const user = await loginUser(normalizedEmail, password);

      // Check if this student already has a valid, non-expired OTP session on this device
      const existingOtp = await getStoredStudentOtpSession(user.uid);
      if (existingOtp) {
        startUserRealtimeListener(user.uid);
        set({
          currentUser: user,
          authTransactionState: "COMPLETED",
          loading: false,
          error: null,
          emailNotVerified: false,
          isOtpVerified: true,
          isOtpRequired: false,
        });
        return;
      }

      // No existing OTP session: request email OTP challenge from server
      try {
        const idToken = (await auth.currentUser?.getIdToken()) || "";
        const sendRes = await sendStudentOtp(idToken);
        if (sendRes.success) {
          set({
            currentUser: null,
            pendingOtpUser: user,
            isOtpRequired: true,
            isOtpVerified: false,
            otpMaskedEmail: sendRes.maskedEmail || user.email,
            otpCooldownRemaining: sendRes.cooldownSeconds || 60,
            otpError: null,
            authTransactionState: "OTP_CHALLENGE",
            loading: false,
            error: null,
            emailNotVerified: false,
          });
          return;
        } else {
          set({
            currentUser: null,
            pendingOtpUser: user,
            isOtpRequired: true,
            isOtpVerified: false,
            otpMaskedEmail: user.email,
            otpCooldownRemaining: sendRes.cooldownRemaining || 0,
            otpError: sendRes.error || "Failed to dispatch verification code. Please tap Resend Code to try again.",
            authTransactionState: "OTP_CHALLENGE",
            loading: false,
            error: null,
            emailNotVerified: false,
          });
          return;
        }
      } catch (otpSendErr: any) {
        set({
          currentUser: null,
          pendingOtpUser: user,
          isOtpRequired: true,
          isOtpVerified: false,
          otpMaskedEmail: user.email,
          otpCooldownRemaining: 0,
          otpError: otpSendErr?.message || "Failed to send verification email. Please tap Resend Code to try again.",
          authTransactionState: "OTP_CHALLENGE",
          loading: false,
          error: null,
          emailNotVerified: false,
        });
        return;
      }
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

  loginWithGoogle: async (isSignUpContext = false) => {
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

      const isNewUser = !!getAdditionalUserInfo(userCredential)?.isNewUser;
      const isUnprovisionedNewUser = isNewUser && (firebaseUser.providerData?.length || 0) <= 1;
      const emailLower = firebaseUser.email.trim().toLowerCase();

      // Validate school domain email.
      if (!firebaseUser.emailVerified || !emailLower.endsWith("@tip.edu.ph") || (isSignUpContext && !isManilaStudentEmail(emailLower))) {
        if (isUnprovisionedNewUser) {
          try {
            await deleteUser(firebaseUser);
          } catch (deleteErr) {
            console.warn("Failed to delete newly created invalid Firebase Auth user:", sanitizeErrorForLogging(deleteErr));
          }
        }
        await clearAuthSessionSafely();
        const err = new Error(
          MANILA_EMAIL_MESSAGE
        );
        set({ error: err.message, authTransactionState: "FAILED" });
        throw err;
      }

      // Synchronize auth state: force ID token generation to ensure Firestore internal auth credentials provider has the token.
      set({ authTransactionState: "INITIALIZING_PROFILE" });
      if (typeof firebaseUser.getIdToken === "function") {
        await firebaseUser.getIdToken(true);
      }

      const handleSuccessfulGoogleProfile = async (targetProfile: AppUser) => {
        if (targetProfile.role === "student") {
          if (!isManilaStudentEmail(firebaseUser.email)) {
            await clearAuthSessionSafely();
            throw new Error(MANILA_EMAIL_MESSAGE);
          }
          // Check if this student already has a valid, non-expired OTP session on this device
          const existingOtp = await getStoredStudentOtpSession(firebaseUser.uid);
          if (existingOtp) {
            startUserRealtimeListener(firebaseUser.uid);
            set({
              currentUser: targetProfile,
              authTransactionState: "COMPLETED",
              loading: false,
              isGoogleLoading: false,
              isRegistering: false,
              error: null,
              isOtpVerified: true,
              isOtpRequired: false,
            });
            return;
          }

          // No existing OTP session: request email OTP challenge from server
          try {
            const idToken = (await firebaseUser.getIdToken()) || "";
            const sendRes = await sendStudentOtp(idToken);
            if (sendRes.success) {
              set({
                currentUser: null,
                pendingOtpUser: targetProfile,
                isOtpRequired: true,
                isOtpVerified: false,
                otpMaskedEmail: sendRes.maskedEmail || targetProfile.email,
                otpCooldownRemaining: sendRes.cooldownSeconds || 60,
                otpError: null,
                authTransactionState: "OTP_CHALLENGE",
                loading: false,
                isGoogleLoading: false,
                isRegistering: false,
                error: null,
              });
              return;
            } else {
              set({
                currentUser: null,
                pendingOtpUser: targetProfile,
                isOtpRequired: true,
                isOtpVerified: false,
                otpMaskedEmail: targetProfile.email,
                otpCooldownRemaining: sendRes.cooldownRemaining || 0,
                otpError: sendRes.error || "Failed to dispatch verification code. Please tap Resend Code to try again.",
                authTransactionState: "OTP_CHALLENGE",
                loading: false,
                isGoogleLoading: false,
                isRegistering: false,
                error: null,
              });
              return;
            }
          } catch (otpSendErr: any) {
            set({
              currentUser: null,
              pendingOtpUser: targetProfile,
              isOtpRequired: true,
              isOtpVerified: false,
              otpMaskedEmail: targetProfile.email,
              otpCooldownRemaining: 0,
              otpError: otpSendErr?.message || "Failed to send verification email. Please tap Resend Code to try again.",
              authTransactionState: "OTP_CHALLENGE",
              loading: false,
              isGoogleLoading: false,
              isRegistering: false,
              error: null,
            });
            return;
          }
        }

        // Non-student profile fallback
        startUserRealtimeListener(firebaseUser.uid);
        set({
          currentUser: targetProfile,
          authTransactionState: "COMPLETED",
          loading: false,
          isGoogleLoading: false,
          isRegistering: false,
          error: null,
        });
      };

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
        await handleSuccessfulGoogleProfile(existingProfile);
        return;
      }

      // Enforce: Login must never register. If user has no existing profile and is in login context, reject.
      if (!isSignUpContext) {
        if (isUnprovisionedNewUser) {
          try {
            await deleteUser(firebaseUser);
          } catch (delErr) {
            console.warn("Cleaned up un-registered Google user during login:", sanitizeErrorForLogging(delErr));
          }
        }
        await clearAuthSessionSafely();
        const notFoundErr = new Error(
          "No AIRIS account found. Please sign up to continue."
        );
        set({
          error: notFoundErr.message,
          authTransactionState: "FAILED",
          isRegistering: false,
          pendingGoogleEmail: emailLower,
        });
        throw notFoundErr;
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

      await handleSuccessfulGoogleProfile(activeProfile);
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
        if (GoogleSignin && typeof GoogleSignin.signOut === "function") {
          await GoogleSignin.signOut();
        }
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
        useAppearanceStore.getState().resetForNewSession();
      } catch {}
      try {
        clearLearningMemoryCache();
      } catch (learningCacheErr) {
        console.warn("Failed to clear learning cache on logout:", learningCacheErr);
      }
      try {
        await clearStudentOtpSession();
      } catch (otpErr) {
        console.warn("Failed to clear student OTP session:", otpErr);
      }
      set({
        currentUser: null,
        loading: false,
        isGoogleLoading: false,
        authTransactionState: "IDLE",
        error: null,
        registrationSuccess: false,
        emailNotVerified: false,
        isOtpRequired: false,
        isOtpVerified: false,
        otpMaskedEmail: null,
        otpError: null,
        pendingOtpUser: null,
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
        state.authTransactionState === "OTP_CHALLENGE" ||
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
          if (isManilaStudentEmail(email)) {
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

              // Verify device OTP session for recovered student profile
              if (activeProfile.role === "student") {
                const storedOtp = await getStoredStudentOtpSession(firebaseUser.uid);
                if (!storedOtp) {
                  stopUserRealtimeListener();
                  await signOut(auth);
                  try {
                    if (GoogleSignin && typeof GoogleSignin.signOut === "function") {
                      await GoogleSignin.signOut().catch(() => {});
                    }
                  } catch {}
                  set({
                    currentUser: null,
                    loading: false,
                    isInitialized: true,
                    error: null,
                    isOtpVerified: false,
                  });
                  return;
                }
              }

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

        // Check stored OTP session validity for active student user
        if (appUser?.role === "student") {
          if (!isManilaStudentEmail(firebaseUser.email)) {
            stopUserRealtimeListener();
            await signOut(auth);
            set({currentUser:null, loading:false, isInitialized:true, error:MANILA_EMAIL_MESSAGE});
            return;
          }
          const storedOtp = await getStoredStudentOtpSession(firebaseUser.uid);
          if (!storedOtp) {
            // No valid verified OTP session on this device for this student
            stopUserRealtimeListener();
            await signOut(auth);
            try {
              if (GoogleSignin && typeof GoogleSignin.signOut === "function") {
                await GoogleSignin.signOut().catch(() => {});
              }
            } catch {}
            set({
              currentUser: null,
              loading: false,
              isInitialized: true,
              error: null,
              isOtpVerified: false,
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
          isOtpVerified: true,
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
        try {
          const { notifyProfilePhotoChanged } = await import("../components/ui/UserAvatar");
          notifyProfilePhotoChanged();
        } catch {}
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

  deleteAccountAction: async (confirmationPhrase, currentPassword) => {
    // 1. Strict validation of confirmation phrase (exact case: 'CONFIRM DELETION', trimmed)
    if (!confirmationPhrase || typeof confirmationPhrase !== "string" || confirmationPhrase.trim() !== "CONFIRM DELETION") {
      throw new Error("Confirmation phrase mismatch. You must enter 'CONFIRM DELETION' to proceed.");
    }

    const currentUser = useAuthStore.getState().currentUser;
    const activeUid = currentUser?.uid || auth.currentUser?.uid;

    if (!auth.currentUser || !activeUid) {
      throw new Error("No authenticated user session found.");
    }

    try {
      set({ loading: true, error: null });
      console.log(`[AUTH][ACCOUNT_DELETE][CONFIRM] User confirmed account deletion request with 'CONFIRM DELETION' for UID: ${activeUid}`);

      // Provider-aware reauthentication FIRST
      const isGoogleUser = auth.currentUser?.providerData.some(
        (p) => p.providerId === "google.com"
      );

      if (auth.currentUser && isGoogleUser) {
        console.log(`[AUTH][ACCOUNT_DELETE][REAUTH_START] Attempting Google credential reauthentication...`);
        if (GoogleSignin) {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          const userInfo = await GoogleSignin.signIn();
          if (userInfo.type !== "success" || !userInfo.data?.idToken) {
            set({ loading: false });
            throw new Error("Google reauthentication was cancelled.");
          }
          const cred = GoogleAuthProvider.credential(userInfo.data.idToken);
          await reauthenticateWithCredential(auth.currentUser, cred);
          console.log(`[AUTH][ACCOUNT_DELETE][REAUTH_SUCCESS] Google credential reauthentication succeeded.`);
        } else {
          throw new Error("Google Sign-In is not supported in this environment.");
        }
      } else if (auth.currentUser && auth.currentUser.email) {
        if (currentPassword && currentPassword.trim()) {
          console.log(`[AUTH][ACCOUNT_DELETE][REAUTH_START] Attempting password credential reauthentication...`);
          const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword.trim());
          await reauthenticateWithCredential(auth.currentUser, cred);
          console.log(`[AUTH][ACCOUNT_DELETE][REAUTH_SUCCESS] Password credential reauthentication succeeded.`);
        } else {
          // Check if session satisfies recent-login requirement before cascade
          let isRecent = false;
          try {
            if (typeof auth.currentUser.getIdTokenResult === "function") {
              const tokenResult = await auth.currentUser.getIdTokenResult();
              const authTimestamp = tokenResult?.authTime ? new Date(tokenResult.authTime).getTime() : 0;
              if (authTimestamp && Date.now() - authTimestamp < 5 * 60 * 1000) {
                isRecent = true;
              }
            }
          } catch {
            // fallback
          }
          if (!isRecent) {
            const reauthErr: any = new Error("Please verify your password to confirm account deletion.");
            reauthErr.code = "auth/requires-recent-login";
            throw reauthErr;
          }
        }
      }

      if (activeUid) {
        await deleteUserAccountCascade(activeUid);
      }

      if (auth.currentUser && auth.currentUser.uid !== activeUid) {
        set({ loading: false });
        return;
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
          hasCompletedOnboarding: true,
          isProfileComplete: true,
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

    // Idempotent guard: avoid duplicate writes if already persisted with matching versions
    if (
      currentUser.acceptedTerms === acceptedTerms &&
      currentUser.acceptedPrivacy === acceptedPrivacy &&
      currentUser.termsVersion === termsVersion &&
      currentUser.privacyVersion === privacyVersion
    ) {
      return;
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
        if (isManilaStudentEmail(email)) {
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
      if (appUser.role === "student" && !isManilaStudentEmail(firebaseUser.email)) {
        await signOut(auth);
        stopUserRealtimeListener();
        set({currentUser:null, error:MANILA_EMAIL_MESSAGE});
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
