import { create } from "zustand";

import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
  getAdditionalUserInfo,
  deleteUser,
} from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";
import { auth } from "../config/firebase";

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

interface AuthState {
  currentUser: AppUser | null;
  loading: boolean;
  isGoogleLoading: boolean;
  isInitialized: boolean;
  isRegistering: boolean;
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
  updatePasswordAction: (newPassword: string) => Promise<void>;
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
  checkSessionValidity: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  loading: true,
  isGoogleLoading: false,
  isInitialized: false,
  isRegistering: false,
  error: null,
  registrationSuccess: false,
  emailNotVerified: false,
  passwordResetSuccess: false,

  login: async (email, password) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      set({ loading: true, error: null, emailNotVerified: false });

      const user = await loginUser(normalizedEmail, password);

      set({
        currentUser: user,
        loading: false,
        error: null,
        emailNotVerified: false,
      });
    } catch (error) {
      if (error instanceof EmailNotVerifiedError) {
        set({
          currentUser: null,
          loading: false,
          error: null,
          emailNotVerified: true,
        });
        return;
      }

      set({
        currentUser: null,
        loading: false,
        error: mapAuthError(error),
        emailNotVerified: false,
      });
    }
  },

  register: async (email, password, fullName) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      set({ loading: true, error: null, registrationSuccess: false, isRegistering: true });

      await registerStudent(normalizedEmail, password, fullName);

      set({
        currentUser: null,
        loading: false,
        error: null,
        registrationSuccess: true,
        isRegistering: false,
      });
    } catch (error) {
      set({
        currentUser: null,
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
      const err = new Error("Google Sign-In is not configured: Client ID is missing.");
      set({ error: err.message });
      throw err;
    }

    set({ isGoogleLoading: true, error: null });
    let firebaseSessionCreated = false;

    const clearAuthSessionSafely = async () => {
      try {
        await signOut(auth);
        try {
      // Verify Google Play Services support.
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
          "Only verified TIP email accounts ending in @tip.edu.ph can be used to access AIRIS. Please choose your TIP Google account."
        );
        set({ error: err.message });
        throw err;
      }

      const isNewUser = getAdditionalUserInfo(userCredential)?.isNewUser;
      const existingProfile = await getUserById(firebaseUser.uid);

      if (isNewUser) {
        if (existingProfile) {
          await clearAuthSessionSafely();
          const err = new Error("An account conflict was detected. A profile already exists for this email address. Please contact the AIRIS administrator.");
          set({ error: err.message });
          throw err;
        }

        const newProfile: AppUser = {
          uid: firebaseUser.uid,
          email: emailLower,
          fullName: firebaseUser.displayName?.trim() || "TIP Student",
          role: "student",
          isProfileComplete: false,
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
          await createProfileTransaction(firebaseUser.uid, newProfile);
        } catch (dbErr) {
          await clearAuthSessionSafely();
          throw dbErr;
        }

        set({
          currentUser: newProfile,
          loading: false,
          error: null,
        });
      } else {
        // Prompt if profile is missing.
        if (!existingProfile) {
          await clearAuthSessionSafely();
          const err = new Error("Your AIRIS authentication account exists, but its user profile could not be found. Please contact the AIRIS administrator.");
          set({ error: err.message });
          throw err;
        }

        set({
          currentUser: existingProfile,
          loading: false,
          error: null,
        });
      }
    } catch (error: unknown) {
      const errorCode =
        error && typeof error === "object" && "code" in error
          ? (error as { code: unknown }).code
          : undefined;

      if (errorCode === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      if (errorCode === statusCodes.IN_PROGRESS) {
        return;
      }
      if (errorCode === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        set({
          error: "Google Play Services are not available or outdated on this device.",
        });
        return;
      }

      if (firebaseSessionCreated) {
        await clearAuthSessionSafely();
      }

      const friendlyMsg = mapAuthError(error);
      set({
        error: friendlyMsg,
      });
      throw new Error(friendlyMsg);
    } finally {
      set({ isGoogleLoading: false });
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
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
   * - If no user → stay on login.
   * - If user exists but email not verified → sign out and go to login.
   * - If user exists and verified → load Firestore profile and let the route guard handle navigation.
   */
  initializeAuth: () => {
    set({ loading: true, isInitialized: false });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const state = useAuthStore.getState();
      if (state.isRegistering) {
        return;
      }

      if (!firebaseUser) {
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
        if (!appUser) {
          await signOut(auth);
          set({
            currentUser: null,
            loading: false,
            isInitialized: true,
            error: null,
          });
          return;
        }

        set({
          currentUser: appUser,
          loading: false,
          isInitialized: true,
          error: null,
        });
      } catch (err) {
        console.error("Auth initialization error during session load:", sanitizeErrorForLogging(err));
        try {
          await signOut(auth);
        } catch (signOutErr) {
          console.error("SignOut failed during initialization recovery:", sanitizeErrorForLogging(signOutErr));
        }
        set({
          currentUser: null,
          loading: false,
          isInitialized: true,
          error: null,
        });
      }
    });

    return unsubscribe;
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

  updatePasswordAction: async (newPassword) => {
    try {
      set({ loading: true, error: null });

      await changePassword(newPassword);

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

    if (
      acceptedTerms !== true ||
      acceptedPrivacy !== true ||
      currentUser.activeResumeId === null ||
      currentUser.activeResumeId === undefined
    ) {
      const err = new Error("Onboarding conditions not met. Please accept both consents and upload a valid resume.");
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

  checkSessionValidity: async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return false;

    try {
      await firebaseUser.reload();
      const appUser = await getUserById(firebaseUser.uid);
      if (!appUser) {
        await signOut(auth);
        set({ currentUser: null });
        return false;
      }
      return true;
    } catch (err) {
      console.warn("Session validation encountered an error; logging out safely:", sanitizeErrorForLogging(err));
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
